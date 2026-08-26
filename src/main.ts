import "./styles.css";
import {
  EXCEL_FORCE_MAX,
  EXCEL_GRIP_SLIP_MAX,
  EXCEL_PRIMARY_SLIP_MAX,
  smoothPath,
} from "./chart";
import {
  CLIPPING_FORCE,
  DEFAULT_PARAMETERS,
  generateConfig,
  LEO_FFB_CONFIG,
  simulate,
  type LoadKey,
  type SimulationResult,
  type SimulatorParameters,
} from "./simulator";

type NumericParameterKey = Exclude<keyof SimulatorParameters, "autoGain">;

interface ParameterDefinition {
  key: NumericParameterKey;
  label: string;
  configName: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: string;
  range: string;
  note: string;
  exportOnly?: boolean;
}

const PARAMETER_DEFINITIONS: ParameterDefinition[] = [
  {
    key: "gain",
    label: "Gain",
    configName: "ffbCCGEPGain",
    unit: "unitless",
    min: -100,
    max: 0,
    step: 0.01,
    defaultValue: "−0.8",
    range: "Typical: −5 to −15",
    note: "Scales every steering force. More-negative values increase force and clipping. The latest workbook normalizes either sign to a negative gain; auto mode calculates the magnitude.",
  },
  {
    key: "pneumaticTrailNm",
    label: "Pneumatic trail",
    configName: "ffbCCGEPPneumaticTrailNM",
    unit: "m/N",
    min: 0,
    max: 0.00004,
    step: 0.000001,
    defaultValue: "0.00001",
    range: "Suggested: 0.000005–0.00002",
    note: "Builds force near center and amplifies load differences. Larger values rise faster, then tend to fall sooner after the force peak.",
  },
  {
    key: "suspensionTrailM",
    label: "Suspension trail",
    configName: "ffbCCGEPSuspensionTrailM",
    unit: "m",
    min: 0,
    max: 0.15,
    step: 0.001,
    defaultValue: "0.05",
    range: "Suggested: 0.01–0.10",
    note: "Keeps steering centered and prevents force from falling too low at larger slip. Higher values keep steering heavier beyond peak grip.",
  },
  {
    key: "suspensionScrubM",
    label: "Suspension scrub",
    configName: "ffbCCGEPSuspensionScrubM",
    unit: "m",
    min: -0.05,
    max: 0.1,
    step: 0.001,
    defaultValue: "0.03",
    range: "Suggested: −0.05–0.10",
    note: "Adds torque from unequal braking or front-drive traction in game. In the latest model it also changes the graph through caster geometry.",
  },
  {
    key: "gripFractPower",
    label: "Grip fraction power",
    configName: "ffbCCGEPGripFractPower",
    unit: "unitless",
    min: 0.5,
    max: 4,
    step: 0.1,
    defaultValue: "3",
    range: "Suggested: 0.5–4.0",
    note: "Controls force falloff after the peak. Larger values create a sharper, harsher drop; smaller values make the falloff slower.",
  },
  {
    key: "gamma",
    label: "Gamma",
    configName: "ffbCCGEPGamma",
    unit: "unitless",
    min: 0.5,
    max: 1,
    step: 0.01,
    defaultValue: "1",
    range: "Range: 0.5–1.0",
    note: "Boosts low forces near steering center. A value of 1 applies no shaping; smaller values strengthen low forces. The workbook clamps this setting to 0.5–1.0.",
  },
  {
    key: "casterDegrees",
    label: "Caster angle",
    configName: "ffbCCGEPCasterDegrees",
    unit: "deg",
    min: 0,
    max: 30,
    step: 0.1,
    defaultValue: "10",
    range: "Reference: 10°",
    note: "Adds steering-arm force from caster geometry and vertical tire load. Match the car setup when known; zero disables the caster contribution.",
  },
  {
    key: "kpiDegrees",
    label: "KPI angle",
    configName: "ffbCCGEPKPIDegrees",
    unit: "deg",
    min: 0,
    max: 30,
    step: 0.1,
    defaultValue: "15",
    range: "Reference: 15°",
    note: "Kingpin inclination adds steering-arm force from suspension trail and vertical tire load. Zero disables the KPI contribution.",
  },
  {
    key: "steeringArmLengthM",
    label: "Steering arm length",
    configName: "ffbCCGEPSteeringArmLengthM",
    unit: "m",
    min: 0,
    max: 1,
    step: 0.01,
    defaultValue: "0.15",
    range: "Reference: 0.15 m",
    note: "Converts upright torque into steering-arm force. Shorter arms amplify force. The workbook substitutes 0.1 m when this value is zero.",
  },
  {
    key: "tireSpinInertiaKgm2",
    label: "Tire spin inertia",
    configName: "ffbCCGEPTireSpeenInertiaKGM2",
    unit: "kg·m²",
    min: 0,
    max: 10,
    step: 0.1,
    defaultValue: "1.8",
    range: "Modern GT3: 1.8",
    note: "Controls gyroscopic steering force in game. The workbook documents 1.8 for a modern GT3 tire, but this parameter does not affect the spreadsheet graph.",
    exportOnly: true,
  },
];

