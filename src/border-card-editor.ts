import { LitElement, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { EDITOR_TYPE } from "./const";
import type { BorderCardConfig, HomeAssistant } from "./types";

interface SchemaItem {
  name: string;
  type?: "expandable";
  title?: string;
  label?: string;
  helper?: string;
  selector?: Record<string, unknown>;
  schema?: readonly SchemaItem[];
}

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

const TEXT_SCHEMA: SchemaItem = {
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
      helper: "Use {value} for the progress value, {state} for the entity state, or {attribute_name}",
      selector: { text: {} },
    },
    {
      name: "color",
      label: "Color",
      helper: "Leave empty to use the theme text color",
      selector: { ui_color: {} },
    },
  ],
};

function buildSchema(customTrack: boolean): SchemaItem[] {
  return [
    {
      type: "expandable",
      name: "border",
      title: "Border",
      schema: [
        { name: "color", label: "Color", selector: { ui_color: {} } },
        {
          name: "thickness",
          label: "Thickness",
          helper: "Set to 0 to disable the border",
          selector: { number: { min: 0, max: 50, step: 1, unit_of_measurement: "px" } },
        },
        { name: "glow", label: "Glow effect", selector: { boolean: {} } },
      ],
    },
    {
      type: "expandable",
      name: "progress",
      title: "Progress",
      schema: [
        { name: "enabled", label: "Enabled", selector: { boolean: {} } },
        {
          name: "start",
          label: "Start angle",
          selector: { number: { min: 0, max: 359, step: 1, unit_of_measurement: "°" } },
        },
        {
          name: "end",
          label: "End angle",
          selector: { number: { min: 1, max: 360, step: 1, unit_of_measurement: "°" } },
        },
        { name: "entity", label: "Entity", selector: { entity: {} } },
        {
          name: "attribute",
          label: "Attribute",
          helper: "Optional: use an entity attribute instead of the state",
          selector: { text: {} },
        },
        { name: "min_value", label: "Minimum value", selector: { number: { step: 0.1 } } },
        { name: "max_value", label: "Maximum value", selector: { number: { step: 0.1 } } },
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
          helper: "The unfilled part of the border",
          selector: {
            select: {
              mode: "dropdown",
              options: [
                { value: "none", label: "None" },
                { value: "match", label: "Match border" },
                { value: "custom", label: "Custom" },
              ],
            },
          },
        },
        ...(customTrack
          ? [{ name: "track_color", label: "Track color", selector: { ui_color: {} } }]
          : []),
        TEXT_SCHEMA,
      ],
    },
    { name: "card", label: "Wrapped card", selector: { card: {} } },
  ];
}

const SCHEMA = buildSchema(false);
const SCHEMA_CUSTOM_TRACK = buildSchema(true);

export class BorderCardEditor extends LitElement {
  @property({ attribute: false }) hass?: HomeAssistant;

  @state() private _config?: BorderCardConfig;

  setConfig(config: BorderCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) return nothing;
    const schema = this._config.progress?.track === "custom" ? SCHEMA_CUSTOM_TRACK : SCHEMA;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        .computeLabel=${(s: SchemaItem) => s.label ?? s.title ?? s.name}
        .computeHelper=${(s: SchemaItem) => s.helper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _valueChanged(ev: CustomEvent<{ value: BorderCardConfig }>): void {
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: ev.detail.value },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, BorderCardEditor);
}
