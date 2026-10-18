import { describe, expect, it } from "vitest";
import { EMPTY_VALUE, buildPivot, type ExplorerResult, type ExplorerRow } from "@/lib/olapExplorer";
import { MAX_3D_DEPTH, MAX_3D_X, build3DPlan, highlightOpacity } from "@/lib/olap3d";

const P = "DimProdi.prodi_jenjang";
const T = "DimAlumni.tahun_lulus";
const J = "DimProdi.jurusan";
const Jen = "DimProdi.jenjang";
const S = "DimAlumni.sumber_biaya";
const M = "FactTracerStudy.avg_take_home_pay";

const hasil = (rows: ExplorerRow[]): ExplorerResult => ({
  cube: "FactTracerStudy",
  measures: [{ key: M, label: "Rata-rata gaji", format: "currency" }],
  dimensions: [],
  rows,
  row_count: rows.length,
  truncated: false,
});

const plan3D = (rows: ExplorerRow[], rowDims: string[], colDim: string | null) => {
  const out = build3DPlan(buildPivot(hasil(rows), rowDims, colDim), rowDims, colDim, M);
  if ("reason" in out) throw new Error(out.reason);
  return out.plan;
};

describe("grafik batang 3D", () => {
  it("dua dimensi baris: Dimensi-1 di X, Dimensi-2 di kedalaman, tanpa pemutar", () => {
    const plan = plan3D(
      [
        { [P]: "D4 Kimia", [T]: "2021", [M]: 5 },
        { [P]: "D3 Akuntansi", [T]: "2019", [M]: 3 },
        { [P]: "D3 Akuntansi", [T]: "2021", [M]: 4 },
      ],
      [P, T],
      null,
    );

    expect([plan.xDim, plan.zDim, plan.frameDim]).toEqual([P, T, null]);
    expect(plan.frames).toHaveLength(1);
    expect(plan.frames[0].xCategories).toEqual(["D3 Akuntansi", "D4 Kimia"]);
    expect(plan.frames[0].zCategories).toEqual(["2019", "2021"]);
    expect(plan.frames[0].bars).toContainEqual({ x: 1, z: 1, value: 5, point: { [P]: "D4 Kimia", [T]: "2021" } });
    expect([plan.min, plan.max]).toEqual([3, 5]);
  });

  it("dimensi kolom ikut sebagai kedalaman", () => {
    const plan = plan3D([{ [J]: "Kimia", [T]: "2021", [M]: 5 }], [J], T);
    expect([plan.xDim, plan.zDim]).toEqual([J, T]);
    expect(plan.frames[0].bars[0].point).toEqual({ [J]: "Kimia", [T]: "2021" });
  });

  it("tiga dimensi: yang nilainya paling sedikit jadi pemutar, skala dikunci lintas bingkai", () => {
    const plan = plan3D(
      [
        { [J]: "Kimia", [Jen]: "D3", [S]: "Mandiri", [M]: 3 },
        { [J]: "Kimia", [Jen]: "D4", [S]: "Mandiri", [M]: 6 },
        { [J]: "Elektro", [Jen]: "D4", [S]: "Beasiswa", [M]: 4 },
        { [J]: "Mesin", [Jen]: "D3", [S]: "KIP", [M]: 2 },
      ],
      [J, Jen],
      S,
    );

    expect([plan.xDim, plan.zDim, plan.frameDim]).toEqual([J, S, Jen]);
    expect(plan.frames.map((f) => f.key)).toEqual(["D3", "D4"]);
    // Kategori per bingkai hanya yang ada datanya.
    expect(plan.frames[0].xCategories).toEqual(["Kimia", "Mesin"]);
    expect(plan.frames[1].xCategories).toEqual(["Elektro", "Kimia"]);
    // Titik drill membawa ketiga dimensi.
    expect(plan.frames[1].bars).toContainEqual({
      x: 1,
      z: 1,
      value: 6,
      point: { [J]: "Kimia", [Jen]: "D4", [S]: "Mandiri" },
    });
    expect([plan.min, plan.max]).toEqual([2, 6]);
  });

  it("kedalaman teks: terkecil di depan supaya batang tinggi tidak menutupi; tahun tetap kronologis", () => {
    const plan = plan3D(
      [
        { [T]: "2021", [S]: "Bekerja", [M]: 900 },
        { [T]: "2021", [S]: "Wiraswasta", [M]: 50 },
        { [T]: "2021", [S]: "Studi lanjut", [M]: 80 },
      ],
      [T, S],
      null,
    );
    expect(plan.frames[0].zCategories).toEqual(["Wiraswasta", "Studi lanjut", "Bekerja"]);

    const tahun = plan3D(
      [
        { [S]: "Bekerja", [T]: "2022", [M]: 1 },
        { [S]: "Bekerja", [T]: "2019", [M]: 9 },
      ],
      [S, T],
      null,
    );
    expect(tahun.frames[0].zCategories).toEqual(["2019", "2022"]);
  });

  it("nilai kosong tetap digambar dan bisa diklik sebagai Tidak ada data", () => {
    const plan = plan3D([{ [P]: null, [T]: "2021", [M]: 5 }], [P, T], null);
    expect(plan.frames[0].xCategories).toEqual([EMPTY_VALUE]);
    expect(plan.frames[0].bars[0].point).toEqual({ [P]: EMPTY_VALUE, [T]: "2021" });
  });

  it("menolak satu dimensi, lebih dari tiga, dan kategori yang terlalu banyak", () => {
    const pivot = buildPivot(hasil([{ [P]: "a", [M]: 1 }]), [P], null);
    expect(build3DPlan(pivot, [P], null, M).ok).toBe(false);
    expect(build3DPlan(pivot, [P, T, J], S, M).ok).toBe(false);

    const banyak = Array.from({ length: MAX_3D_X + 1 }, (_, i) => ({ [P]: `p${i}`, [T]: "2021", [M]: 1 }));
    expect(build3DPlan(buildPivot(hasil(banyak), [P, T], null), [P, T], null, M).ok).toBe(false);

    const dalam = Array.from({ length: MAX_3D_DEPTH + 1 }, (_, i) => ({ [P]: "a", [T]: `${2000 + i}`, [M]: 1 }));
    expect(build3DPlan(buildPivot(hasil(dalam), [P, T], null), [P, T], null, M).ok).toBe(false);
  });

  it("sorotan: satu baris X dan satu baris kedalaman tetap pekat", () => {
    expect(highlightOpacity({ x: 1, z: 1 }, null)).toBe(1);
    expect(highlightOpacity({ x: 2, z: 0 }, { x: 2, z: 5 })).toBe(1);
    expect(highlightOpacity({ x: 0, z: 5 }, { x: 2, z: 5 })).toBe(1);
    expect(highlightOpacity({ x: 0, z: 0 }, { x: 2, z: 5 })).toBeLessThan(0.5);
  });
});
