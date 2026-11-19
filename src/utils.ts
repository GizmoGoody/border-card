import { DEFAULT_BORDER, DEFAULT_PROGRESS, TRACK_STRENGTH } from "./const";
import type { BorderCardConfig, HassEntity, ProgressOptions, ResolvedConfig } from "./types";

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

/** Same rule as HA's computeCssColor: theme names map to theme variables, anything else is used as is. */
export function computeCssColor(color: string): string {
  return THEME_COLORS.has(color) ? `var(--${color}-color)` : color;
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

/** Progress as a percentage (0 to 100) of the configured value range. */
export function computePercent(progress: ProgressOptions, stateObj?: HassEntity): number {
  if (!stateObj) return 0;
  const raw = progress.attribute ? stateObj.attributes[progress.attribute] : stateObj.state;
  const value = parseFloat(String(raw));
  const range = progress.max_value - progress.min_value;
  if (Number.isNaN(value) || range === 0) return 0;
  return Math.max(0, Math.min(100, ((value - progress.min_value) / range) * 100));
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
