import { describe, expect, it } from "vitest";
import { degreeColor, degreeLabel, DEGREES } from "./academic";

describe("degreeLabel", () => {
  it("jenjang dikenal memakai label panjang beraksen strip (D-III, bukan D3)", () => {
    expect(degreeLabel("D3")).toBe("D-III");
    expect(degreeLabel("S1")).toBe("S-1");
  });

  it("jenjang tidak dikenal dikembalikan apa adanya, tidak crash", () => {
    expect(degreeLabel("Diploma Asing")).toBe("Diploma Asing");
  });
});

describe("degreeColor", () => {
  it("jenjang yang sama selalu mendapat warna yang sama", () => {
    expect(degreeColor("D3")).toBe(degreeColor("D3"));
  });

  it("dua jenjang berbeda dalam DEGREES mendapat warna berbeda", () => {
    expect(degreeColor("D3")).not.toBe(degreeColor("D4"));
  });

  it("jenjang tidak dikenal (indexOf -1) fallback ke warna index 0, bukan error/undefined", () => {
    expect(degreeColor("Jenjang Asing")).toBe(degreeColor(DEGREES[0]));
  });
});
