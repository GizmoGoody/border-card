import { describe, expect, it } from "vitest";
import { SIDE_ANGLES, dash, outlinePath, sidePath } from "./progress-path";

describe("outlinePath", () => {
  it("has the length of a rounded rectangle along the middle of the border", () => {
    // 200 x 100 card, 10 px border, 20 px radius: the stroke runs on a 190 x 90 box with a 15 px radius.
    const path = outlinePath(200, 100, 10, 20);
    const expected = 2 * (190 - 30) + 2 * (90 - 30) + 2 * Math.PI * 15;
    expect(path.length).toBeCloseTo(expected, 5);
  });

  it("starts at the top center, so angle 0 is at length 0", () => {
    const path = outlinePath(200, 100, 10, 20);
    expect(path.lengthAtAngle(SIDE_ANGLES.top)).toBeCloseTo(0, 0);
  });

  it("finds the bottom center halfway around", () => {
    const path = outlinePath(200, 100, 10, 20);
    expect(path.lengthAtAngle(SIDE_ANGLES.bottom)).toBeCloseTo(path.length / 2, 0);
  });

  it("keeps the radius inside the box", () => {
    const path = outlinePath(40, 40, 10, 100);
    expect(Number.isFinite(path.length)).toBe(true);
    expect(path.length).toBeGreaterThan(0);
  });
});

describe("sidePath", () => {
  it("runs the full length of the side", () => {
    expect(sidePath("top", 300, 60, 8).length).toBe(300);
    expect(sidePath("left", 300, 60, 8).length).toBe(60);
  });

  it("runs clockwise: right to left on the bottom", () => {
    expect(sidePath("bottom", 300, 60, 8).d).toBe("M300 56L0 56");
  });
});

describe("dash", () => {
  it("shows only the requested part, with a period equal to the path length", () => {
    expect(dash(25, 50, 200)).toEqual({ "stroke-dasharray": "50px 150px", "stroke-dashoffset": "-25px" });
  });

  it("clamps a length longer than the path", () => {
    expect(dash(0, 300, 200)["stroke-dasharray"]).toBe("200px 0px");
  });
});
