import { describe, expect, it } from "vitest";
import {
  EXCEL_FORCE_MAX,
  EXCEL_GRIP_SLIP_MAX,
  EXCEL_PRIMARY_SLIP_MAX,
  smoothPath,
} from "./chart";

describe("Excel chart rendering", () => {
  it("uses the workbook chart bounds", () => {
    expect(EXCEL_PRIMARY_SLIP_MAX).toBe(20);
    expect(EXCEL_GRIP_SLIP_MAX).toBe(30);
    expect(EXCEL_FORCE_MAX).toBe(13_000);
  });

  it("draws a smooth curve through every sample", () => {
    const path = smoothPath([
      { x: 0, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 1 },
    ]);

    expect(path).toBe(
      "M0.00,0.00 C0.17,0.33 0.67,1.83 1.00,2.00 C1.33,2.17 1.83,1.17 2.00,1.00",
    );
  });
});
