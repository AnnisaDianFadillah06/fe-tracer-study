import { describe, expect, it } from "vitest";
import { normalizeJenis, sortLabels } from "./Kpi12WorkplaceDistributionChart";

describe("sortLabels", () => {
  it("mengurutkan label secara alfabetis lewat localeCompare", () => {
    expect(sortLabels(["Nasional", "Lokal", "Multinasional"])).toEqual([
      "Lokal",
      "Multinasional",
      "Nasional",
    ]);
  });

  it("menerima Set sebagai input", () => {
    expect(sortLabels(new Set(["B", "A"]))).toEqual(["A", "B"]);
  });
});

describe("normalizeJenis", () => {
  it("memisahkan alumni yang tidak mengisi dari isian Lainnya", () => {
    expect(normalizeJenis("Tidak Mengisi")).toBe("Tidak Mengisi");
    expect(normalizeJenis("")).toBe("Tidak Mengisi");
    expect(normalizeJenis("0")).toBe("Tidak Mengisi");
    expect(normalizeJenis("Lainnya")).toBe("Lainnya");
    expect(normalizeJenis("Lainnya, tuliskan")).toBe("Lainnya");
  });

  it("memetakan label resmi ke nama tampilan", () => {
    expect(normalizeJenis("Perusahaan swasta")).toBe("Perusahaan Swasta");
    expect(normalizeJenis("BUMN/BUMD")).toBe("BUMN/BUMD");
  });
});
