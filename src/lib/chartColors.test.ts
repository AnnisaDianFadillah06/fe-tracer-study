import { describe, expect, it } from "vitest";
import { buildColorMap, getSegmentColor, getShortLabel } from "./chartColors";

describe("getSegmentColor", () => {
  it("label yang dikenal memakai warna tetap, mengabaikan fallbackIndex", () => {
    expect(getSegmentColor("Bekerja", 5)).toBe("#10b981");
  });

  it("label tidak dikenal jatuh ke FALLBACK_PALETTE berdasarkan index", () => {
    expect(getSegmentColor("Label Baru Random", 0)).toBe("#ec4899");
    expect(getSegmentColor("Label Baru Random", 1)).toBe("#eab308");
  });

  it("fallbackIndex di luar panjang palette dibungkus (modulo), bukan undefined", () => {
    // FALLBACK_PALETTE panjang 10; index 12 harus setara index 2 (12 % 10).
    expect(getSegmentColor("Label Asing", 12)).toBe(getSegmentColor("Label Lain", 2));
    expect(getSegmentColor("Label Asing", 12)).toBe("#6366f1");
  });
});

describe("buildColorMap", () => {
  it("label dikenal & tidak dikenal bercampur -- fallback index hanya maju untuk yang tidak dikenal", () => {
    const map = buildColorMap(["Bekerja", "Label Asing 1", "Erat", "Label Asing 2"]);

    expect(map["Bekerja"]).toBe("#10b981");
    expect(map["Erat"]).toBe("#22c55e");
    // Dua label asing dapat warna fallback berbeda & berurutan (index 0, 1)
    expect(map["Label Asing 1"]).toBe("#ec4899");
    expect(map["Label Asing 2"]).toBe("#eab308");
  });

  it("array label kosong menghasilkan map kosong", () => {
    expect(buildColorMap([])).toEqual({});
  });

  it("label duplikat tidak menghabiskan dua slot fallback (object key overwrite)", () => {
    const map = buildColorMap(["Asing", "Asing"]);
    // Hanya 1 entry karena key sama, tapi tetap tidak boleh throw.
    expect(Object.keys(map)).toHaveLength(1);
  });
});

describe("getShortLabel", () => {
  it("label OLAP long-form diterjemahkan ke label pendek", () => {
    expect(getShortLabel("Bekerja (full time / part time)")).toBe("Bekerja");
    expect(getShortLabel("Tidak kerja tetapi sedang mencari kerja")).toBe("Mencari Kerja");
  });

  it("label yang sudah pendek/tidak dikenal dikembalikan apa adanya", () => {
    expect(getShortLabel("Bekerja")).toBe("Bekerja");
    expect(getShortLabel("Label Asing")).toBe("Label Asing");
  });
});