const STORAGE_KEY = "ccgep-ffb-tuner:parameters:v2";
const SVG_NS = "http://www.w3.org/2000/svg";

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required element: ${selector}`);
  return element;
}

function loadParameters(): SimulatorParameters {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PARAMETERS };
    const parsed = JSON.parse(stored) as Partial<SimulatorParameters>;
    return { ...DEFAULT_PARAMETERS, ...parsed };
  } catch {
    return { ...DEFAULT_PARAMETERS };
  }
}

let parameters = loadParameters();

const parameterList = requiredElement<HTMLDivElement>("#parameter-list");
const autoGainInput = requiredElement<HTMLInputElement>("#auto-gain");
const chart = requiredElement<SVGSVGElement>("#ffb-chart");
const configOutput = requiredElement<HTMLPreElement>("#config-output");
const leoOutput = requiredElement<HTMLPreElement>("#leo-output");
const peakForce = requiredElement<HTMLElement>("#peak-force");
const peakStatus = requiredElement<HTMLElement>("#peak-status");
const peakLoad = requiredElement<HTMLElement>("#peak-load");
const peakSlip = requiredElement<HTMLElement>("#peak-slip");
const gainMode = requiredElement<HTMLElement>("#gain-mode");
const limitUsage = requiredElement<HTMLElement>("#limit-usage");
const creditsDialog = requiredElement<HTMLDialogElement>("#credits-dialog");

requiredElement<HTMLButtonElement>("#credits-open").addEventListener("click", () => {
  creditsDialog.showModal();
  document.body.classList.add("dialog-open");
});

requiredElement<HTMLButtonElement>("#credits-close").addEventListener("click", () => {
  creditsDialog.close();
});

creditsDialog.addEventListener("click", (event) => {
  if (event.target === creditsDialog) creditsDialog.close();
});

creditsDialog.addEventListener("close", () => {
  document.body.classList.remove("dialog-open");
});

function numberValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number.parseFloat(value.toPrecision(10)));
}

function createParameterControl(definition: ParameterDefinition): HTMLDivElement {
  const control = document.createElement("div");
  control.className = "parameter-control";
  control.classList.toggle("is-export-only", definition.exportOnly === true);
  control.dataset.parameter = definition.key;
  control.innerHTML = `
    <div class="parameter-compact-header">
      <span class="parameter-name">
        <strong>${definition.label}</strong>
        <small>${definition.configName}</small>
      </span>
      <span class="parameter-unit">${definition.unit}</span>
      <details class="parameter-help">
        <summary class="info-dot">
          <span aria-hidden="true">i</span>
          <span class="sr-only">About ${definition.label}</span>
        </summary>
        <p>${definition.note}</p>
      </details>
    </div>
    <div class="parameter-body">
    <div class="input-pair">
      <input
        class="range-input"
        type="range"
        min="${definition.min}"
        max="${definition.max}"
        step="${definition.step}"
        aria-label="${definition.label} slider"
      />
      <input
        class="number-input"
        type="number"
        min="${definition.min}"
        max="${definition.max}"
        step="${definition.step}"
        inputmode="decimal"
        aria-label="${definition.label} value"
      />
    </div>
    <div class="parameter-scale">
      <span>${definition.range}</span>
      <span>Workbook reference: ${definition.defaultValue}</span>
    </div>
    </div>
  `;

  const rangeInput = control.querySelector<HTMLInputElement>(".range-input");
  const numberInput = control.querySelector<HTMLInputElement>(".number-input");
  if (!rangeInput || !numberInput) throw new Error("Parameter inputs failed to render");

  const update = (input: HTMLInputElement) => {
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    parameters = { ...parameters, [definition.key]: value };
    render();
  };

  rangeInput.addEventListener("input", () => update(rangeInput));
  numberInput.addEventListener("input", () => update(numberInput));
  return control;
}

for (const definition of PARAMETER_DEFINITIONS) {
  parameterList.append(createParameterControl(definition));
}

autoGainInput.addEventListener("change", () => {
  parameters = { ...parameters, autoGain: autoGainInput.checked };
  render();
});

requiredElement<HTMLButtonElement>("#reset-button").addEventListener("click", () => {
  parameters = { ...DEFAULT_PARAMETERS };
  render();
});

function setControlValues(): void {
  for (const definition of PARAMETER_DEFINITIONS) {
    const control = requiredElement<HTMLDivElement>(
      `[data-parameter="${definition.key}"]`,
    );
    const rangeInput = control.querySelector<HTMLInputElement>(".range-input");
    const numberInput = control.querySelector<HTMLInputElement>(".number-input");
    if (!rangeInput || !numberInput) continue;
    const value = parameters[definition.key];
    rangeInput.value = String(value);
    numberInput.value = numberValue(value);
    const gainIsAutomatic = definition.key === "gain" && parameters.autoGain;
    rangeInput.disabled = gainIsAutomatic;
    numberInput.disabled = gainIsAutomatic;
    control.classList.toggle("is-calculated", gainIsAutomatic);
  }
  autoGainInput.checked = parameters.autoGain;
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function linePath(
  result: SimulationResult,
  key: LoadKey | "grip",
  xScale: (value: number) => number,
  yScale: (value: number) => number,
): string {
  return smoothPath(
    result.points.map((point) => ({
      x: xScale(point.slip),
      y: yScale(point[key]),
    })),
  );
}

function renderChart(result: SimulationResult): void {
  chart.replaceChildren();

  const isCompact = window.matchMedia("(max-width: 620px)").matches;
  const width = isCompact ? 540 : 820;
  const height = isCompact ? 430 : 470;
  const margin = isCompact
    ? { top: 22, right: 48, bottom: 60, left: 72 }
    : { top: 24, right: 58, bottom: 58, left: 72 };
  chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  chart.classList.toggle("is-compact", isCompact);
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xMax = EXCEL_PRIMARY_SLIP_MAX;
  const yMax = EXCEL_FORCE_MAX;
  const xScale = (value: number) => margin.left + (value / xMax) * plotWidth;
  const gripXScale = (value: number) =>
    margin.left + (value / EXCEL_GRIP_SLIP_MAX) * plotWidth;
  const yScale = (value: number) => margin.top + plotHeight - (value / yMax) * plotHeight;
  const gripScale = (value: number) => margin.top + plotHeight - value * plotHeight;

  const title = createSvgElement("title", { id: "chart-svg-title" });
  title.textContent = "Simulated CCGEP force feedback curves";
  const description = createSvgElement("desc", { id: "chart-svg-description" });
  description.textContent =
    "Force feedback by relative tire slip for low, medium, and high front-tire loads, with grip and the 10,000 clipping limit.";
  chart.append(title, description);

  const definitions = createSvgElement("defs");
  const plotClip = createSvgElement("clipPath", { id: "chart-plot-clip" });
  plotClip.append(
    createSvgElement("rect", {
      x: margin.left,
      y: margin.top,
      width: plotWidth,
      height: plotHeight,
    }),
  );
  definitions.append(plotClip);
  chart.append(definitions);

  const grid = createSvgElement("g", { class: "chart-grid" });
  for (let value = 0; value <= yMax; value += 2_000) {
    const y = yScale(value);
    grid.append(
      createSvgElement("line", {
        x1: margin.left,
        x2: width - margin.right,
        y1: y,
        y2: y,
      }),
    );
    const label = createSvgElement("text", {
      x: margin.left - 14,
      y: y + 4,
      "text-anchor": "end",
      class: "axis-label",
    });
    label.textContent = value.toLocaleString("en-US");
    grid.append(label);
  }

  const xTickStep = isCompact ? 10 : 5;
  for (let value = 0; value <= xMax; value += xTickStep) {
    const x = xScale(value);
    grid.append(
      createSvgElement("line", {
        x1: x,
        x2: x,
        y1: margin.top,
        y2: height - margin.bottom,
      }),
    );
    const label = createSvgElement("text", {
      x,
      y: height - margin.bottom + 25,
      "text-anchor": "middle",
      class: "axis-label",
    });
    label.textContent = String(value);
    grid.append(label);
  }

  for (let value = 0; value <= 1; value += 0.2) {
    const y = gripScale(value);
    const label = createSvgElement("text", {
      x: width - margin.right + 12,
      y: y + 4,
      "text-anchor": "start",
      class: "axis-label grip-axis-label",
    });
    label.textContent = `${Math.round(value * 100)}%`;
    grid.append(label);
  }
  chart.append(grid);

  const yTitle = createSvgElement("text", {
    x: 18,
    y: margin.top + plotHeight / 2,
    transform: `rotate(-90 18 ${margin.top + plotHeight / 2})`,
    "text-anchor": "middle",
    class: "axis-title",
  });
  yTitle.textContent = "FFB";
  const xTitle = createSvgElement("text", {
    x: margin.left + plotWidth / 2,
    y: height - 8,
    "text-anchor": "middle",
    class: "axis-title",
  });
  xTitle.textContent = "TIRE SLIP";
  chart.append(yTitle, xTitle);

  const clippingY = yScale(CLIPPING_FORCE);
  chart.append(
    createSvgElement("line", {
      x1: margin.left,
      x2: width - margin.right,
      y1: clippingY,
      y2: clippingY,
      class: "clipping-line",
    }),
  );
  const clippingLabel = createSvgElement("text", {
    x: width - margin.right - 8,
    y: clippingY - 9,
    "text-anchor": "end",
    class: "clipping-label",
  });
  clippingLabel.textContent = "10,000 LIMIT";
  chart.append(clippingLabel);

  const series: Array<{ key: LoadKey | "grip"; className: string }> = [
    { key: "low", className: "series-low" },
    { key: "medium", className: "series-medium" },
    { key: "high", className: "series-high" },
    { key: "grip", className: "series-grip" },
  ];
  const seriesGroup = createSvgElement("g", {
    "clip-path": "url(#chart-plot-clip)",
  });
  for (const { key, className } of series) {
    seriesGroup.append(
      createSvgElement("path", {
        d: linePath(
          result,
          key,
          key === "grip" ? gripXScale : xScale,
          key === "grip" ? gripScale : yScale,
        ),
        class: `chart-series ${className}`,
      }),
    );
  }
  chart.append(seriesGroup);

  const cursor = createSvgElement("g", { class: "chart-cursor", visibility: "hidden" });
  const cursorLine = createSvgElement("line", {
    y1: margin.top,
    y2: height - margin.bottom,
  });
  const cursorBox = createSvgElement("rect", { width: 184, height: 118, rx: 3 });
  const cursorText = createSvgElement("text", { class: "cursor-text" });
  cursor.append(cursorLine, cursorBox, cursorText);
  chart.append(cursor);

  const overlay = createSvgElement("rect", {
    x: margin.left,
    y: margin.top,
    width: plotWidth,
    height: plotHeight,
    class: "chart-overlay",
  });
  chart.append(overlay);

  overlay.addEventListener("pointermove", (event) => {
    const bounds = chart.getBoundingClientRect();
    const svgX = ((event.clientX - bounds.left) / bounds.width) * width;
    const slip = ((svgX - margin.left) / plotWidth) * xMax;
    const index = Math.max(0, Math.min(result.points.length - 1, Math.round(slip / 0.6)));
    const point = result.points[index];
    if (!point) return;

    const x = xScale(point.slip);
    const boxX = x > width - margin.right - 205 ? x - 195 : x + 11;
    const boxY = margin.top + 10;
    cursor.setAttribute("visibility", "visible");
    cursorLine.setAttribute("x1", String(x));
    cursorLine.setAttribute("x2", String(x));
    cursorBox.setAttribute("x", String(boxX));
    cursorBox.setAttribute("y", String(boxY));
    cursorText.setAttribute("x", String(boxX + 12));
    cursorText.setAttribute("y", String(boxY + 22));
    cursorText.replaceChildren();

    const rows = [
      `SLIP  ${point.slip.toFixed(1)}`,
      `HIGH  ${Math.round(point.high).toLocaleString("en-US")}`,
      `MED   ${Math.round(point.medium).toLocaleString("en-US")}`,
      `LOW   ${Math.round(point.low).toLocaleString("en-US")}`,
      `GRIP  ${(point.grip * 100).toFixed(1)}%`,
    ];
    rows.forEach((row, rowIndex) => {
      const tspan = createSvgElement("tspan", {
        x: boxX + 12,
        dy: rowIndex === 0 ? 0 : 20,
      });
      tspan.textContent = row;
      cursorText.append(tspan);
    });
  });
  overlay.addEventListener("pointerleave", () => {
    cursor.setAttribute("visibility", "hidden");
  });
}

async function copyText(text: string, button: HTMLButtonElement): Promise<void> {
  const label = button.querySelector("span") ?? button;
  const original = label.textContent ?? "Copy";
  try {
    await navigator.clipboard.writeText(text);
    label.textContent = "Copied";
    button.classList.add("copied");
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
    label.textContent = "Copied";
    button.classList.add("copied");
  }
  window.setTimeout(() => {
    label.textContent = original;
    button.classList.remove("copied");
  }, 1_600);
}

const copyConfigButton = requiredElement<HTMLButtonElement>("#copy-config");
copyConfigButton.addEventListener("click", () =>
  copyText(configOutput.textContent ?? "", copyConfigButton),
);

const copyLeoButton = requiredElement<HTMLButtonElement>("#copy-leo");
copyLeoButton.addEventListener("click", () => copyText(LEO_FFB_CONFIG, copyLeoButton));

function render(): void {
  const result = simulate(parameters);
  parameters = result.parameters;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parameters));
  setControlValues();
  renderChart(result);

  configOutput.textContent = generateConfig(result.parameters);
  leoOutput.textContent = LEO_FFB_CONFIG;
  peakForce.textContent = Math.round(result.peak.force).toLocaleString("en-US");
  peakLoad.textContent = `${result.peak.load[0]?.toUpperCase()}${result.peak.load.slice(1)}`;
  peakSlip.textContent = result.peak.slip.toFixed(1);
  gainMode.textContent = result.parameters.autoGain ? "Auto" : "Manual";

  const limitPercent = (result.peak.force / CLIPPING_FORCE) * 100;
  limitUsage.textContent = `${Math.round(limitPercent)}%`;
  const isClipping = result.peak.force > CLIPPING_FORCE + 0.01;
  peakStatus.textContent = isClipping ? "CLIPPING" : "PEAK FORCE";
  peakStatus.classList.toggle("warning", isClipping);
  peakForce.classList.toggle("warning", isClipping);
}

render();

window.matchMedia("(max-width: 620px)").addEventListener("change", render);
