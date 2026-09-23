import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllDrafts,
  clearDraft,
  countAnswered,
  questionnaireFingerprint,
  readDraft,
  relativeTime,
  saveDraft,
} from "./formDraft";

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

describe("saveDraft / readDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("roundtrip: draf yang disimpan bisa dibaca kembali dengan fingerprint yang sama", () => {
    const fp = questionnaireFingerprint(["q1", "q2"]);
    saveDraft("2020001", { q1: "jawaban" }, 2, fp);

    const draft = readDraft("2020001", fp);

    expect(draft?.answers).toEqual({ q1: "jawaban" });
    expect(draft?.currentSection).toBe(2);
  });

  it("draf alumni lain (NIM berbeda) tidak ikut terbaca -- isolasi per NIM", () => {
    const fp = questionnaireFingerprint(["q1"]);
    saveDraft("2020001", { q1: "a" }, 0, fp);

    expect(readDraft("2020002", fp)).toBeNull();
  });

  it("fingerprint tidak cocok (kuesioner berubah) -> draf diabaikan dan dihapus", () => {
    const fpLama = questionnaireFingerprint(["q1"]);
    const fpBaru = questionnaireFingerprint(["q1", "q2"]);
    saveDraft("2020001", { q1: "a" }, 0, fpLama);

    expect(readDraft("2020001", fpBaru)).toBeNull();
    // Sudah dihapus, bukan cuma diabaikan sekali baca.
    expect(readDraft("2020001", fpLama)).toBeNull();
  });

  it("draf lebih tua dari 30 hari dianggap basi dan diabaikan", () => {
    const fp = questionnaireFingerprint(["q1"]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    saveDraft("2020001", { q1: "a" }, 0, fp);

    vi.setSystemTime(new Date("2026-02-15T00:00:00Z")); // 45 hari kemudian
    const draft = readDraft("2020001", fp);
    vi.useRealTimers();

    expect(draft).toBeNull();
  });

  it("draf 29 hari (belum kedaluwarsa) masih terbaca", () => {
    const fp = questionnaireFingerprint(["q1"]);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    saveDraft("2020001", { q1: "a" }, 0, fp);

    vi.setSystemTime(new Date("2026-01-30T00:00:00Z")); // 29 hari kemudian
    const draft = readDraft("2020001", fp);
    vi.useRealTimers();

    expect(draft?.answers).toEqual({ q1: "a" });
  });

  it("JSON rusak di localStorage tidak melempar error, hanya dianggap tidak ada draf", () => {
    localStorage.setItem("tracer_form_draft:2020001", "{bukan json valid");

    expect(() => readDraft("2020001", "fp")).not.toThrow();
    expect(readDraft("2020001", "fp")).toBeNull();
  });

  it("nim kosong tidak pernah menyentuh localStorage (tidak nyasar ke key global)", () => {
    saveDraft("", { q1: "a" }, 0, "fp");
    expect(readDraft("", "fp")).toBeNull();
  });
});

describe("clearDraft / clearAllDrafts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clearDraft hanya menghapus draf NIM tersebut, bukan NIM lain", () => {
    const fp = questionnaireFingerprint(["q1"]);
    saveDraft("2020001", { q1: "a" }, 0, fp);
    saveDraft("2020002", { q1: "b" }, 0, fp);

    clearDraft("2020001");

    expect(readDraft("2020001", fp)).toBeNull();
    expect(readDraft("2020002", fp)?.answers).toEqual({ q1: "b" });
  });

  it("clearAllDrafts menghapus semua draf tapi tidak menyentuh key localStorage lain", () => {
    const fp = questionnaireFingerprint(["q1"]);
    saveDraft("2020001", { q1: "a" }, 0, fp);
    saveDraft("2020002", { q1: "b" }, 0, fp);
    localStorage.setItem("unrelated_key", "harus tetap ada");

    clearAllDrafts();

    expect(readDraft("2020001", fp)).toBeNull();
    expect(readDraft("2020002", fp)).toBeNull();
    expect(localStorage.getItem("unrelated_key")).toBe("harus tetap ada");
  });
});

describe("countAnswered", () => {
  it("menghitung jawaban terisi, mengabaikan null/undefined/string kosong/array kosong", () => {
    const count = countAnswered({
      q1: "jawaban",
      q2: "",
      q3: null,
      q4: undefined,
      q5: [],
      q6: ["a"],
      q7: 0, // angka 0 tetap dihitung terisi (bukan "kosong")
    });

    expect(count).toBe(3); // q1, q6, q7
  });

  it("objek jawaban kosong -> 0", () => {
    expect(countAnswered({})).toBe(0);
  });
});

describe("relativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("kurang dari 1 menit -> 'beberapa detik lalu'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:30Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z").getTime())).toBe("beberapa detik lalu");
  });

  it("dalam hitungan menit -> 'N menit lalu'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:05:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z").getTime())).toBe("5 menit lalu");
  });

  it("dalam hitungan jam -> 'N jam lalu'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T03:00:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z").getTime())).toBe("3 jam lalu");
  });

  it("tepat 1 hari -> 'kemarin', bukan '1 hari lalu'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T00:00:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z").getTime())).toBe("kemarin");
  });

  it("lebih dari 1 hari -> 'N hari lalu'", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-04T00:00:00Z"));
    expect(relativeTime(new Date("2026-01-01T00:00:00Z").getTime())).toBe("3 hari lalu");
  });
});
