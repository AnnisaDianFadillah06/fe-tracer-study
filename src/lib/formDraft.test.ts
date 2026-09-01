import { describe, expect, it } from "vitest";
import { questionnaireFingerprint } from "./formDraft";

describe("questionnaireFingerprint", () => {
  it("mengurutkan questionIds secara alfabetis lewat localeCompare", () => {
    expect(questionnaireFingerprint(["q3", "q1", "q2"])).toBe(
      questionnaireFingerprint(["q1", "q2", "q3"]),
    );
  });

  it("membedakan sidik jari saat jumlah pertanyaan berbeda", () => {
    const a = questionnaireFingerprint(["q1", "q2"]);
    const b = questionnaireFingerprint(["q1", "q2", "q3"]);
    expect(a).not.toBe(b);
  });

  it("mengurutkan id non-ASCII secara konsisten (bukan sort default)", () => {
    const fingerprint = questionnaireFingerprint(["q_z", "q_a", "q_é"]);
    expect(fingerprint).toBe("3:q_a,q_é,q_z");
  });
});
