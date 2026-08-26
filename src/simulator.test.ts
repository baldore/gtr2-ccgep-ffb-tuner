import { describe, expect, it } from "vitest";
import {
  CLIPPING_FORCE,
  DEFAULT_PARAMETERS,
  generateConfig,
  LEO_FFB_CONFIG,
  simulate,
} from "./simulator";

describe("CCGEP workbook model", () => {
  it("reproduces workbook default curve values", () => {
    const result = simulate(DEFAULT_PARAMETERS);

    expect(result.points).toHaveLength(51);
    expect(result.points[1]?.low).toBeCloseTo(1148.7851224249462, 8);
    expect(result.points[5]?.medium).toBeCloseTo(7508.809921240092, 8);
    expect(result.points[10]?.high).toBeCloseTo(8096.471677380805, 8);
    expect(result.peak.force).toBeCloseTo(CLIPPING_FORCE, 8);
    expect(result.peak.slip).toBeCloseTo(3.6, 12);
    expect(result.peak.load).toBe("high");
  });

  it("auto-adjusts gain when another parameter changes", () => {
    const result = simulate({
      ...DEFAULT_PARAMETERS,
      gain: 10,
      suspensionTrailM: 0.08,
    });

    expect(result.peak.force).toBeCloseTo(CLIPPING_FORCE, 8);
    expect(result.parameters.gain).not.toBe(10);
  });

  it("preserves signed gain in config while graphing force magnitude", () => {
    const result = simulate({
      ...DEFAULT_PARAMETERS,
      gain: -8,
      autoGain: false,
    });
    const config = generateConfig(result.parameters);

    expect(result.peak.force).toBeGreaterThan(0);
    expect(config).toContain("ffbCCGEPGain=-8");
  });

  it("generates the six-line workbook output", () => {
    expect(generateConfig(DEFAULT_PARAMETERS)).toBe(
      [
        "ffbCCGEPGain=9.89256857270606",
        "ffbCCGEPPneumaticTrailNM=0.00001",
        "ffbCCGEPSuspensionTrailM=0.05",
        "ffbCCGEPSuspensionScrubM=0.03",
        "ffbCCGEPGripFractPower=3",
        "ffbCCGEPRampUpKMH=15.000000",
      ].join("\n"),
    );
  });

  it("formats LeoFFB like the primary config", () => {
    expect(LEO_FFB_CONFIG.split("\n")).toHaveLength(4);
    expect(LEO_FFB_CONFIG).not.toContain(" = ");
  });
});
