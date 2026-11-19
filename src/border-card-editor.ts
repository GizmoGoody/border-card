import { mdiCodeBraces, mdiListBoxOutline, mdiSwapHorizontal } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { property, query, state } from "lit/decorators.js";
import { EDITOR_TYPE } from "./const";
import type { BorderCardConfig, HomeAssistant, LovelaceCardConfig } from "./types";
import { isEntityId } from "./utils";

interface SchemaItem {
  name: string;
  type?: "expandable" | "grid";
  title?: string;
  label?: string;
  helper?: string;
  flatten?: boolean;
  expanded?: boolean;
  selector?: Record<string, unknown>;
  schema?: readonly SchemaItem[];
}

type FormData = Record<string, unknown>;

interface CardElementEditor extends HTMLElement {
  toggleMode(): void;
}

/** Entities that can drive a number option or a color option. */
const NUMBER_DOMAINS = ["input_number", "number", "sensor"];
const COLOR_DOMAINS = ["input_text", "text", "input_select", "sensor"];
const ENTITY_SUFFIX = "_entity";

/** Options that take either a value or an entity, by their path in the form data. */
const BINDABLE_PATHS = [
  ["color"],
  ["thickness"],
  ["progress", "start"],
  ["progress", "end"],
  ["progress", "min_value"],
  ["progress", "max_value"],
  ["progress", "track_color"],
  ["progress", "text", "color"],
];
const BORDER_KEYS = ["color", "thickness", "glow"];

const POSITIONS = [
  ["top-left", "Top left"],
  ["top-center", "Top center"],
  ["top-right", "Top right"],
  ["center-left", "Center left"],
  ["center", "Center"],
  ["center-right", "Center right"],
  ["bottom-left", "Bottom left"],
  ["bottom-center", "Bottom center"],
  ["bottom-right", "Bottom right"],
].map(([value, label]) => ({ value, label }));

/** A value field with an entity picker beside it; a chosen entity replaces the value. */
function withEntity(field: SchemaItem, domains: string[]): SchemaItem {
  return {
    type: "grid",
    name: "",
    schema: [
      field,
      {
        name: `${field.name}${ENTITY_SUFFIX}`,
        label: "",
        selector: { entity: { filter: { domain: domains } } },
      },
    ],
  };
}

const number = (name: string, label: string, options: Record<string, unknown>, helper?: string) =>
  withEntity({ name, label, helper, selector: { number: options } }, NUMBER_DOMAINS);

const color = (name: string, label: string, helper?: string) =>
  withEntity({ name, label, helper, selector: { ui_color: {} } }, COLOR_DOMAINS);

function buildSchema(customTrack: boolean): SchemaItem[] {
  return [
    {
      type: "expandable",
      name: "",
      flatten: true,
      expanded: true,
      title: "Border card",
      schema: [
        color("color", "Border color"),
        number(
          "thickness",
          "Thickness",
          { min: 0, max: 50, step: 1, unit_of_measurement: "px" },
          "Set to 0 to disable the border",
        ),
        { name: "glow", label: "Glow effect", selector: { boolean: {} } },
        {
          type: "expandable",
          name: "progress",
          title: "Progress",
          schema: [
            { name: "enabled", label: "Enabled", selector: { boolean: {} } },
            { name: "entity", label: "Entity", selector: { entity: {} } },
            {
              name: "attribute",
              label: "Attribute",
              helper: "Optional: use an entity attribute instead of the state",
              selector: { text: {} },
            },
            number("start", "Start angle", { min: 0, max: 359, step: 1, unit_of_measurement: "°" }),
            number("end", "End angle", { min: 1, max: 360, step: 1, unit_of_measurement: "°" }),
            number("min_value", "Minimum value", { step: 0.1, mode: "box" }),
            number("max_value", "Maximum value", { step: 0.1, mode: "box" }),
            {
              name: "direction",
              label: "Direction",
              selector: {
                select: {
                  mode: "dropdown",
                  options: [
                    { value: "clockwise", label: "Clockwise" },
                    { value: "counterclockwise", label: "Counterclockwise" },
                  ],
                },
              },
            },
            {
              name: "track",
              label: "Track",
              helper: "The unfilled part of the range",
              selector: {
                select: {
                  mode: "dropdown",
                  options: [
                    { value: "none", label: "None" },
                    { value: "match", label: "Match" },
                    { value: "custom", label: "Custom" },
                  ],
                },
              },
            },
            ...(customTrack ? [color("track_color", "Track color")] : []),
            {
              type: "expandable",
              name: "text",
              title: "Text",
              schema: [
                { name: "enabled", label: "Show text", selector: { boolean: {} } },
                {
                  name: "position",
                  label: "Position",
                  selector: { select: { options: POSITIONS, mode: "dropdown" } },
                },
                {
                  name: "template",
                  label: "Template",
                  helper:
                    "Use {value} for the progress value, {state} for the entity state, or {attribute_name}",
                  selector: { text: {} },
                },
                color("color", "Text color", "Leave empty to use the theme text color"),
              ],
            },
          ],
        },
      ],
    },
  ];
}

const SCHEMA = buildSchema(false);
const SCHEMA_CUSTOM_TRACK = buildSchema(true);

/** Returns the object that holds the last key of a path, creating it when asked. */
function parentOf(data: FormData, path: string[], create: boolean): FormData | undefined {
  let node: FormData | undefined = data;
  for (const key of path.slice(0, -1)) {
    if (!node) return undefined;
    if (create && typeof node[key] !== "object") node[key] = {};
    node = node[key] as FormData | undefined;
  }
  return node;
}

