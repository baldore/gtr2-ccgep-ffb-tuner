export interface SimulatorParameters {
  gain: number;
  pneumaticTrailNm: number;
  suspensionTrailM: number;
  suspensionScrubM: number;
  gripFractPower: number;
  gamma: number;
  casterDegrees: number;
  kpiDegrees: number;
  steeringArmLengthM: number;
  tireSpinInertiaKgm2: number;
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
  gain: -1.49986594641995,
  pneumaticTrailNm: 0.00001,
  suspensionTrailM: 0.05,
  suspensionScrubM: 0.03,
  gripFractPower: 3,
  gamma: 1,
  casterDegrees: 10,
  kpiDegrees: 15,
  steeringArmLengthM: 0.15,
  tireSpinInertiaKgm2: 1.8,
  autoGain: true,
};

export const LEO_FFB_CONFIG = [
  "ffbCCGEPLeoKf = -11500.000000",
  "ffbCCGEPLeoKs = 7.000000",
  "ffbCCGEPLeoA = 1.500000",
  "ffbCCGEPLeoKr = 1.500000",
].join("\n");

const TIRE_CURVE = [
  0, 0.0998647816612757, 0.198850437271588, 0.295873493665782,
  0.389644451141353, 0.478747424649196, 0.56178359192142,
  0.637554401460092, 0.705248331276834, 0.764547986620691,
  0.815509139440791, 0.858530337038116, 0.894236140716461,
  0.923360033673105, 0.946656989027165, 0.96485363271285,
  0.978639812934221, 0.988654033276242, 0.99528134397826,
  0.998528480165178, 1, 0.999541463061979, 0.998237083578454,
  0.996193708545235, 0.99351818495813, 0.990317359812947,
  0.986698080105495, 0.982767192831583, 0.978631544987019,
  0.974397983567612, 0.970173355569171, 0.966064507987504,
  0.962178287818419, 0.958558064482702, 0.954720318327627,
  0.950615762783142, 0.946336323007018, 0.94197392415703,
  0.937620491390951, 0.933367949866554, 0.929308224741612,
  0.925533241173899, 0.922134924321188, 0.919185333516923,
  0.916416541442141, 0.913716717485577, 0.911085861647233,
  0.908523973927107, 0.906031054325201, 0.903607102841513,
  0.901252119476043, 0.898966104228793, 0.896749057099761,
  0.894600978088949, 0.892521867196355, 0.890511724421979,
  0.888570549765823, 0.886698343227885, 0.884895104808166,
  0.883160834506666, 0.881495532323385, 0.87989909911099,
  0.878344786015002, 0.876811700347376, 0.87529984210811,
  0.873809211297205, 0.872339807914662, 0.870891631960479,
  0.869464683434658, 0.868058962337197, 0.866674468668097,
  0.865311202427359, 0.863969163614981, 0.862648352230965,
  0.861348768275309, 0.860070411748015, 0.858813282649081,
  0.857577380978508, 0.856362706736297, 0.855169259922446,
  0.853997040536956, 0.852846048579828, 0.85171628405106,
  0.850607746950653, 0.849520437278608, 0.848454355034923,
  0.8474095002196, 0.846385872832637, 0.845383472874035,
  0.844402300343795, 0.843442355241915, 0.842503637568396,
  0.841586147323239, 0.840689884506442, 0.839814513818727,
  0.8389502198343, 0.838092459357331, 0.837241232387822,
  0.836396538925772, 0.835558378971181, 0.834726752524049,
  0.833901659584376, 0.833083100152162, 0.832271074227408,
  0.831465581810112, 0.830666622900276, 0.829874197497898,
  0.82908830560298, 0.828308947215521, 0.82753612233552,
  0.826769830962979, 0.826010073097897, 0.825256848740274,
  0.82451015789011, 0.823770000547405, 0.82303637671216,
  0.822309286384373, 0.821588729564045, 0.820874706251177,
  0.820167216445768, 0.819466260147817, 0.818771837357326,
  0.818083948074294, 0.817402592298721, 0.816727770030607,
  0.816059481269952, 0.815397726016756, 0.814742504271019,
  0.814093816032741, 0.813451661301923, 0.812816040078563,
  0.812186952362663, 0.811564398154221, 0.810948377453239,
  0.810338890259716, 0.809735936573652, 0.809139516395047,
  0.808549629723901, 0.807966276560214, 0.807389456903986,
  0.806819170755217, 0.806255418113908, 0.805698198980057,
  0.805147513353666, 0.804603361234733, 0.80406574262326,
  0.803534657519245, 0.80301010592269, 0.802492087833594,
  0.801980603251957, 0.8,
] as const;

