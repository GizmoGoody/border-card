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

export interface BorderOptions {
  color: string;
  thickness: number;
  glow: boolean;
}

export interface TextOptions {
  enabled: boolean;
  position: TextPosition;
  template: string;
  color?: string;
}

export interface ProgressOptions {
  enabled: boolean;
  start: number;
  end: number;
  entity?: string;
  attribute?: string;
  min_value: number;
  max_value: number;
  direction: Direction;
  track: Track;
  track_color?: string;
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

/** HA's own card container, used by its stack and conditional cards. */
export interface HuiCard extends HTMLElement {
  config?: LovelaceCardConfig;
  hass?: HomeAssistant;
  preview?: boolean;
  getCardSize?(): number | Promise<number>;
  getGridOptions?(): LovelaceGridOptions;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card": HuiCard;
  }
  interface Window {
    customCards?: Array<{
      type: string;
      name: string;
      description: string;
      preview?: boolean;
      documentationURL?: string;
    }>;
  }
}
