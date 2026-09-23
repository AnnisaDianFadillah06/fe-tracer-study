import { describe, expect, it } from "vitest";
import {
  availableStarters,
  describeQuestion,
  STARTER_QUESTIONS,
  toCsv,
  type ExplorerCatalog,
  type ExplorerResult,
} from "./olapExplorer";

const label = (key: string) =>
  ({
    "F.count": "Jumlah alumni",
    "F.gaji": "Rata-rata gaji",
    "D.jurusan": "Jurusan",
    "D.tahun": "Tahun lulus",
    "D.jenjang": "Jenjang",
  })[key] ?? key;

describe("describeQuestion", () => {
  it("menyusun kalimat dari ukuran, pengelompokan, dan saringan", () => {
    expect(
      describeQuestion(
        {
          cube: "F",
          measures: ["F.count", "F.gaji"],
          rowDims: ["D.jurusan"],
          colDim: "D.tahun",
          filters: [
            { member: "D.jenjang", values: ["D3", "D4"] },
            { member: "D.tahun", values: [] },
          ],
        },
        label,
        label,
      ),
    ).toBe(
      "Jumlah alumni dan rata-rata gaji menurut Jurusan dan Tahun lulus, hanya Jenjang: D3 / D4",
    );
  });

  it("tanpa ukuran tidak ada kalimat", () => {
    expect(
      describeQuestion(
        { cube: "F", measures: [], rowDims: [], colDim: null, filters: [] },
        label,
        label,
      ),
    ).toBe("");
  });
});

describe("toCsv", () => {
  it("memakai label sebagai judul, angka mentah, dan meng-escape koma/kutip", () => {
    const result: ExplorerResult = {
      cube: "F",
      measures: [{ key: "F.gaji", label: "Rata-rata gaji", format: "currency" }],
      dimensions: [{ key: "D.jurusan", label: "Jurusan" }],
      rows: [
        { "D.jurusan": 'Teknik "Sipil", Gedung', "F.gaji": "8907212.02" },
        { "D.jurusan": null, "F.gaji": null },
      ],
      row_count: 2,
      truncated: false,
    };

    expect(toCsv(result)).toBe(
      'Jurusan,Rata-rata gaji\n"Teknik ""Sipil"", Gedung",8907212.02\n,',
    );
  });
});

describe("availableStarters", () => {
  const catalog = (measures: string[], dims: string[]): ExplorerCatalog => ({
    cubes: [
      {
        key: "FactTracerStudy",
        label: "",
        description: "",
        measures: measures.map((key) => ({ key, label: key, format: "integer" })),
        dimension_groups: [{ group: "g", members: dims.map((key) => ({ key, label: key })) }],
      },
    ],
    limits: { max_dimensions: 3, max_measures: 4, max_rows: 5000 },
  });

  it("hanya menawarkan contoh yang seluruh member-nya ada di katalog", () => {
    const shown = availableStarters(
      catalog(["FactTracerStudy.count_alumni"], ["DimProdi.jurusan"]),
    );

    expect(shown.map((s) => s.title)).toEqual(["Berapa alumni di tiap jurusan?"]);
  });

  it("katalog tanpa cube yang cocok tidak menawarkan apa pun", () => {
    expect(availableStarters({ cubes: [], limits: { max_dimensions: 3, max_measures: 4, max_rows: 1 } })).toEqual([]);
  });

  it("setiap contoh bawaan memakai slot yang sah", () => {
    for (const s of STARTER_QUESTIONS) {
      expect(s.input.measures.length).toBeGreaterThan(0);
      expect(s.input.rowDims.length + (s.input.colDim ? 1 : 0)).toBeLessThanOrEqual(3);
    }
  });
});
