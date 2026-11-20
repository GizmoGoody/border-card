import { beforeAll, describe, expect, it } from "vitest";
import type { HomeAssistant } from "./types";
import { computePercent, formatText, isEntityId, resolveColor, resolveNumber, toCssColor } from "./utils";

// Node has no CSS.supports; this stand-in accepts the color forms the tests use.
beforeAll(() => {
  globalThis.CSS = {
    supports: (_property: string, value: string) =>
      /^(#[0-9a-f]{3,8}|rgb\(|hsl\(|transparent$|red$)/i.test(value),
  } as unknown as typeof CSS;
});

const hass = (states: Record<string, string>): HomeAssistant => ({
  states: Object.fromEntries(
    Object.entries(states).map(([id, state]) => [id, { entity_id: id, state, attributes: {} }]),
  ),
});

describe("isEntityId", () => {
  it("accepts entity IDs and rejects colors and numbers", () => {
    expect(isEntityId("input_number.border")).toBe(true);
    expect(isEntityId("red")).toBe(false);
    expect(isEntityId("#ff9800")).toBe(false);
    expect(isEntityId("rgb(1.5, 2, 3)")).toBe(false);
    expect(isEntityId(4)).toBe(false);
  });
});

describe("toCssColor", () => {
  it("maps theme color names to theme variables", () => {
    expect(toCssColor("primary")).toBe("var(--primary-color)");
    expect(toCssColor("light-blue")).toBe("var(--light-blue-color)");
  });

  it("turns three numbers into rgb()", () => {
    expect(toCssColor("255, 152, 0")).toBe("rgb(255, 152, 0)");
    expect(toCssColor("[255,152,0]")).toBe("rgb(255, 152, 0)");
  });

  it("passes valid CSS colors through and rejects anything else", () => {
    expect(toCssColor("#cccccc")).toBe("#cccccc");
    expect(toCssColor("transparent")).toBe("transparent");
    expect(toCssColor("cccccc")).toBeUndefined();
    expect(toCssColor("not a color")).toBeUndefined();
    expect(toCssColor("  ")).toBeUndefined();
  });
});

describe("resolveColor", () => {
  it("reads a color from an entity's state", () => {
    expect(resolveColor("input_text.c", hass({ "input_text.c": "#00ff00" }))).toBe("#00ff00");
  });

  it("returns undefined for a missing entity or a state that is not a color", () => {
    expect(resolveColor("input_text.missing", hass({}))).toBeUndefined();
    expect(resolveColor("input_text.c", hass({ "input_text.c": "unknown" }))).toBeUndefined();
  });
});

describe("resolveNumber", () => {
  it("uses fixed numbers as they are", () => {
    expect(resolveNumber(4, undefined, 0)).toBe(4);
  });

  it("reads a number from an entity's state", () => {
    expect(resolveNumber("input_number.t", hass({ "input_number.t": "5.0" }), 0)).toBe(5);
  });

  it("falls back when the state is not a number", () => {
    expect(resolveNumber("input_number.t", hass({ "input_number.t": "unavailable" }), 4)).toBe(4);
    expect(resolveNumber(undefined, undefined, 4)).toBe(4);
  });
});

describe("computePercent", () => {
  it("scales the value into the range and clamps it", () => {
    expect(computePercent("65", 0, 130)).toBe(50);
    expect(computePercent(200, 0, 130)).toBe(100);
    expect(computePercent(-5, 0, 100)).toBe(0);
  });

  it("returns 0 for values that are not numbers or an empty range", () => {
    expect(computePercent("unknown", 0, 100)).toBe(0);
    expect(computePercent(5, 10, 10)).toBe(0);
  });
});

describe("formatText", () => {
  it("fills every {value}, {state} and attribute token", () => {
    const stateObj = { entity_id: "sensor.x", state: "61", attributes: { unit: "doobers" } };
    expect(formatText("{value}% ({state} {unit}) {value}", 46.6, stateObj)).toBe("47% (61 doobers) 47");
  });
});