const LOAD_CASES = [
  { key: "low", inside: 1_000, outside: 4_000 },
  { key: "medium", inside: 2_000, outside: 6_000 },
  { key: "high", inside: 3_000, outside: 8_000 },
] as const;

function frictionCoefficient(load: number): number {
  return 2.01 - load * 0.00012;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function clampGamma(value: number): number {
  return Math.min(1, Math.max(0.5, value));
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

  // Workbook model sets both longitudinal forces to zero. Scrub still affects this
  // graph through the caster geometry contribution calculated below.
  const longitudinalTorque0 = 0 * parameters.suspensionScrubM;
  const longitudinalTorque1 = 0 * -parameters.suspensionScrubM;

  const armLength = parameters.steeringArmLengthM === 0 ? 0.1 : parameters.steeringArmLengthM;
  const force0 = (lateralTorque0 + longitudinalTorque0) / armLength;
  const force1 = (lateralTorque1 + longitudinalTorque1) / armLength;

  const kpiSin = Math.sin(degreesToRadians(parameters.kpiDegrees));
  const casterSin = Math.sin(degreesToRadians(parameters.casterDegrees));
  const geometryForce0 =
    (kpiSin * parameters.suspensionTrailM * tireLoad0 +
      casterSin * parameters.suspensionScrubM * tireLoad0) /
    armLength;
  const geometryForce1 =
    -(
      kpiSin * parameters.suspensionTrailM * tireLoad1 +
      casterSin * parameters.suspensionScrubM * tireLoad1
    ) / armLength;

  const rawForce = (force0 + force1 + geometryForce0 + geometryForce1) * internalGain;
  const normalizedForce = rawForce / CLIPPING_FORCE;
  return (
    Math.sign(normalizedForce) *
    Math.pow(Math.abs(normalizedForce), parameters.gamma) *
    CLIPPING_FORCE
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
  const normalizedParameters = {
    ...parameters,
    gamma: clampGamma(parameters.gamma),
  };
  let gainMagnitude = Math.abs(parameters.gain);

  if (parameters.autoGain && gainMagnitude !== 0) {
    const referencePeak = findPeak(simulateWithGain(normalizedParameters, 1));
    if (referencePeak.force > 0) {
      gainMagnitude = Math.pow(
        CLIPPING_FORCE / referencePeak.force,
        1 / normalizedParameters.gamma,
      );
    }
  }

  const points = simulateWithGain(normalizedParameters, gainMagnitude);
  const peak = findPeak(points);

  return {
    parameters: {
      ...normalizedParameters,
      // The latest workbook normalizes either input sign to a negative config gain.
      gain: -gainMagnitude,
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
    `ffbCCGEPCasterDegrees=${formatConfigNumber(parameters.casterDegrees)}`,
    `ffbCCGEPKPIDegrees=${formatConfigNumber(parameters.kpiDegrees)}`,
    `ffbCCGEPSteeringArmLengthM=${formatConfigNumber(parameters.steeringArmLengthM)}`,
    `ffbCCGEPTireSpeenInertiaKGM2=${formatConfigNumber(parameters.tireSpinInertiaKgm2)}`,
    "ffbCCGEPRampUpKMH=10.000000",
    `ffbCCGEPGamma=${formatConfigNumber(parameters.gamma)}`,
  ].join("\n");
}
