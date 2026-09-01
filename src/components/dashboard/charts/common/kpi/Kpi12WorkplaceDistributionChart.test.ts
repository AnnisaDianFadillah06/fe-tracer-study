import { describe, expect, it } from "vitest";
import { sortLabels } from "./Kpi12WorkplaceDistributionChart";

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
