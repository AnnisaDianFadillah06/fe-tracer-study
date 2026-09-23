import { describe, expect, it } from "vitest";
import { moveItem } from "./useInsightBoard";

describe("moveItem", () => {
  it("menukar kartu dengan tetangganya", () => {
    expect(moveItem([1, 2, 3], 2, -1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
  });

  it("tidak berubah di ujung atau untuk id yang tidak ada", () => {
    expect(moveItem([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 3, 1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 9, 1)).toEqual([1, 2, 3]);
  });
});
