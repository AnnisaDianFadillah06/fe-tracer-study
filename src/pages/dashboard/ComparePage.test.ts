import { describe, expect, it } from "vitest";
import { sortLabels, filterByTrendCategory } from "./ComparePage";

describe("sortLabels", () => {
  it("mengurutkan label secara alfabetis lewat localeCompare", () => {
    expect(sortLabels(["Nasional", "Lokal", "Multinasional"])).toEqual([
      "Lokal",
      "Multinasional",
      "Nasional",
    ]);
  });
});

describe("filterByTrendCategory", () => {
  it("menerapkan predikat yang diberikan", () => {
    const items = [{ v: 1 }, { v: 2 }, { v: 3 }];
    expect(filterByTrendCategory(items, (i) => i.v > 1)).toEqual([{ v: 2 }, { v: 3 }]);
  });

  it("mengembalikan array kosong saat predikat belum termuat (undefined)", () => {
    const items = [{ v: 1 }, { v: 2 }];
    expect(filterByTrendCategory(items, undefined)).toEqual([]);
  });
});