/** Config to form data: border options move to the top level, and entity IDs move to their "_entity" field. */
function toFormData(config: BorderCardConfig): FormData {
  const { border, ...rest } = structuredClone(config);
  const data: FormData = { ...rest, ...border };
  for (const path of BINDABLE_PATHS) {
    const parent = parentOf(data, path, false);
    const key = path[path.length - 1];
    if (parent && isEntityId(parent[key])) {
      parent[`${key}${ENTITY_SUFFIX}`] = parent[key];
      delete parent[key];
    }
  }
  return data;
}

/** Form data to config: the inverse of toFormData. A chosen entity replaces the value. */
function fromFormData(data: FormData): BorderCardConfig {
  const result = structuredClone(data);
  for (const path of BINDABLE_PATHS) {
    const parent = parentOf(result, path, false);
    if (!parent) continue;
    const key = path[path.length - 1];
    const entity = parent[`${key}${ENTITY_SUFFIX}`];
    delete parent[`${key}${ENTITY_SUFFIX}`];
    if (entity) parent[key] = entity;
  }
  const border: FormData = {};
  for (const key of BORDER_KEYS) {
    if (result[key] !== undefined) border[key] = result[key];
    delete result[key];
  }
  if (Object.keys(border).length) result.border = border;
  return result as unknown as BorderCardConfig;
}

/**
 * HA's card picker and tab elements load with its own stack card editor.
 * Loading that editor, the way HA does when it is opened, makes them available here.
 */
async function loadHaEditorElements(): Promise<void> {
  if (customElements.get("hui-card-picker") && customElements.get("ha-tab-group")) return;
  const helpers = await window.loadCardHelpers?.();
  const stack = helpers?.createCardElement({ type: "vertical-stack", cards: [] });
  const stackClass = stack?.constructor as { getConfigElement?: () => Promise<unknown> } | undefined;
  await stackClass?.getConfigElement?.();
}

export class BorderCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @property({ attribute: false }) lovelace?: unknown;

  @state() private _config?: BorderCardConfig;

  @state() private _guiMode = true;

  @state() private _guiModeAvailable = true;

  @state() private _picking = false;

  @query("hui-card-element-editor") private _cardEditor?: CardElementEditor;

  static styles = css`
    .card {
      margin-top: 24px;
    }
    .toolbar {
      display: flex;
      align-items: center;
    }
    ha-tab-group {
      flex: 1;
    }
    .options {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .editor {
      padding-top: 8px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    loadHaEditorElements().then(() => this.requestUpdate());
  }

  setConfig(config: BorderCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    const data = toFormData(this._config);
    const progress = data.progress as FormData | undefined;
    const schema = progress?.track === "custom" ? SCHEMA_CUSTOM_TRACK : SCHEMA;
    const picking = this._picking || !this._config.card;

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${data}
        .schema=${schema}
        .computeLabel=${(s: SchemaItem) => s.label ?? s.title ?? s.name}
        .computeHelper=${(s: SchemaItem) => s.helper}
        @value-changed=${this._formChanged}
      ></ha-form>
      <div class="card">
        <div class="toolbar">
          <ha-tab-group>
            <ha-tab-group-tab slot="nav" active>Card</ha-tab-group-tab>
          </ha-tab-group>
        </div>
        <div class="editor">
          <div class="options">
            <ha-icon-button
              .path=${this._guiMode ? mdiCodeBraces : mdiListBoxOutline}
              .label=${this._guiMode ? "Show code editor" : "Show visual editor"}
              .disabled=${picking || !this._guiModeAvailable}
              @click=${this._toggleMode}
            ></ha-icon-button>
            <ha-icon-button
              .path=${mdiSwapHorizontal}
              .label=${"Change card type"}
              .disabled=${!this._config.card}
              @click=${this._togglePicker}
            ></ha-icon-button>
          </div>
          ${
            picking
              ? html`<hui-card-picker
                  .hass=${this.hass}
                  .lovelace=${this.lovelace}
                  @config-changed=${this._cardPicked}
                ></hui-card-picker>`
              : html`<hui-card-element-editor
                  .hass=${this.hass}
                  .lovelace=${this.lovelace}
                  .value=${this._config.card}
                  @config-changed=${this._cardChanged}
                  @GUImode-changed=${this._guiModeChanged}
                ></hui-card-element-editor>`
          }
        </div>
      </div>
    `;
  }

  private _formChanged(ev: CustomEvent<{ value: FormData }>): void {
    ev.stopPropagation();
    this._fireConfig({ ...fromFormData(ev.detail.value), card: this._config!.card });
  }

  private _cardChanged(ev: CustomEvent<{ config: LovelaceCardConfig; guiModeAvailable?: boolean }>): void {
    ev.stopPropagation();
    this._guiModeAvailable = ev.detail.guiModeAvailable ?? true;
    this._fireConfig({ ...this._config!, card: ev.detail.config });
  }

  private _cardPicked(ev: CustomEvent<{ config: LovelaceCardConfig }>): void {
    ev.stopPropagation();
    this._picking = false;
    this._guiMode = true;
    this._fireConfig({ ...this._config!, card: ev.detail.config });
  }

  private _guiModeChanged(ev: CustomEvent<{ guiMode: boolean; guiModeAvailable: boolean }>): void {
    ev.stopPropagation();
    this._guiMode = ev.detail.guiMode;
    this._guiModeAvailable = ev.detail.guiModeAvailable;
  }

  private _toggleMode(): void {
    this._cardEditor?.toggleMode();
  }

  private _togglePicker(): void {
    this._picking = !this._picking;
  }

  private _fireConfig(config: BorderCardConfig): void {
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }),
    );
  }
}

if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, BorderCardEditor);
}
