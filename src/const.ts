import { version } from "../package.json";
import type { BorderOptions, ProgressOptions } from "./types";

export const CARD_TYPE = "border-card";
export const EDITOR_TYPE = "border-card-editor";
export const CARD_VERSION: string = version;
export const DOCS_URL = "https://github.com/GizmoGoody/border-card";

export const DEFAULT_BORDER: BorderOptions = {
  color: "#03a9f4",
  thickness: 4,
};

export const DEFAULT_PROGRESS: ProgressOptions = {
  enabled: false,
  start: 0,
  end: 360,
  min_value: 0,
  max_value: 100,
  path: "full",
  start_at: "top",
  ends: "straight",
  direction: "clockwise",
  track: "none",
  text: {
    enabled: true,
    position: "bottom-right",
    template: "{value}%",
  },
};

/** Strength of the progress track color, so the filled arc always stands out. */
export const TRACK_STRENGTH = "30%";
