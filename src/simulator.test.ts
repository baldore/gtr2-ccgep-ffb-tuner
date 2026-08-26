import { describe, expect, it } from "vitest";
import {
  CLIPPING_FORCE,
  DEFAULT_PARAMETERS,
  generateConfig,
  LEO_FFB_CONFIG,
  simulate,
} from "./simulator";

describe("latest CCGEP workbook model", () => {
  it("reproduces the workbook default curve", () => {
    const result = simulate(DEFAULT_PARAMETERS);

    expect(result.points).toHaveLength(151);
    expect(result.points[0]?.low).toBeCloseTo(544.463265038506, 8);
    expect(result.points[10]?.medium).toBeCloseTo(7701.608547363084, 8);
    expect(result.points[11]?.high).toBeCloseTo(CLIPPING_FORCE, 8);
    expect(result.points[20]?.grip).toBe(1);
    expect(result.points[150]?.high).toBeCloseTo(6247.961288469084, 8);
    expect(result.peak.force).toBeCloseTo(CLIPPING_FORCE, 8);
    expect(result.peak.slip).toBeCloseTo(6.6, 12);
    expect(result.peak.load).toBe("high");
  });

  it("applies the workbook one-pass auto-gain adjustment", () => {
    const result = simulate({
      ...DEFAULT_PARAMETERS,
      gain: -10,
      suspensionTrailM: 0.08,
    });

    expect(result.peak.force).toBeCloseTo(CLIPPING_FORCE, 8);
    expect(result.parameters.gain).not.toBe(-10);
    expect(result.parameters.gain).toBeLessThan(0);
  });

  it("normalizes either gain sign to a negative config value", () => {
    const result = simulate({
      ...DEFAULT_PARAMETERS,
      gain: 8,
      autoGain: false,
    });

    expect(result.peak.force).toBeGreaterThan(0);
    expect(result.parameters.gain).toBe(-8);
    expect(generateConfig(result.parameters)).toContain("ffbCCGEPGain=-8");
  });

  it("generates the latest eleven-line workbook output", () => {
    expect(generateConfig(DEFAULT_PARAMETERS)).toBe(
      [
        "ffbCCGEPGain=-1.49986594641995",
        "ffbCCGEPPneumaticTrailNM=0.00001",
        "ffbCCGEPSuspensionTrailM=0.05",
        "ffbCCGEPSuspensionScrubM=0.03",
        "ffbCCGEPGripFractPower=3",
        "ffbCCGEPCasterDegrees=10",
        "ffbCCGEPKPIDegrees=15",
        "ffbCCGEPSteeringArmLengthM=0.15",
        "ffbCCGEPTireSpeenInertiaKGM2=1.8",
        "ffbCCGEPRampUpKMH=10.000000",
        "ffbCCGEPGamma=1",
      ].join("\n"),
    );
  });

  it("reproduces the latest workbook LeoFFB output", () => {
    expect(LEO_FFB_CONFIG).toBe(
      [
        "ffbCCGEPLeoKf = -11500.000000",
        "ffbCCGEPLeoKs = 7.000000",
        "ffbCCGEPLeoA = 1.500000",
        "ffbCCGEPLeoKr = 1.500000",
      ].join("\n"),
    );
  });

  it("clamps gamma and boosts low force below gamma 1", () => {
    const linear = simulate({ ...DEFAULT_PARAMETERS, gamma: 1, autoGain: false });
    const shaped = simulate({ ...DEFAULT_PARAMETERS, gamma: 0.2, autoGain: false });

    expect(shaped.parameters.gamma).toBe(0.5);
    expect(shaped.points[0]?.high).toBeGreaterThan(linear.points[0]?.high ?? 0);
  });

  it("includes scrub in caster geometry", () => {
    const withScrub = simulate({ ...DEFAULT_PARAMETERS, autoGain: false });
    const withoutScrub = simulate({
      ...DEFAULT_PARAMETERS,
      suspensionScrubM: 0,
      autoGain: false,
    });

    expect(withScrub.points[0]?.high).not.toBeCloseTo(withoutScrub.points[0]?.high ?? 0, 8);
  });

  it("keeps tire spin inertia config-only", () => {
    const baseline = simulate({ ...DEFAULT_PARAMETERS, autoGain: false });
    const changed = simulate({
      ...DEFAULT_PARAMETERS,
      tireSpinInertiaKgm2: 8,
      autoGain: false,
    });

    expect(changed.points).toEqual(baseline.points);
  });

  it("keeps a finite gain when auto gain has no force to scale", () => {
    const result = simulate({
      ...DEFAULT_PARAMETERS,
      gain: 10,
      pneumaticTrailNm: 0,
      suspensionTrailM: 0,
      suspensionScrubM: 0,
      casterDegrees: 0,
      kpiDegrees: 0,
    });

    expect(result.peak.force).toBe(0);
    expect(result.parameters.gain).toBe(-10);
  });
});
