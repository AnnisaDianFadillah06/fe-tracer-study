import { describe, expect, it } from "vitest";
import {
  buildColorMap,
  buildInsightColorMap,
  getSegmentColor,
  getShortLabel,
  measureDirection,
  rampColor,
  statusRamp,
  STATUS_COLORS,
} from "./chartColors";

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

describe("buildInsightColorMap", () => {
  it("seri tunggal memakai warna pertama palet netral, bukan pink fallback", () => {
    expect(buildInsightColorMap(["nilai"])).toEqual({ nilai: "var(--viz-1)" });
  });

  it("kategori nominal mendapat palet netral berurutan; label bermakna tetap", () => {
    expect(buildInsightColorMap(["D3", "Bekerja", "D4"])).toEqual({
      D3: "var(--viz-1)",
      Bekerja: "#10b981",
      D4: "var(--viz-2)",
    });
  });

  it("lebih dari lima seri berputar ke awal palet", () => {
    const map = buildInsightColorMap(["a", "b", "c", "d", "e", "f"]);
    expect(map.f).toBe("var(--viz-1)");
  });
});

describe("measureDirection", () => {
  it("ukuran yang makin tinggi makin baik", () => {
    expect(measureDirection("FactTracerStudy.count_terserap")).toBe("higher");
    expect(measureDirection("FactTracerStudy.agg_avg_take_home_pay")).toBe("higher");
    expect(measureDirection("FactRangeEvaluasi.avg_skor")).toBe("higher");
  });

  it("ukuran yang makin rendah makin baik", () => {
    expect(measureDirection("FactTracerStudy.avg_masa_tunggu_bekerja")).toBe("lower");
    expect(measureDirection("FactTracerStudy.agg_median_bulan_sesudah_lulus")).toBe("lower");
    expect(measureDirection("FactTracerStudy.count_tidak_sesuai_bidang")).toBe("lower");
  });

  it("jumlah, total, UMP, dan ukuran rumus netral", () => {
    expect(measureDirection("FactTracerStudy.count_alumni")).toBeNull();
    expect(measureDirection("FactTracerStudy.agg_sum_take_home_pay")).toBeNull();
    expect(measureDirection("FactTracerStudy.agg_avg_nilai_ump")).toBeNull();
    expect(measureDirection("rasio")).toBeNull();
  });
});

describe("statusRamp & rampColor", () => {
  it("arah menentukan ujung merah dan hijau", () => {
    expect(statusRamp("higher")).toEqual([STATUS_COLORS.buruk, STATUS_COLORS.sedang, STATUS_COLORS.baik]);
    expect(statusRamp("lower")?.[0]).toBe(STATUS_COLORS.baik);
    expect(statusRamp(null)).toBeNull();
  });

  it("interpolasi melewati warna tengah", () => {
    const ramp = statusRamp("higher")!;
    expect(rampColor(0, ramp)).toBe(STATUS_COLORS.buruk);
    expect(rampColor(0.5, ramp)).toBe(STATUS_COLORS.sedang);
    expect(rampColor(1, ramp)).toBe(STATUS_COLORS.baik);
    expect(rampColor(2, ramp)).toBe(STATUS_COLORS.baik);
  });
});
