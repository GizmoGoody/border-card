export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
}

export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
}

export interface LovelaceGridOptions {
  columns?: number | "full";
  rows?: number | "auto";
  min_columns?: number;
  max_columns?: number;
  min_rows?: number;
  max_rows?: number;
}

export type Direction = "clockwise" | "counterclockwise";
export type Track = "none" | "match" | "custom";
export type Side = "top" | "right" | "bottom" | "left";
/** Where the progress runs: around the whole border, along one side, or between two angles. */
export type ProgressPath = "full" | Side | "custom";
/** How the ends of the progress look: cut straight across the border, rounded, or pointing at the center. */
export type Ends = "straight" | "round" | "spoke";
export type Effect =
  "none" | "glow" | "pulse" | "breathe" | "flicker" | "shimmer" | "comet" | "chase" | "rainbow";
export type TextPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

/** A fixed number, or the entity ID of an input_number (or any entity with a numeric state). */
export type NumberValue = number | string;

/** A color (theme name, CSS color, or "r, g, b"), or the entity ID of an input_text (or any text entity). */
export type ColorValue = string;

export interface BorderOptions {
  color: ColorValue;
  thickness: NumberValue;
  effect?: Effect;
  /** Older option, the same as effect: glow. */
  glow?: boolean;
}

export interface TextOptions {
  enabled: boolean;
  position: TextPosition;
  template: string;
  color?: ColorValue;
}

export interface ProgressOptions {
  enabled: boolean;
  start: NumberValue;
  end: NumberValue;
  entity?: string;
  attribute?: string;
  min_value: NumberValue;
  max_value: NumberValue;
  path: ProgressPath;
  /** Where a full-border path starts. */
  start_at: Side;
  ends: Ends;
  direction: Direction;
  track: Track;
  track_color?: ColorValue;
  text: TextOptions;
}

/** The configuration as written by the user (every option is optional except the wrapped card). */
export interface BorderCardConfig extends LovelaceCardConfig {
  border?: Partial<BorderOptions>;
  progress?: Partial<Omit<ProgressOptions, "text">> & { text?: Partial<TextOptions> };
  card: LovelaceCardConfig;
}

/** The configuration after defaults are applied. */
export interface ResolvedConfig {
  border: BorderOptions;
  progress: ProgressOptions;
  card: LovelaceCardConfig;
}

/** A dashboard card element, as created by HA's card helpers. */
export interface LovelaceCard extends HTMLElement {
  hass?: HomeAssistant;
  preview?: boolean;
  layout?: string;
  getCardSize?(): number | Promise<number>;
  getGridOptions?(): LovelaceGridOptions;
}

export interface CardHelpers {
  createCardElement(config: LovelaceCardConfig): LovelaceCard;
}

declare global {
  interface Window {
    loadCardHelpers?: () => Promise<CardHelpers>;
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}
