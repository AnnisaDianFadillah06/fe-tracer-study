import { describe, expect, it } from "vitest";
import {
  availableStarters,
  addColumnDifference,
  applyPercent,
  chartPivotOf,
  buildPivot,
  describeDrillPoint,
  formatMeasure,
  isRunnable,
  measureLabelOf,
  type CatalogCube,
  describeQuestion,
  drillFilters,
  drillPointOf,
  minChartWidth,
  sameQuestion,
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
      expect(s.input.measures.length + (s.input.formulas?.length ?? 0)).toBeGreaterThan(0);
      expect(s.input.rowDims.length + (s.input.colDim ? 1 : 0)).toBeLessThanOrEqual(3);
    }
  });
});

describe("sameQuestion", () => {
  const base = {
    cube: "F",
    measures: ["F.count"],
    rowDims: ["D.jurusan"],
    colDim: null,
    filters: [{ member: "D.jenjang", values: ["D3"] }],
  };

  it("mengabaikan urutan kunci objek (jsonb menyusunnya ulang)", () => {
    const fromDb = JSON.parse(
      '{"cube":"F","colDim":null,"filters":[{"values":["D3"],"member":"D.jenjang"}],"rowDims":["D.jurusan"],"measures":["F.count"]}',
    );
    expect(sameQuestion(base, fromDb)).toBe(true);
  });

  it("membedakan isi yang benar-benar berubah", () => {
    expect(sameQuestion(base, { ...base, colDim: "D.tahun" })).toBe(false);
    expect(sameQuestion(base, { ...base, filters: [] })).toBe(false);
  });
});

describe("minChartWidth", () => {
  it("6 tahun × 6 status muat di kartu biasa tanpa digeser", () => {
    expect(minChartWidth(6, 6)).toBeLessThanOrEqual(800);
  });

  it("banyak kategori tetap diberi ruang dan boleh digeser", () => {
    expect(minChartWidth(67, 1)).toBeGreaterThan(2000);
  });

  it("tidak pernah lebih sempit dari 320px", () => {
    expect(minChartWidth(1, 1)).toBe(320);
  });
});

describe("drill-down", () => {
  it("titik dari baris dan kolom pivot", () => {
    expect(drillPointOf(["D.jurusan"], ["Akuntansi"], "D.tahun", "2022")).toEqual({
      "D.jurusan": "Akuntansi",
      "D.tahun": "2022",
    });
    expect(drillPointOf([], [], null, "")).toEqual({});
  });

  it("kelompok kosong tidak bisa di-drill", () => {
    expect(drillPointOf(["D.jurusan"], ["(kosong)"], null, "")).toBeNull();
    expect(drillPointOf(["D.jurusan"], ["Akuntansi"], "D.tahun", "(kosong)")).toBeNull();
  });

  it("nilai titik menggantikan saringan pada dimensi yang sama", () => {
    expect(
      drillFilters(
        [
          { member: "D.tahun", values: ["2021", "2022"] },
          { member: "D.jenjang", values: ["D3"] },
          { member: "D.status", values: [] },
        ],
        { "D.tahun": "2022", "D.jurusan": "Akuntansi" },
      ),
    ).toEqual([
      { member: "D.jenjang", operator: "equals", values: ["D3"] },
      { member: "D.tahun", operator: "equals", values: ["2022"] },
      { member: "D.jurusan", operator: "equals", values: ["Akuntansi"] },
    ]);
  });

  it("menjelaskan titik dengan label", () => {
    expect(describeDrillPoint({ "D.jurusan": "Akuntansi", "D.tahun": "2022" }, label)).toBe(
      "Jurusan Akuntansi · Tahun lulus 2022",
    );
    expect(describeDrillPoint({}, label)).toBe("Seluruh data");
  });
});

