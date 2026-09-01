import { describe, expect, it } from "vitest";
import { uniqSorted } from "./QuestionMappingPage";

describe("uniqSorted", () => {
  it("membuang duplikat dan mengurutkan alfabetis", () => {
    expect(uniqSorted(["b", "a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("mengembalikan array kosong untuk input kosong", () => {
    expect(uniqSorted([])).toEqual([]);
  });
});
