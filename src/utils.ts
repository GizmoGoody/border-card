import { DEFAULT_BORDER, DEFAULT_PROGRESS, TRACK_STRENGTH } from "./const";
import type {
  BorderCardConfig,
  ColorValue,
  HassEntity,
  HomeAssistant,
  NumberValue,
  ResolvedConfig,
} from "./types";

/** Theme color names returned by HA's ui_color selector (mirrors HA's THEME_COLORS). */
const THEME_COLORS = new Set([
  "primary",
  "accent",
  "disabled",
  "red",
  "pink",
  "purple",
  "deep-purple",
  "indigo",
  "blue",
  "light-blue",
  "cyan",
  "teal",
  "green",
  "light-green",
  "lime",
  "yellow",
  "amber",
  "orange",
  "deep-orange",
  "brown",
  "light-grey",
  "grey",
  "dark-grey",
  "blue-grey",
  "black",
  "white",
]);

const ENTITY_ID = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const RGB_TRIPLET = /^[[(]?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*[\])]?$/;

export function isEntityId(value: unknown): value is string {
  return typeof value === "string" && ENTITY_ID.test(value);
}

/**
 * Turns a color into CSS. Theme names map to theme variables (HA's computeCssColor rule),
 * "r, g, b" becomes rgb(), and any other valid CSS color (red, transparent, #hex, rgb(), hsl()) is used as is.
 * Returns undefined for anything that is not a color.
 */
export function toCssColor(value: string): string | undefined {
  const color = value.trim();
  if (!color) return undefined;
  if (THEME_COLORS.has(color)) return `var(--${color}-color)`;
  const rgb = RGB_TRIPLET.exec(color);
  if (rgb) return `rgb(${rgb[1]}, ${rgb[2]}, ${rgb[3]})`;
  return CSS.supports("color", color) ? color : undefined;
}

/** Reads a color value, following it to an entity's state when it is an entity ID. */
export function resolveColor(value: ColorValue | undefined, hass?: HomeAssistant): string | undefined {
  if (!value) return undefined;
  const text = isEntityId(value) ? hass?.states[value]?.state : value;
  return text === undefined ? undefined : toCssColor(text);
}

/** Reads a number value, following it to an entity's state when it is an entity ID. */
export function resolveNumber(value: NumberValue | undefined, hass: HomeAssistant | undefined, fallback: number) {
  if (typeof value === "number") return value;
  const text = isEntityId(value) ? hass?.states[value]?.state : value;
  const number = parseFloat(text ?? "");
  return Number.isFinite(number) ? number : fallback;
}

export function dimColor(color: string): string {
  return `color-mix(in srgb, ${color} ${TRACK_STRENGTH}, transparent)`;
}

export function resolveConfig(config: BorderCardConfig): ResolvedConfig {
  const { text, ...progress } = config.progress ?? {};
  return {
    border: { ...DEFAULT_BORDER, ...config.border },
    progress: {
      ...DEFAULT_PROGRESS,
      ...progress,
      text: { ...DEFAULT_PROGRESS.text, ...text },
    },
    card: config.card,
  };
}

/** Every entity the card reads, so it re-renders only when one of them changes. */
export function referencedEntities(config: ResolvedConfig): string[] {
  const { border, progress } = config;
  const values: unknown[] = [border.color, border.thickness];
  if (progress.enabled) {
    values.push(
      progress.entity,
      progress.start,
      progress.end,
      progress.min_value,
      progress.max_value,
      progress.track_color,
      progress.text.color,
    );
  }
  return [...new Set(values.filter(isEntityId))];
}

/** Progress as a percentage (0 to 100) of the value range. */
export function computePercent(raw: unknown, min: number, max: number): number {
  const value = parseFloat(String(raw));
  const range = max - min;
  if (Number.isNaN(value) || range === 0) return 0;
  return Math.max(0, Math.min(100, ((value - min) / range) * 100));
}

/** Fills {value}, {state} and {<attribute>} in the text template. */
export function formatText(template: string, percent: number, stateObj?: HassEntity): string {
  let text = template.replaceAll("{value}", String(Math.round(percent)));
  text = text.replaceAll("{state}", stateObj?.state ?? "");
  for (const [name, value] of Object.entries(stateObj?.attributes ?? {})) {
    text = text.replaceAll(`{${name}}`, String(value));
  }
  return text;
}
