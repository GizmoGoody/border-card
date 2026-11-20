import { mdiCodeBraces, mdiListBoxOutline, mdiSwapHorizontal } from "@mdi/js";
import { LitElement, css, html, nothing } from "lit";
import { property, query, state } from "lit/decorators.js";
import { DEFAULT_BORDER, DEFAULT_PROGRESS, EDITOR_TYPE } from "./const";
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
const BORDER_KEYS = ["color", "thickness", "effect"];

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

const select = (name: string, label: string, options: [string, string][], helper?: string): SchemaItem => ({
  name,
  label,
  helper,
  selector: {
    select: { mode: "dropdown", options: options.map(([value, text]) => ({ value, label: text })) },
  },
});

const SIDES: [string, string][] = [
  ["top", "Top"],
  ["right", "Right"],
  ["bottom", "Bottom"],
  ["left", "Left"],
];

/** The progress fields that depend on the chosen path. */
function pathSchema(path: string): SchemaItem[] {
  const ends: [string, string][] = [
    ["straight", "Straight"],
    ["round", "Rounded"],
  ];
  // Spoke ends point at the center of the card, which only makes sense around the border.
  if (path === "full" || path === "custom") ends.push(["spoke", "Spoke"]);
  return [
    select("path", "Path", [
      ["full", "Full border"],
      ["top", "Top edge"],
      ["right", "Right edge"],
      ["bottom", "Bottom edge"],
      ["left", "Left edge"],
      ["custom", "Custom angles"],
    ]),
    ...(path === "full" ? [select("start_at", "Start at", SIDES)] : []),
    ...(path === "custom"
      ? [
          number("start", "Start angle", {
            min: 0,
            max: 359,
            step: 1,
            mode: "box",
            unit_of_measurement: "°",
          }),
          number("end", "End angle", { min: 1, max: 360, step: 1, mode: "box", unit_of_measurement: "°" }),
        ]
      : []),
    select(
      "direction",
      "Direction",
      [
        ["clockwise", "Clockwise"],
        ["counterclockwise", "Counterclockwise"],
      ],
      "Clockwise runs left to right on the top edge and top to bottom on the right edge",
    ),
    select("ends", "Ends", ends),
  ];
}

function buildSchema(customTrack: boolean, path: string): SchemaItem[] {
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
          { min: 0, max: 50, step: 1, mode: "box", unit_of_measurement: "px" },
          "Set to 0 to disable the border",
        ),
        {
          name: "effect",
          label: "Effect",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                { value: "none", label: "None" },
                { value: "glow", label: "Glow" },
                { value: "pulse", label: "Pulse" },
                { value: "breathe", label: "Breathe" },
                { value: "flicker", label: "Flicker" },
                { value: "shimmer", label: "Shimmer" },
                { value: "comet", label: "Comet" },
                { value: "chase", label: "Chase" },
                { value: "rainbow", label: "Rainbow" },
              ],
            },
          },
        },
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
            number("min_value", "Minimum value", { step: 0.1, mode: "box" }),
            number("max_value", "Maximum value", { step: 0.1, mode: "box" }),
            ...pathSchema(path),
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

/** Schemas are cached so ha-form only rebuilds when the visible fields change. */
const schemaCache = new Map<string, SchemaItem[]>();
function schemaFor(customTrack: boolean, path: string): SchemaItem[] {
  const key = `${customTrack}|${path}`;
  if (!schemaCache.has(key)) schemaCache.set(key, buildSchema(customTrack, path));
  return schemaCache.get(key)!;
}

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

/** Default values, shaped like the form data. The editor shows them, and saving leaves them out of the config. */
const { text: DEFAULT_TEXT, ...DEFAULT_PROGRESS_OPTIONS } = DEFAULT_PROGRESS;
const FORM_DEFAULTS: FormData = {
  ...DEFAULT_BORDER,
  effect: "none",
  progress: { ...DEFAULT_PROGRESS_OPTIONS, text: { ...DEFAULT_TEXT } },
};
/** Colors are not shown as defaults, because HA's color picker lists theme colors only. */
const HIDDEN_DEFAULTS = new Set(["color"]);

function isObject(value: unknown): value is FormData {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fillDefaults(data: FormData, defaults: FormData): void {
  for (const [key, value] of Object.entries(defaults)) {
    if (isObject(value)) {
      if (!isObject(data[key])) data[key] = {};
      fillDefaults(data[key] as FormData, value);
    } else if (
      data[key] === undefined &&
      data[`${key}${ENTITY_SUFFIX}`] === undefined &&
      !HIDDEN_DEFAULTS.has(key)
    ) {
      data[key] = value;
    }
  }
}

function stripDefaults(data: FormData, defaults: FormData): void {
  for (const [key, value] of Object.entries(data)) {
    const fallback = defaults[key];
    if (isObject(value) && isObject(fallback)) {
      stripDefaults(value, fallback);
      if (!Object.keys(value).length) delete data[key];
    } else if (value === undefined || value === "" || value === fallback) {
      delete data[key];
    }
  }
}

/** Config to form data: border options move to the top level, entity IDs move to their "_entity" field, and defaults fill the gaps. */
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
  fillDefaults(data, FORM_DEFAULTS);
  return data;
}

/** Removes options that do nothing with the current choices, so they do not linger in the config. */
function dropUnusedOptions(data: FormData): void {
  const progress = data.progress as FormData | undefined;
  if (!progress) return;
  const path = progress.path ?? DEFAULT_PROGRESS.path;
  if (path !== "custom") {
    delete progress.start;
    delete progress.end;
  }
  if (path !== "full") delete progress.start_at;
  if (path !== "full" && path !== "custom" && progress.ends === "spoke") delete progress.ends;
  if (progress.track !== "custom") delete progress.track_color;
}

/** Form data to config: the inverse of toFormData. A chosen entity replaces the value, and defaults are left out. */
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
  dropUnusedOptions(result);
  stripDefaults(result, FORM_DEFAULTS);
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
    const schema = schemaFor(progress?.track === "custom", String(progress?.path ?? "full"));
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
