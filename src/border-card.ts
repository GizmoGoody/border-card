import { LitElement, html, nothing, svg } from "lit";
import { property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import "./border-card-editor";
import { CARD_TYPE, CARD_VERSION, DEFAULT_BORDER, DEFAULT_PROGRESS, DOCS_URL, EDITOR_TYPE } from "./const";
import { SIDE_ANGLES, dash, outlinePath, sidePath } from "./progress-path";
import { cardStyles, registerProgressProperties } from "./styles";
import type {
  BorderCardConfig,
  CardHelpers,
  HomeAssistant,
  LovelaceCard,
  LovelaceCardConfig,
  LovelaceGridOptions,
  ResolvedConfig,
} from "./types";
import {
  computePercent,
  dimColor,
  formatText,
  referencedEntities,
  resolveColor,
  resolveConfig,
  resolveNumber,
  toCssColor,
} from "./utils";

registerProgressProperties();

/** Effects drawn by an extra layer that moves around the border. */
const MOVING_LAYERS: Record<string, string> = { shimmer: "shine", comet: "comet", chase: "chase" };

/** HA's card helpers, loaded once. They create the wrapped card the same way HA's conditional card does. */
let cardHelpers: CardHelpers | undefined;
const cardHelpersReady = window.loadCardHelpers?.().then((helpers) => (cardHelpers = helpers));

export class BorderCard extends LitElement {
  static styles = cardStyles;

  /** Set by HA when the card is shown in the editor preview. */
  @property({ type: Boolean }) preview = false;

  /** Set by HA to "grid" in sections views; passed on to the wrapped card. */
  @property({ attribute: false }) layout?: string;

  @state() private _config?: ResolvedConfig;

  private _hass?: HomeAssistant;

  /** The wrapped card, created by HA's card helpers (which also handle loading and errors). */
  private _card?: LovelaceCard;

  private _cardConfig?: LovelaceCardConfig;

  private _cardKey?: string;

  private _entities: string[] = [];

  /** The card's size and corner radius, which the straight and rounded progress strokes are drawn to. */
  @state() private _box?: { width: number; height: number; radius: number };

  @query(".container") private _container?: HTMLElement;

  private _resizeObserver?: ResizeObserver;

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
    this._entities = referencedEntities(this._config);

    // Only hand the wrapped card a new config when it actually changed, so it is not rebuilt needlessly.
    const key = JSON.stringify(config.card);
    if (key !== this._cardKey) {
      this._cardKey = key;
      this._cardConfig = config.card;
      this._createCard();
    }
  }

  set hass(hass: HomeAssistant) {
    const previous = this._hass;
    this._hass = hass;
    if (this._card) this._card.hass = hass;

    // HA replaces a state object only when it changes, so an identity check is enough.
    if (!previous || this._entities.some((id) => previous.states[id] !== hass.states[id])) {
      this.requestUpdate();
    }
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  getCardSize(): number | Promise<number> {
    return this._card?.getCardSize?.() ?? 1;
  }

  /** The wrapped card's sizing, so the Layout tab and sections treat this card like the card inside it. */
  getGridOptions(): LovelaceGridOptions {
    const own = this._card?.getGridOptions?.() ?? {};
    const configured = (this._cardConfig?.grid_options as LovelaceGridOptions | undefined) ?? {};
    return { ...own, ...configured };
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this._observeSize();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
  }

  protected firstUpdated(): void {
    this._observeSize();
  }

  private _observeSize(): void {
    this._resizeObserver ??= new ResizeObserver(() => this._measure());
    if (this._container) this._resizeObserver.observe(this._container);
  }

  private _measure(): void {
    const el = this._container;
    if (!el) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const box = this._box;
    if (!box || box.width !== width || box.height !== height || box.radius !== radius) {
      this._box = { width, height, radius };
    }
  }

  protected updated(): void {
    if (this._card) {
      this._card.preview = this.preview;
      if (this.layout) this._card.layout = this.layout;
    }
  }

  private _createCard(): void {
    const config = this._cardConfig;
    if (!config) return;
    if (!cardHelpers) {
      // Rare: the helpers are not loaded yet. Ask HA to rebuild this card once they are, so its size is read again.
      cardHelpersReady?.then(() => {
        this._createCard();
        this.dispatchEvent(new Event("ll-rebuild", { bubbles: true, composed: true }));
      });
      return;
    }
    const card = cardHelpers.createCardElement(config);
    // A custom card that loads later asks to be rebuilt; HA's own containers handle it the same way.
    card.addEventListener("ll-rebuild", (ev) => {
      ev.stopPropagation();
      this._createCard();
    });
    if (this._hass) card.hass = this._hass;
    card.preview = this.preview;
    if (this.layout) card.layout = this.layout;
    this._card = card;
    this.requestUpdate();
  }

  /** The border color, from a fixed value or an entity, falling back to the default when it is not a color. */
  private _borderColor(): string {
    return resolveColor(this._config!.border.color, this._hass) ?? toCssColor(DEFAULT_BORDER.color)!;
  }

  protected render() {
    if (!this._config) return nothing;
    const { border, progress } = this._config;

    const thickness = Math.max(0, resolveNumber(border.thickness, this._hass, 0));
    const color = this._borderColor();
    const effect = border.effect ?? (border.glow ? "glow" : "none");
    const visible = thickness > 0;

    // With progress on, the ring draws the whole border (fill and track), so the base stays empty.
    const base = progress.enabled ? "transparent" : color;

    return html`
      <div
        class=${classMap({
          container: true,
          "no-border": !visible,
          [`effect-${effect}`]: visible,
        })}
        style=${styleMap({
          "--bc-color": color,
          "--bc-thickness": `${thickness}px`,
          "--bc-base": base,
        })}
      >
        ${visible ? html`<div class="band frame"></div>` : nothing}
        <div class="inner">${this._card}</div>
        ${progress.enabled ? this._renderProgress(thickness) : nothing}
        ${visible && effect in MOVING_LAYERS ? html`<div class="band ${MOVING_LAYERS[effect]}"></div>` : nothing}
      </div>
    `;
  }

  private _trackColor(): string {
    const { progress } = this._config!;
    if (progress.track === "match") return dimColor(this._borderColor());
    if (progress.track === "custom") {
      return dimColor(resolveColor(progress.track_color, this._hass) ?? this._borderColor());
    }
    return "transparent";
  }

  private _renderProgress(thickness: number) {
    const { progress } = this._config!;
    const hass = this._hass;
    const num = (value: number | string, fallback: number) => resolveNumber(value, hass, fallback);

    const stateObj = progress.entity ? hass?.states[progress.entity] : undefined;
    const raw = progress.attribute ? stateObj?.attributes[progress.attribute] : stateObj?.state;
    const min = num(progress.min_value, DEFAULT_PROGRESS.min_value as number);
    const max = num(progress.max_value, DEFAULT_PROGRESS.max_value as number);
    const percent = stateObj ? computePercent(raw, min, max) : 0;

    const { text } = progress;
    return html`
      ${thickness > 0 ? this._renderRing(thickness, percent, num) : nothing}
      ${
        text.enabled
          ? html`<div
              class="text ${text.position}"
              style=${styleMap({ "--bc-text-color": resolveColor(text.color, hass) })}
            >
              ${formatText(text.template, percent, stateObj)}
            </div>`
          : nothing
      }
    `;
  }

  /**
   * The fill and the track. Clockwise grows from the start, counterclockwise from the end.
   * Spoke ends use a gradient around the center; straight and rounded ends use a stroke along the border.
   */
  private _renderRing(thickness: number, percent: number, num: (v: number | string, f: number) => number) {
    const { progress } = this._config!;
    const ccw = progress.direction === "counterclockwise";
    const side = progress.path !== "full" && progress.path !== "custom" ? progress.path : undefined;
    const startAngle =
      progress.path === "custom"
        ? num(progress.start, DEFAULT_PROGRESS.start as number)
        : SIDE_ANGLES[progress.start_at] ?? 0;
    const endAngle = progress.path === "custom" ? num(progress.end, DEFAULT_PROGRESS.end as number) : startAngle + 360;

    if (progress.ends === "spoke" && !side) {
      const total = endAngle - startAngle;
      return html`<div
        class=${classMap({ band: true, ring: true, spoke: true, ccw })}
        style=${styleMap({
          "--bc-start": `${startAngle}deg`,
          "--bc-total": `${total}deg`,
          "--bc-track": this._trackColor(),
          "--border-card-fill": `${(percent / 100) * total}deg`,
        })}
      ></div>`;
    }

    const box = this._box;
    if (!box || !box.width || !box.height) return nothing;
    const rounded = progress.ends === "round";
    const path = side
      ? sidePath(side, box.width, box.height, thickness, rounded)
      : outlinePath(box.width, box.height, thickness, box.radius);

    let from = 0;
    let range = path.length;
    if (!side) {
      from = path.lengthAtAngle(startAngle);
      if (progress.path === "custom") {
        range = path.lengthAtAngle(endAngle) - from;
        if (range <= 0) range += path.length;
      }
    }
    const filled = (percent / 100) * range;
    const fillFrom = ccw ? from + range - filled : from;
    const stroke = {
      "stroke-width": `${thickness}px`,
      "stroke-linecap": rounded ? "round" : "butt",
    };

    return html`<svg class="ring" viewBox="0 0 ${box.width} ${box.height}" aria-hidden="true">
      <path
        d=${path.d}
        style=${styleMap({ ...stroke, ...dash(from, range, path.length), stroke: this._trackColor() })}
      ></path>
      ${
        filled > 0.5
          ? svg`<path
              d=${path.d}
              style=${styleMap({ ...stroke, ...dash(fillFrom, filled, path.length), stroke: "var(--bc-color)" })}
            ></path>`
          : nothing
      }
    </svg>`;
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
