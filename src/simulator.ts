export interface SimulatorParameters {
  gain: number;
  pneumaticTrailNm: number;
  suspensionTrailM: number;
  suspensionScrubM: number;
  gripFractPower: number;
  autoGain: boolean;
}

export type LoadKey = "low" | "medium" | "high";

export interface SimulationPoint {
  slip: number;
  grip: number;
  low: number;
  medium: number;
  high: number;
}

export interface SimulationResult {
  parameters: SimulatorParameters;
  points: SimulationPoint[];
  peak: {
    force: number;
    slip: number;
    load: LoadKey;
  };
}

export const CLIPPING_FORCE = 10_000;

export const DEFAULT_PARAMETERS: SimulatorParameters = {
  gain: 9.89256857270606,
  pneumaticTrailNm: 0.00001,
  suspensionTrailM: 0.05,
  suspensionScrubM: 0.03,
  gripFractPower: 3,
  autoGain: true,
};

export const LEO_FFB_CONFIG = [
  "ffbCCGEPLeoKf=15000.000000",
  "ffbCCGEPLeoKs=5.000000",
  "ffbCCGEPLeoA=1.500000",
  "ffbCCGEPLeoKr=20.000000",
].join("\n");

const TIRE_CURVE = [
  0, 0.174836, 0.349483, 0.51806, 0.668882, 0.790665, 0.878928, 0.936783,
  0.971287, 0.989751, 0.997978, 1, 0.999983, 0.999934, 0.999854, 0.999742,
  0.999598, 0.999423, 0.999215, 0.998977, 0.998707, 0.998405, 0.998072,
  0.997708, 0.997312, 0.996886, 0.996428, 0.995939, 0.99542, 0.99487,
  0.99429, 0.993679, 0.993038, 0.992366, 0.991665, 0.990934, 0.990173,
  0.989383, 0.988564, 0.987715, 0.986838, 0.985932, 0.984997, 0.984034,
  0.983043, 0.982024, 0.980978, 0.979904, 0.978803, 0.977676, 0.976521,
] as const;

const LOAD_CASES = [
  { key: "low", inside: 1_000, outside: 4_000 },
  { key: "medium", inside: 2_000, outside: 6_000 },
  { key: "high", inside: 3_000, outside: 8_000 },
] as const;

function frictionCoefficient(load: number): number {
  return 2.01 - load * 0.00012;
}

function steeringForce(
  tireLoad0: number,
  tireLoad1: number,
  gripFract0: number,
  gripFract1: number,
  lateralForce0: number,
  lateralForce1: number,
  parameters: SimulatorParameters,
  internalGain: number,
): number {
  const pneumaticTrail0 =
    parameters.pneumaticTrailNm *
    tireLoad0 *
    Math.pow(gripFract0, parameters.gripFractPower);
  const pneumaticTrail1 =
    parameters.pneumaticTrailNm *
    tireLoad1 *
    Math.pow(gripFract1, parameters.gripFractPower);

  const lateralTorque0 =
    pneumaticTrail0 * lateralForce0 + parameters.suspensionTrailM * lateralForce0;
  const lateralTorque1 =
    pneumaticTrail1 * lateralForce1 + parameters.suspensionTrailM * lateralForce1;

  // Workbook model sets both longitudinal forces to zero. Suspension scrub is retained
  // as a config output because it matters in game under asymmetric braking/traction.
  const longitudinalTorque0 = 0 * parameters.suspensionScrubM;
  const longitudinalTorque1 = 0 * -parameters.suspensionScrubM;

  return (
    (lateralTorque0 + longitudinalTorque0 + lateralTorque1 + longitudinalTorque1) *
    internalGain
  );
}

function simulateWithGain(
  parameters: SimulatorParameters,
  gainMagnitude: number,
): SimulationPoint[] {
  const internalGain = -Math.abs(gainMagnitude);
  const gripFractions = TIRE_CURVE.map((curveValue, index) => {
    if (index < 2) return 1;
    return curveValue / index / TIRE_CURVE[1];
  });

  return TIRE_CURVE.map((tireCurve, index) => {
    const grip = gripFractions[index] ?? 0;
    const forces = Object.fromEntries(
      LOAD_CASES.map(({ key, inside, outside }) => {
        const insideLateralForce =
          inside * frictionCoefficient(inside) * tireCurve * -1;
        const outsideLateralForce =
          outside * frictionCoefficient(outside) * tireCurve * -1;
        const force = steeringForce(
          inside,
          outside,
          grip,
          grip,
          insideLateralForce,
          outsideLateralForce,
          parameters,
          internalGain,
        );
        return [key, force];
      }),
    ) as Record<LoadKey, number>;

    return {
      slip: index * 0.6,
      grip: tireCurve,
      low: forces.low,
      medium: forces.medium,
      high: forces.high,
    };
  });
}

function findPeak(points: SimulationPoint[]): SimulationResult["peak"] {
  let peak: SimulationResult["peak"] = { force: 0, slip: 0, load: "low" };
  const loadKeys: LoadKey[] = ["low", "medium", "high"];

  for (const point of points) {
    for (const load of loadKeys) {
      if (point[load] > peak.force) {
        peak = { force: point[load], slip: point.slip, load };
      }
    }
  }

  return peak;
}

export function simulate(parameters: SimulatorParameters): SimulationResult {
  const signedDirection = parameters.gain < 0 ? -1 : 1;
  let gainMagnitude = Math.abs(parameters.gain);
  let points = simulateWithGain(parameters, gainMagnitude);
  let peak = findPeak(points);

  if (parameters.autoGain && gainMagnitude !== 0 && peak.force > 0) {
    gainMagnitude *= CLIPPING_FORCE / peak.force;
    points = simulateWithGain(parameters, gainMagnitude);
    peak = findPeak(points);
  }

  return {
    parameters: {
      ...parameters,
      gain: signedDirection * gainMagnitude,
    },
    points,
    peak,
  };
}

export function formatConfigNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.parseFloat(value.toPrecision(15)).toString();
}

export function generateConfig(parameters: SimulatorParameters): string {
  return [
    `ffbCCGEPGain=${formatConfigNumber(parameters.gain)}`,
    `ffbCCGEPPneumaticTrailNM=${formatConfigNumber(parameters.pneumaticTrailNm)}`,
    `ffbCCGEPSuspensionTrailM=${formatConfigNumber(parameters.suspensionTrailM)}`,
    `ffbCCGEPSuspensionScrubM=${formatConfigNumber(parameters.suspensionScrubM)}`,
    `ffbCCGEPGripFractPower=${formatConfigNumber(parameters.gripFractPower)}`,
    "ffbCCGEPRampUpKMH=15.000000",
  ].join("\n");
}
