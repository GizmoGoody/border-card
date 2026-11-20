import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import "./border-card-editor";
import { CARD_TYPE, CARD_VERSION, DOCS_URL, EDITOR_TYPE } from "./const";
import { cardStyles, registerProgressProperties } from "./styles";
import type { BorderCardConfig, HomeAssistant, HuiCard, LovelaceGridOptions, ResolvedConfig } from "./types";
import { computeCssColor, computePercent, dimColor, formatText, resolveConfig } from "./utils";

registerProgressProperties();

export class BorderCard extends LitElement {
  static styles = cardStyles;

  /** Set by HA when the card is shown in the editor preview. */
  @property({ type: Boolean }) preview = false;

  @state() private _config?: ResolvedConfig;

  private _hass?: HomeAssistant;

  /** HA's own card container; it creates, lazy-loads and error-handles the wrapped card. */
  private _card?: HuiCard;

  private _cardKey?: string;

  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TYPE);
  }

  static getStubConfig(): Partial<BorderCardConfig> {
    return {
      card: { type: "markdown", content: "Your wrapped card content will appear here" },
    };
  }

  setConfig(config: BorderCardConfig): void {
    if (!config) throw new Error("Invalid configuration");
    if (!config.card) throw new Error("Card configuration is required");

    this._config = resolveConfig(config);

    // Only hand the wrapped card a new config when it actually changed, so it is not rebuilt needlessly.
    const key = JSON.stringify(config.card);
    if (key !== this._cardKey) {
      this._cardKey = key;
      this._card ??= this._createCard();
      this._card.config = config.card;
    }
  }

  set hass(hass: HomeAssistant) {
    const previous = this._hass;
    this._hass = hass;
    if (this._card) this._card.hass = hass;

    // HA replaces a state object only when it changes, so an identity check is enough.
    const entity = this._config?.progress.enabled ? this._config.progress.entity : undefined;
    if (!previous || (entity && previous.states[entity] !== hass.states[entity])) {
      this.requestUpdate();
    }
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  getCardSize(): number | Promise<number> {
    return this._card?.getCardSize?.() ?? 1;
  }

  getGridOptions(): LovelaceGridOptions {
    return this._card?.getGridOptions?.() ?? {};
  }

  protected updated(): void {
    if (this._card) this._card.preview = this.preview;
  }

  private _createCard(): HuiCard {
    const card = document.createElement("hui-card");
    if (this._hass) card.hass = this._hass;
    card.preview = this.preview;
    return card;
  }

  protected render() {
    if (!this._config) return nothing;
    const { border, progress } = this._config;

    const thickness = Number(border.thickness) || 0;
    const color = computeCssColor(border.color);

    // With progress on, the ring draws the whole border (fill and track), so the base stays empty.
    const base = progress.enabled ? "transparent" : color;

    return html`
      <div
        class=${classMap({
          container: true,
          glow: border.glow && thickness > 0,
          "no-border": thickness === 0,
        })}
        style=${styleMap({
          "--bc-color": color,
          "--bc-thickness": `${thickness}px`,
          "--bc-base": base,
        })}
      >
        <div class="inner">${this._card}</div>
        ${progress.enabled ? this._renderProgress(thickness) : nothing}
      </div>
    `;
  }

  private _trackColor(): string {
    const { border, progress } = this._config!;
    if (progress.track === "match") return dimColor(computeCssColor(border.color));
    if (progress.track === "custom") return dimColor(computeCssColor(progress.track_color ?? border.color));
    return "transparent";
  }

  private _renderProgress(thickness: number) {
    const progress = this._config!.progress;
    const stateObj = progress.entity ? this._hass?.states[progress.entity] : undefined;
    const percent = computePercent(progress, stateObj);

    // The fill and the track stay inside start..end. Clockwise grows from the start, counterclockwise from the end.
    const total = progress.end - progress.start;
    const fill = (percent / 100) * total;

    const { text } = progress;
    return html`
      ${
        thickness > 0
          ? html`<div
              class=${classMap({ ring: true, ccw: progress.direction === "counterclockwise" })}
              style=${styleMap({
                "--bc-start": `${progress.start}deg`,
                "--bc-total": `${total}deg`,
                "--bc-track": this._trackColor(),
                "--border-card-fill": `${fill}deg`,
              })}
            ></div>`
          : nothing
      }
      ${
        text.enabled
          ? html`<div
              class="text ${text.position}"
              style=${styleMap({ "--bc-text-color": text.color ? computeCssColor(text.color) : undefined })}
            >
              ${formatText(text.template, percent, stateObj)}
            </div>`
          : nothing
      }
    `;
  }
}

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, BorderCard);
  window.customCards = window.customCards ?? [];
  window.customCards.push({
    type: CARD_TYPE,
    name: "Border Card",
    description: "Wraps any card in a configurable border with an optional progress ring.",
    documentationURL: DOCS_URL,
  });
  console.info(
    `%c BORDER-CARD %c ${CARD_VERSION} `,
    "color: orange; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray",
  );
}