describe("olah hasil", () => {
  const measures = [
    { key: "F.count", label: "Jumlah alumni", format: "integer" as const },
    { key: "F.gaji", label: "Rata-rata gaji", format: "currency" as const },
  ];
  const result = {
    cube: "F",
    measures,
    dimensions: [
      { key: "D.jurusan", label: "Jurusan" },
      { key: "D.status", label: "Status" },
    ],
    rows: [
      { "D.jurusan": "A", "D.status": "Kerja", "F.count": 30, "F.gaji": 9 },
      { "D.jurusan": "A", "D.status": "Cari", "F.count": 10, "F.gaji": 5 },
      { "D.jurusan": "B", "D.status": "Kerja", "F.count": 20, "F.gaji": 8 },
      { "D.jurusan": "B", "D.status": "Cari", "F.count": 40, "F.gaji": 4 },
    ],
    row_count: 4,
    truncated: false,
  };
  const pivot = buildPivot(result, ["D.jurusan"], "D.status");
  const cell = (p: typeof pivot, row: number, col: string, key: string) => p.rows[row].cells[col][key].value;

  it("persen dari total baris = porsi status di tiap jurusan", () => {
    const { pivot: p, measures: m } = applyPercent(pivot, "row", measures);
    expect(cell(p, 0, "Kerja", "F.count")).toBe(75);
    expect(cell(p, 1, "Cari", "F.count")).toBeCloseTo(66.67, 2);
    expect(m.map((x) => x.format)).toEqual(["percent", "currency"]);
    // rata-rata tidak diubah
    expect(cell(p, 0, "Kerja", "F.gaji")).toBe(9);
    // totalnya dikosongkan
    expect(p.rows[0].totals["F.count"]).toBeNull();
  });

  it("persen dari total kolom dan keseluruhan", () => {
    expect(cell(applyPercent(pivot, "column", measures).pivot, 0, "Kerja", "F.count")).toBe(60);
    expect(cell(applyPercent(pivot, "all", measures).pivot, 1, "Cari", "F.count")).toBe(40);
  });

  it("tanpa mode persen pivot tidak disentuh", () => {
    expect(applyPercent(pivot, "none", measures).pivot).toBe(pivot);
  });

  it("selisih kolom B − A ditambahkan sebagai kolom hasil hitungan", () => {
    const p = addColumnDifference(pivot, { a: "Cari", b: "Kerja" }, measures);
    const key = "Selisih: Kerja − Cari";
    expect(p.columnKeys).toEqual(["Kerja", "Cari", key]);
    expect(p.derivedColumns).toEqual([key]);
    expect(cell(p, 0, key, "F.gaji")).toBe(4);
    expect(cell(p, 1, key, "F.count")).toBe(-20);
  });

  it("chart hanya menggambar kolom selisih bila ada", () => {
    const p = addColumnDifference(pivot, { a: "Cari", b: "Kerja" }, measures);
    expect(chartPivotOf(p).columnKeys).toEqual(["Selisih: Kerja − Cari"]);
    expect(chartPivotOf(pivot)).toBe(pivot);
  });

  it("selisih diabaikan kalau kolomnya tidak ada", () => {
    expect(addColumnDifference(pivot, { a: "X", b: "Kerja" }, measures)).toBe(pivot);
  });
});

describe("ukuran dari kolom angka & rumus", () => {
  const cube: CatalogCube = {
    key: "F",
    label: "",
    description: "",
    measures: [{ key: "F.count", label: "Jumlah alumni", format: "integer" }],
    numeric_columns: [
      {
        column: "gaji",
        label: "Gaji",
        format: "currency",
        functions: [{ fn: "avg", label: "Rata-rata", key: "F.agg_avg_gaji" }],
      },
      {
        column: "ump",
        label: "UMP provinsi",
        format: "currency",
        functions: [{ fn: "avg", label: "Rata-rata", key: "F.agg_avg_ump" }],
      },
    ],
    dimension_groups: [],
  };

  it("label ukuran dari kolom angka mengikuti peladen", () => {
    expect(measureLabelOf(cube, "F.agg_avg_gaji")).toBe("Rata-rata gaji");
    expect(measureLabelOf(cube, "F.agg_avg_ump")).toBe("Rata-rata UMP provinsi");
    expect(measureLabelOf(cube, "F.count")).toBe("Jumlah alumni");
    expect(
      measureLabelOf(cube, "rumus_1", [
        { key: "rumus_1", label: "Kelipatan", left: "a", op: "div", right: "b", format: "ratio" },
      ]),
    ).toBe("Kelipatan");
  });

  it("format persen dan berapa kali", () => {
    expect(formatMeasure(12.345, "percent")).toBe("12,3%");
    expect(formatMeasure(4.876, "ratio")).toBe("4,88×");
  });

  it("selisih nyaris nol tidak tampil sebagai -0", () => {
    expect(formatMeasure(-0.004, "decimal")).toBe("0,0");
    expect(formatMeasure(-0.02, "decimal")).toBe("-0,02");
  });

  it("pertanyaan berisi rumus saja tetap bisa dijalankan", () => {
    expect(
      isRunnable({
        cube: "F",
        measures: [],
        rowDims: [],
        colDim: null,
        filters: [],
        formulas: [{ key: "rumus_1", label: "x", left: "a", op: "div", right: "b", format: "ratio" }],
      }),
    ).toBe(true);
  });

  it("kalimat pertanyaan menyebut rumus, saringan, n minimum, dan urutan", () => {
    expect(
      describeQuestion(
        {
          cube: "F",
          measures: ["F.agg_avg_gaji"],
          rowDims: ["D.jurusan"],
          colDim: null,
          filters: [
            { member: "D.jenjang", operator: "notEquals", values: ["D3"] },
            { member: "D.tahun", operator: "set", values: [] },
          ],
          formulas: [{ key: "rumus_1", label: "Kelipatan gaji", left: "a", op: "div", right: "b", format: "ratio" }],
          minN: 30,
          sort: { by: "rumus_1", direction: "desc", limit: 10 },
        },
        (k) => measureLabelOf(cube, k),
        label,
      ),
    ).toBe(
      "Rata-rata gaji dan kelipatan gaji menurut Jurusan, Jenjang bukan D3, hanya yang punya data tahun lulus, " +
        "kelompok dengan responden < 30 disembunyikan, 10 tertinggi menurut kelipatan gaji",
    );
  });

  it("perubahan rumus atau olah hasil membuat pertanyaan dianggap berubah", () => {
    const base = { cube: "F", measures: ["F.count"], rowDims: [], colDim: null, filters: [] };
    expect(sameQuestion(base, { ...base, minN: null, percent: "none" })).toBe(true);
    expect(sameQuestion(base, { ...base, minN: 30 })).toBe(false);
    expect(sameQuestion(base, { ...base, percent: "row" })).toBe(false);
  });
});
