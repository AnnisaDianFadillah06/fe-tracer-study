import { describe, expect, it } from "vitest";
import {
  applyViz,
  availableViz,
  comboSeries,
  diceInput,
  rollUpInput,
  sliceInput,
  swapRowsColumns,
  toComboData,
  SINGLE_COLUMN,
  buildFacets,
  buildNestedPlan,
  buildPivot,
  canHeatmap,
  canScatter,
  filledSeriesPerBar,
  heatIntensity,
  heatScale,
  median,
  preferHeatmap,
  sortColumns,
  toScatterPoints,
  MAX_HEATMAP_COLUMNS,
  MAX_HEATMAP_ROWS,
  isNestedIn,
  nestedId,
  toNestedChartData,
  MAX_NESTED_CATEGORIES,
  MAX_NESTED_GROUPS,
  canTotal,
  chartSeriesNames,
  chooseChartKind,
  decideChart,
  formatMeasure,
  isRunnable,
  toChartData,
  toRequestBody,
  type CatalogMeasure,
  type ExplorerResult,
} from "./olapExplorer";

const measureCount = { key: "F.count_alumni", label: "Jumlah Alumni", format: "integer" as const };
const measureAvg = { key: "F.avg_masa_tunggu", label: "Rata-rata", format: "decimal" as const };

function hasil(
  rows: ExplorerResult["rows"],
  measures: CatalogMeasure[] = [measureCount],
): ExplorerResult {
  return {
    cube: "FactTracerStudy",
    measures,
    dimensions: [
      { key: "DimProdi.nama_prodi", label: "Nama Program Studi" },
      { key: "DimAlumni.tahun_lulus", label: "Tahun Lulus" },
    ],
    rows,
    row_count: rows.length,
    truncated: false,
  };
}

describe("chooseChartKind", () => {
  it("tanpa dimensi menampilkan angka tunggal", () => {
    expect(chooseChartKind([], null)).toBe("number");
  });

  it("satu dimensi biasa jadi bar", () => {
    expect(chooseChartKind(["DimProdi.nama_prodi"], null)).toBe("bar");
  });

  it("satu dimensi tahun lulus jadi line", () => {
    expect(chooseChartKind(["DimAlumni.tahun_lulus"], null)).toBe("line");
  });

  it("dimensi kolom tunggal juga menentukan tipe", () => {
    expect(chooseChartKind([], "DimAlumni.tahun_lulus")).toBe("line");
  });

  it("dua dimensi jadi grouped bar", () => {
    expect(chooseChartKind(["DimProdi.nama_prodi"], "DimAlumni.tahun_lulus")).toBe("grouped-bar");
  });

  it("tiga dimensi tidak digambar", () => {
    expect(
      chooseChartKind(["DimProdi.nama_prodi", "DimProdi.jenjang"], "DimAlumni.tahun_lulus"),
    ).toBe("none");
  });
});

describe("buildPivot", () => {
  const rows = [
    { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 10 },
    { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2024", "F.count_alumni": 15 },
    { "DimProdi.nama_prodi": "TE", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 7 },
  ];

  it("menyusun baris dan kolom", () => {
    const pivot = buildPivot(hasil(rows), ["DimProdi.nama_prodi"], "DimAlumni.tahun_lulus");

    expect(pivot.columnKeys).toEqual(["2023", "2024"]);
    expect(pivot.rows.map((r) => r.keys[0])).toEqual(["TI", "TE"]);
    expect(pivot.rows[0].cells["2024"]["F.count_alumni"].value).toBe(15);
  });

  it("sel yang tidak ada di hasil tetap kosong, bukan nol", () => {
    const pivot = buildPivot(hasil(rows), ["DimProdi.nama_prodi"], "DimAlumni.tahun_lulus");

    // TE tidak punya baris 2024 sama sekali.
    expect(pivot.rows[1].cells["2024"]).toBeUndefined();
  });

  it("menghitung subtotal baris, kolom, dan total keseluruhan", () => {
    const pivot = buildPivot(hasil(rows), ["DimProdi.nama_prodi"], "DimAlumni.tahun_lulus");

    expect(pivot.rows[0].totals["F.count_alumni"]).toBe(25);
    expect(pivot.rows[1].totals["F.count_alumni"]).toBe(7);
    expect(pivot.columnTotals["2023"]["F.count_alumni"]).toBe(17);
    expect(pivot.columnTotals["2024"]["F.count_alumni"]).toBe(15);
    expect(pivot.grandTotals["F.count_alumni"]).toBe(32);
  });

  it("tidak menjumlahkan rata-rata", () => {
    const avgRows = [
      { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2023", "F.avg_masa_tunggu": 4 },
      { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2024", "F.avg_masa_tunggu": 6 },
    ];

    const pivot = buildPivot(
      hasil(avgRows, [measureAvg]),
      ["DimProdi.nama_prodi"],
      "DimAlumni.tahun_lulus",
    );

    expect(pivot.rows[0].totals["F.avg_masa_tunggu"]).toBeNull();
    expect(pivot.grandTotals["F.avg_masa_tunggu"]).toBeNull();
  });

  it("baris yang seluruh selnya kosong menghasilkan null, bukan nol", () => {
    const kosong = [
      { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": null },
    ];

    const pivot = buildPivot(hasil(kosong), ["DimProdi.nama_prodi"], "DimAlumni.tahun_lulus");

    expect(pivot.rows[0].totals["F.count_alumni"]).toBeNull();
  });

  it("nilai dimensi kosong diberi label, bukan dibuang", () => {
    const adaNull = [
      { "DimProdi.nama_prodi": null, "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 3 },
    ];

    const pivot = buildPivot(hasil(adaNull), ["DimProdi.nama_prodi"], "DimAlumni.tahun_lulus");

    expect(pivot.rows[0].keys[0]).toBe("(kosong)");
  });

  it("tanpa dimensi kolom memakai satu kolom penanda", () => {
    const pivot = buildPivot(hasil(rows), ["DimProdi.nama_prodi"], null);

    expect(pivot.columnKeys).toEqual([SINGLE_COLUMN]);
    // TI muncul dua kali di hasil (2023 & 2024); tanpa dimensi kolom keduanya
    // jatuh ke sel yang sama dan yang terakhir menang — backend tidak akan
    // mengirim bentuk ini, tapi pivotnya tetap tidak boleh pecah.
    expect(pivot.rows).toHaveLength(2);
  });
});

describe("buildFacets", () => {
  const rows = [
    { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 10 },
    { "DimProdi.nama_prodi": "TE", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 7 },
    { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2024", "F.count_alumni": 15 },
  ];

  it("satu dimensi baris menghasilkan satu panel tunggal", () => {
    const p = buildFacets(hasil(rows), ["DimProdi.nama_prodi"], null);

    expect(p.facets).toHaveLength(1);
    expect(p.facets[0].key).toBe(SINGLE_COLUMN);
    expect(p.facetDim).toBeNull();
  });

  /**
   * Yang jadi panel adalah dimensi dengan nilai paling SEDIKIT, bukan slot
   * "Baris kedua". Di sini tahun lulus punya 2 nilai dan prodi punya 2 juga,
   * jadi seri diuji terpisah di bawah.
   */
  it("dimensi dengan nilai paling sedikit yang jadi panel", () => {
    const banyakProdi = [
      { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 1 },
      { "DimProdi.nama_prodi": "TE", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 1 },
      { "DimProdi.nama_prodi": "TK", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 1 },
      { "DimProdi.nama_prodi": "TS", "DimAlumni.tahun_lulus": "2024", "F.count_alumni": 1 },
    ];

    // Prodi disebut lebih dulu, tapi tahun lulus yang nilainya lebih sedikit.
    const p = buildFacets(
      hasil(banyakProdi),
      ["DimProdi.nama_prodi", "DimAlumni.tahun_lulus"],
      null,
    );

    expect(p.facetDim).toBe("DimAlumni.tahun_lulus");
    expect(p.xDim).toBe("DimProdi.nama_prodi");
    expect(p.facets.map((x) => x.key)).toEqual(["2023", "2024"]);
  });

  it("tiap panel hanya dipecah oleh dimensi sumbu X", () => {
    const p = buildFacets(
      hasil(rows),
      ["DimProdi.nama_prodi", "DimAlumni.tahun_lulus"],
      null,
    );

    expect(p.facets[0].pivot.rows.map((r) => r.keys[0])).toEqual(["TI", "TE"]);
    expect(p.facets[1].pivot.rows.map((r) => r.keys[0])).toEqual(["TI"]);
  });

  it("nilai panel yang kosong tetap diberi label", () => {
    const p = buildFacets(
      hasil([{ "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": null, "F.count_alumni": 1 }]),
      ["DimProdi.nama_prodi", "DimAlumni.tahun_lulus"],
      null,
    );

    expect(p.facets[0].key).toBe("(kosong)");
  });
});

describe("decideChart", () => {
  /** Panel-panel buatan: `panel` panel, masing-masing `kategori` kategori. */
  function facetsDengan(panel: number, kategori: number, seri = 1) {
    const rows = [];
    for (let p = 0; p < panel; p++) {
      for (let k = 0; k < kategori; k++) {
        for (let sr = 0; sr < seri; sr++) {
          rows.push({
            "DimProdi.nama_prodi": `K${k}`,
            "DimProdi.jenjang": `P${p}`,
            "DimAlumni.tahun_lulus": `${2000 + sr}`,
            "F.count_alumni": 1,
          });
        }
      }
    }
    const rowDims =
      panel > 1 ? ["DimProdi.nama_prodi", "DimProdi.jenjang"] : ["DimProdi.nama_prodi"];
    const colDim = seri > 1 ? "DimAlumni.tahun_lulus" : null;

    return { rowDims, colDim, plan: buildFacets(hasil(rows), rowDims, colDim) };
  }

  it("satu dimensi tetap chart tunggal", () => {
    const { rowDims, colDim, plan } = facetsDengan(1, 10);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.kind).toBe("bar");
    expect(d.faceted).toBe(false);
  });

  /**
   * Inti fitur ini: tiga dimensi dulu tidak digambar sama sekali, sekarang
   * jadi beberapa panel yang masing-masing chart dua dimensi biasa.
   */
  it("tiga dimensi jadi panel, bukan ditolak", () => {
    const { rowDims, colDim, plan } = facetsDengan(4, 5, 3);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.faceted).toBe(true);
    expect(d.kind).toBe("grouped-bar");
    expect(d.reason).toBeUndefined();
  });

  it("dua dimensi baris juga jadi panel", () => {
    const { rowDims, colDim, plan } = facetsDengan(3, 5);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.faceted).toBe(true);
    expect(plan.facets).toHaveLength(3);
  });

  /**
   * Yang menentukan jumlah panel adalah dimensi dengan nilai paling sedikit,
   * jadi penolakan baru terjadi kalau KEDUA dimensi barisnya sama-sama banyak.
   */
  it("memilih dimensi yang lebih sedikit jadi panel, bukan menolak", () => {
    const { rowDims, colDim, plan } = facetsDengan(20, 3);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.kind).toBe("bar");
    expect(d.faceted).toBe(true);
    expect(plan.facets).toHaveLength(3);
  });

  it("menolak kalau kedua dimensi baris sama-sama banyak", () => {
    const { rowDims, colDim, plan } = facetsDengan(20, 20);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.kind).toBe("none");
    expect(d.reason).toContain("20 panel");
  });

  /**
   * Banyak kategori bukan lagi alasan menolak — chart-nya digeser mendatar.
   * Yang dulu ditolak di sini sekarang harus digambar.
   */
  it("panel dengan banyak kategori tetap digambar", () => {
    const { rowDims, colDim, plan } = facetsDengan(2, 40);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.kind).toBe("bar");
    expect(d.faceted).toBe(true);
  });

  it("menolak kalau serinya terlalu banyak", () => {
    const { rowDims, colDim, plan } = facetsDengan(1, 3, 20);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.kind).toBe("none");
    expect(d.reason).toContain("20 seri");
  });

  it("chart tunggal dengan 67 kategori tetap digambar", () => {
    const { rowDims, colDim, plan } = facetsDengan(1, 67);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.kind).toBe("bar");
    expect(d.faceted).toBe(false);
  });

  it("menolak hanya kalau kategorinya benar-benar di luar akal", () => {
    const { rowDims, colDim, plan } = facetsDengan(1, 250);
    const d = decideChart(rowDims, colDim, plan);

    expect(d.kind).toBe("none");
    expect(d.reason).toContain("250 kelompok");
  });

  it("tanpa dimensi tetap jadi kartu angka", () => {
    const plan = buildFacets(hasil([{ "F.count_alumni": 5 }]), [], null);
    const d = decideChart([], null, plan);

    expect(d.kind).toBe("number");
    expect(d.faceted).toBe(false);
  });
});

describe("toChartData", () => {
  it("memetakan kolom jadi seri", () => {
    const rows = [
      { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2023", "F.count_alumni": 10 },
      { "DimProdi.nama_prodi": "TI", "DimAlumni.tahun_lulus": "2024", "F.count_alumni": 15 },
    ];
    const pivot = buildPivot(hasil(rows), ["DimProdi.nama_prodi"], "DimAlumni.tahun_lulus");

    expect(toChartData(pivot, "F.count_alumni")).toEqual([
      { name: "TI", "2023": 10, "2024": 15 },
    ]);
    expect(chartSeriesNames(pivot)).toEqual(["2023", "2024"]);
  });

  it("tanpa dimensi kolom memakai satu seri bernama nilai", () => {
    const rows = [{ "DimProdi.nama_prodi": "TI", "F.count_alumni": 10 }];
    const pivot = buildPivot(hasil(rows), ["DimProdi.nama_prodi"], null);

    expect(toChartData(pivot, "F.count_alumni")).toEqual([{ name: "TI", nilai: 10 }]);
    expect(chartSeriesNames(pivot)).toEqual(["nilai"]);
  });
});

describe("toRequestBody", () => {
  it("menggabungkan dimensi baris lalu kolom", () => {
    const body = toRequestBody({
      cube: "FactTracerStudy",
      measures: ["F.count_alumni"],
      rowDims: ["DimProdi.nama_prodi"],
      colDim: "DimAlumni.tahun_lulus",
      filters: [],
    });

    expect(body.dimensions).toEqual(["DimProdi.nama_prodi", "DimAlumni.tahun_lulus"]);
  });

  it("membuang filter tanpa nilai", () => {
    const body = toRequestBody({
      cube: "FactTracerStudy",
      measures: ["F.count_alumni"],
      rowDims: [],
      colDim: null,
      filters: [
        { member: "DimProdi.jenjang", values: [] },
        { member: "DimAlumni.tahun_lulus", values: ["2024"] },
      ],
    });

    expect(body.filters).toEqual([
      { member: "DimAlumni.tahun_lulus", operator: "equals", values: ["2024"] },
    ]);
  });

  it("saringan ada nilainya/kosong dikirim tanpa nilai; rumus, n minimum, urutan ikut", () => {
    const body = toRequestBody({
      cube: "F",
      measures: [],
      rowDims: ["D.prov"],
      colDim: "D.tahun",
      filters: [
        { member: "D.ump", operator: "set", values: ["sisa"] },
        { member: "D.jenjang", operator: "notEquals", values: ["D3"] },
      ],
      formulas: [{ key: "rumus_1", label: "x", left: "F.a", op: "div", right: "F.b", format: "ratio" }],
      minN: 30,
      sort: { by: "rumus_1", direction: "desc", limit: 10 },
      percent: "row",
      diff: { a: "2020", b: "2021" },
    });

    expect(body).toEqual({
      cube: "F",
      measures: [],
      dimensions: ["D.prov", "D.tahun"],
      filters: [
        { member: "D.ump", operator: "set", values: [] },
        { member: "D.jenjang", operator: "notEquals", values: ["D3"] },
      ],
      formulas: [{ key: "rumus_1", label: "x", left: "F.a", op: "div", right: "F.b", format: "ratio" }],
      min_n: 30,
      sort: { by: "rumus_1", direction: "desc", limit: 10 },
      column_dimension: "D.tahun",
    });
  });
});

describe("isRunnable", () => {
  const dasar = { cube: "FactTracerStudy", rowDims: [], colDim: null, filters: [] };

  it("butuh minimal satu measure", () => {
    expect(isRunnable({ ...dasar, measures: [] })).toBe(false);
    expect(isRunnable({ ...dasar, measures: ["F.count_alumni"] })).toBe(true);
  });
});

describe("formatMeasure", () => {
  it("nilai kosong jadi tanda pisah", () => {
    expect(formatMeasure(null, "integer")).toBe("—");
  });

  it("cacah tanpa desimal", () => {
    expect(formatMeasure(1234, "integer")).toBe("1.234");
  });

  it("desimal dipertahankan", () => {
    expect(formatMeasure(4.5, "decimal")).toBe("4,5");
  });

  it("rupiah diberi lambang", () => {
    expect(formatMeasure(5000000, "currency")).toContain("Rp");
  });
});

describe("canTotal", () => {
  it("hanya cacah yang boleh dijumlahkan", () => {
    expect(canTotal("integer")).toBe(true);
    expect(canTotal("decimal")).toBe(false);
    expect(canTotal("currency")).toBe(false);
  });
});

describe("availableViz / applyViz", () => {
  const bar = { kind: "bar", faceted: false } as const;

  it("angka tunggal tidak punya pilihan visualisasi", () => {
    expect(availableViz({ kind: "number", faceted: false }, 1, 1)).toEqual([]);
  });

  it("satu seri: pai tersedia, batang bertumpuk tidak", () => {
    const opts = availableViz(bar, 1, 5);
    expect(opts).toContain("pie");
    expect(opts).not.toContain("stacked");
  });

  it("banyak seri: bertumpuk tersedia, pai tidak", () => {
    const opts = availableViz({ kind: "grouped-bar", faceted: false }, 3, 5);
    expect(opts).toContain("stacked");
    expect(opts).not.toContain("pie");
  });

  it("pai disembunyikan bila irisannya terlalu banyak", () => {
    expect(availableViz(bar, 1, 40)).not.toContain("pie");
  });

  it("chart yang ditolak (ada alasan) hanya boleh otomatis atau tabel", () => {
    expect(availableViz({ kind: "none", faceted: false, reason: "terlalu banyak" }, 1, 300)).toEqual([
      "auto",
      "table",
    ]);
  });

  it("otomatis mengembalikan keputusan asli", () => {
    expect(applyViz(bar, "auto", 1, 5)).toBe(bar);
    expect(applyViz(bar, undefined, 1, 5)).toBe(bar);
  });

  it("tabel = tanpa chart dan tanpa alasan", () => {
    expect(applyViz(bar, "table", 1, 5)).toEqual({ kind: "none", faceted: false });
  });

  it("batang dengan banyak seri menjadi batang berkelompok", () => {
    expect(applyViz(bar, "bar", 3, 5).kind).toBe("grouped-bar");
    expect(applyViz(bar, "bar", 1, 5).kind).toBe("bar");
  });

  it("pilihan yang tidak lagi tersedia jatuh ke otomatis", () => {
    expect(applyViz(bar, "pie", 3, 5)).toBe(bar);
    expect(applyViz(bar, "stacked", 1, 5)).toBe(bar);
  });
});

describe("semua ukuran dalam satu eksekusi (combo)", () => {
  const bar = { kind: "bar", faceted: false } as const;
  const m = (key: string, format: "integer" | "currency" | "decimal") => ({ key, label: key, format }) as never;

  it("otomatis tidak memilih combo (tampilan lama tetap); combo hanya lewat pilihan manual", () => {
    expect(applyViz(bar, "auto", 1, 5, 2)).toBe(bar);
    expect(applyViz(bar, "combo", 1, 5, 2).kind).toBe("combo");
    expect(applyViz(bar, "combo", 1, 5, 1)).toBe(bar);
  });

  it("tidak combo bila ada dimensi kolom (banyak seri) atau berpanel", () => {
    expect(applyViz(bar, "auto", 3, 5, 2)).toBe(bar);
    expect(applyViz({ kind: "bar", faceted: true }, "auto", 1, 5, 2).kind).toBe("bar");
    expect(availableViz(bar, 3, 5, 2)).not.toContain("combo");
    expect(availableViz(bar, 1, 5, 2)).toContain("combo");
  });

  it("ukuran berbeda satuan ke sumbu kanan sebagai garis", () => {
    const s = comboSeries([m("a", "integer"), m("b", "currency"), m("c", "integer")]);
    expect(s.map((x) => [x.axis, x.shape])).toEqual([
      ["left", "bar"],
      ["right", "line"],
      ["left", "bar"],
    ]);
    expect(s.map((x) => x.dataKey)).toEqual(["m0", "m1", "m2"]);
  });

  it("toComboData mengisi satu kolom per ukuran", () => {
    const pivot = {
      columnKeys: [""],
      rows: [{ keys: ["TI"], cells: { "": { a: { value: 3 }, b: { value: 9 } } }, totals: {} }],
      columnTotals: {},
      grandTotals: {},
    } as never;
    const data = toComboData(pivot, comboSeries([m("a", "integer"), m("b", "currency")]));
    expect(data).toEqual([{ name: "TI", m0: 3, m1: 9 }]);
  });
});

describe("swapRowsColumns", () => {
  const base = { cube: "c", measures: ["x"], filters: [] };

  it("menukar Baris pertama dengan Kolom", () => {
    const out = swapRowsColumns({ ...base, rowDims: ["A", "B"], colDim: "C" });
    expect(out.rowDims).toEqual(["C", "B"]);
    expect(out.colDim).toBe("A");
  });

  it("tidak berubah bila salah satunya kosong", () => {
    const a = { ...base, rowDims: ["A"], colDim: null };
    expect(swapRowsColumns(a)).toBe(a);
  });
});

describe("slice, dice, roll-up", () => {
  const base = { cube: "c", measures: ["x"], colDim: null, filters: [] };

  it("slice menyaring ke satu titik dan menggantikan saringan lama pada dimensi itu", () => {
    const out = sliceInput(
      { ...base, rowDims: ["J"], filters: [{ member: "J", operator: "equals", values: ["A", "B"] }] },
      { J: "A" },
    );
    expect(out.filters).toEqual([{ member: "J", operator: "equals", values: ["A"] }]);
  });

  it("dice menggabungkan nilai dari beberapa titik per dimensi", () => {
    const out = diceInput({ ...base, rowDims: ["J", "T"] }, [
      { J: "A", T: "2021" },
      { J: "B", T: "2021" },
    ]);
    expect(out.filters).toEqual([
      { member: "J", operator: "equals", values: ["A", "B"] },
      { member: "T", operator: "equals", values: ["2021"] },
    ]);
  });

  it("roll-up membalik drill-down: lepas dimensi terakhir dan saringan induknya", () => {
    const drilled = {
      ...base,
      rowDims: ["J", "P"],
      filters: [{ member: "J", operator: "equals" as const, values: ["A"] }],
    };
    const up = rollUpInput(drilled);
    expect(up?.rowDims).toEqual(["J"]);
    expect(up?.filters).toEqual([]);
  });

  it("roll-up satu dimensi melepas saringan aktif terakhir; kosong = null", () => {
    const f1 = { member: "T", operator: "equals" as const, values: ["2021"] };
    const f2 = { member: "S", operator: "equals" as const, values: ["Bekerja"] };
    expect(rollUpInput({ ...base, rowDims: ["J"], filters: [f1, f2] })?.filters).toEqual([f1]);
    expect(rollUpInput({ ...base, rowDims: ["J"] })).toBeNull();
  });
});

describe("sumbu X bertingkat", () => {
  const J = "DimProdi.jurusan";
  const P = "DimProdi.nama_prodi";
  const G = "DimProdi.jenjang";
  const T = "DimAlumni.tahun_lulus";

  const baris = (j: string, p: string, g: string, n: number) => ({
    [J]: j,
    [P]: p,
    [G]: g,
    "F.count_alumni": n,
  });

  /** Jurusan → prodi: tiap prodi hanya milik satu jurusan. */
  const hierarki = [
    baris("Teknik Sipil", "Konstruksi Gedung", "D3", 5),
    baris("Teknik Kimia", "Analis Kimia", "D3", 3),
    baris("Teknik Sipil", "Jalan", "D4", 4),
    baris("Teknik Kimia", "Teknik Kimia", "D4", 2),
    baris("Teknik Kimia", "Analis Kimia", "D4", 1),
  ];

  describe("isNestedIn", () => {
    it("prodi bergantung pada jurusan", () => {
      expect(isNestedIn(hierarki, J, P)).toBe(true);
    });

    it("jurusan tidak bergantung pada prodi bila satu jurusan punya beberapa prodi", () => {
      expect(isNestedIn(hierarki, P, J)).toBe(false);
    });

    it("jenjang bukan anak jurusan (muncul di beberapa jurusan)", () => {
      expect(isNestedIn(hierarki, J, G)).toBe(false);
    });

    it("nilai kosong dihitung sebagai (kosong)", () => {
      const rows = [
        { [J]: "A", [P]: null },
        { [J]: "B", [P]: null },
      ];
      expect(isNestedIn(rows, J, P)).toBe(false);
    });
  });

  describe("buildNestedPlan", () => {
    it("bukan dua dimensi baris → null", () => {
      expect(buildNestedPlan(hasil(hierarki), [J], G)).toBeNull();
      expect(buildNestedPlan(hasil(hierarki), [], null)).toBeNull();
    });

    it("induk hierarki jadi luar walau disebut di slot kedua", () => {
      const plan = buildNestedPlan(hasil(hierarki), [P, J], G)!;
      expect(plan.outerDim).toBe(J);
      expect(plan.innerDim).toBe(P);
      expect(plan.hierarchical).toBe(true);
    });

    it("bukan hierarki: dimensi bernilai lebih sedikit jadi luar", () => {
      const rows = [
        { [T]: "2021", [G]: "D3", "F.count_alumni": 1 },
        { [T]: "2022", [G]: "D3", "F.count_alumni": 1 },
        { [T]: "2023", [G]: "D3", "F.count_alumni": 1 },
        { [T]: "2021", [G]: "D4", "F.count_alumni": 1 },
        { [T]: "2022", [G]: "D4", "F.count_alumni": 1 },
      ];
      const plan = buildNestedPlan(hasil(rows), [T, G], null)!;
      expect(plan.outerDim).toBe(G);
      expect(plan.hierarchical).toBe(false);
    });

    it("jumlah nilai sama dan bukan hierarki: slot pertama jadi luar", () => {
      const rows = [
        { [T]: "2021", [G]: "D3", "F.count_alumni": 1 },
        { [T]: "2022", [G]: "D4", "F.count_alumni": 1 },
        { [T]: "2021", [G]: "D4", "F.count_alumni": 1 },
        { [T]: "2022", [G]: "D3", "F.count_alumni": 1 },
      ];
      expect(buildNestedPlan(hasil(rows), [G, T], null)!.outerDim).toBe(G);
      expect(buildNestedPlan(hasil(rows), [T, G], null)!.outerDim).toBe(T);
    });

    it("baris pivot dikelompokkan per luar, urutan di dalam kelompok mengikuti hasil query", () => {
      const plan = buildNestedPlan(hasil(hierarki), [J, P], G)!;
      expect(plan.pivot.rows.map((r) => r.keys)).toEqual([
        ["Teknik Kimia", "Analis Kimia"],
        ["Teknik Kimia", "Teknik Kimia"],
        ["Teknik Sipil", "Konstruksi Gedung"],
        ["Teknik Sipil", "Jalan"],
      ]);
      expect(plan.pivot.columnKeys).toEqual(["D3", "D4"]);
    });

    it("kelompok tahun lulus diurutkan sebagai angka", () => {
      const rows = ["2010", "2009", "2020"].map((t) => ({ [T]: t, [P]: `P${t}`, "F.count_alumni": 1 }));
      const plan = buildNestedPlan(hasil(rows), [T, P], null)!;
      expect(plan.groups.map((g) => g.key)).toEqual(["2009", "2010", "2020"]);
    });

    it("daftar kelompok menunjuk batang pertama dan terakhirnya", () => {
      const plan = buildNestedPlan(hasil(hierarki), [J, P], G)!;
      expect(plan.groups).toEqual([
        {
          key: "Teknik Kimia",
          firstId: nestedId("Teknik Kimia", "Analis Kimia"),
          lastId: nestedId("Teknik Kimia", "Teknik Kimia"),
        },
        {
          key: "Teknik Sipil",
          firstId: nestedId("Teknik Sipil", "Konstruksi Gedung"),
          lastId: nestedId("Teknik Sipil", "Jalan"),
        },
      ]);
    });
  });

  describe("toNestedChartData", () => {
    it("satu spacer di antara kelompok, tidak di awal dan akhir", () => {
      const plan = buildNestedPlan(hasil(hierarki), [J, P], G)!;
      const data = toNestedChartData(plan, "F.count_alumni");
      expect(data.map((d) => d.rowIndex)).toEqual([0, 1, -1, 2, 3]);
      expect(data[2].inner).toBe("");
      expect(new Set(data.map((d) => d.id)).size).toBe(5);
    });

    it("rowIndex menunjuk baris pivot, bukan indeks array data", () => {
      const plan = buildNestedPlan(hasil(hierarki), [J, P], G)!;
      const data = toNestedChartData(plan, "F.count_alumni");
      const jalan = data.find((d) => d.inner === "Jalan")!;
      expect(plan.pivot.rows[jalan.rowIndex].keys).toEqual(["Teknik Sipil", "Jalan"]);
      expect(jalan.D4).toBe(4);
      expect(jalan.D3).toBeNull();
    });

    it("nama dalam yang sama di kelompok berbeda tetap jadi batang berbeda", () => {
      const rows = [
        { [G]: "D3", [P]: "Teknik Kimia", "F.count_alumni": 1 },
        { [G]: "D4", [P]: "Teknik Kimia", "F.count_alumni": 2 },
        { [G]: "D4", [P]: "Analis Kimia", "F.count_alumni": 3 },
      ];
      const plan = buildNestedPlan(hasil(rows), [G, P], null)!;
      const bars = toNestedChartData(plan, "F.count_alumni").filter((d) => d.rowIndex >= 0);
      expect(bars.map((d) => d.inner)).toEqual(["Teknik Kimia", "Teknik Kimia", "Analis Kimia"]);
      expect(new Set(bars.map((d) => d.id)).size).toBe(3);
      expect(bars.map((d) => d.nilai)).toEqual([1, 2, 3]);
    });
  });

  describe("filledSeriesPerBar", () => {
    it("satu seri terisi per batang bila warna bergantung pada batang (prodi → jurusan)", () => {
      const data = [
        { name: "a", X: 1, Y: null },
        { name: "b", X: null, Y: 2 },
      ];
      expect(filledSeriesPerBar(data, ["X", "Y"])).toBe(1);
    });

    it("menghitung seri terisi terbanyak dalam satu batang", () => {
      const data = [
        { name: "a", X: 1, Y: 3 },
        { name: "b", X: null, Y: 2 },
      ];
      expect(filledSeriesPerBar(data, ["X", "Y"])).toBe(2);
    });

    it("spacer dan nilai yang hilang tidak dihitung", () => {
      expect(filledSeriesPerBar([{ name: "a" }, { name: "b", X: 0 }], ["X", "Y"])).toBe(1);
      expect(filledSeriesPerBar([], ["X"])).toBe(0);
    });
  });

  describe("decideChart dengan rencana bertingkat", () => {
    function rencana(kelompok: number, perKelompok: number, seri = 1) {
      const rows = [];
      for (let g = 0; g < kelompok; g++) {
        for (let k = 0; k < perKelompok; k++) {
          for (let s = 0; s < seri; s++) {
            rows.push({ [J]: `J${g}`, [P]: `J${g}-P${k}`, [T]: `${2000 + s}`, "F.count_alumni": 1 });
          }
        }
      }
      const rowDims = [J, P];
      const colDim = seri > 1 ? T : null;
      const result = hasil(rows);
      return {
        rowDims,
        colDim,
        plan: buildFacets(result, rowDims, colDim),
        nested: buildNestedPlan(result, rowDims, colDim),
      };
    }

    it("tiga dimensi dalam batas jadi satu grafik bertingkat", () => {
      const { rowDims, colDim, plan, nested } = rencana(3, 5, 2);
      const d = decideChart(rowDims, colDim, plan, nested);
      expect(d.kind).toBe("nested-bar");
      expect(d.faceted).toBe(false);
      expect(d.panels?.faceted).toBe(true);
    });

    it("dua dimensi baris tanpa kolom juga bertingkat", () => {
      const { rowDims, colDim, plan, nested } = rencana(2, 4);
      expect(decideChart(rowDims, colDim, plan, nested).kind).toBe("nested-bar");
    });

    it(`lebih dari ${MAX_NESTED_CATEGORIES} batang jatuh ke panel`, () => {
      const { rowDims, colDim, plan, nested } = rencana(3, 14);
      const d = decideChart(rowDims, colDim, plan, nested);
      expect(d.kind).not.toBe("nested-bar");
      expect(d.faceted).toBe(true);
    });

    it(`lebih dari ${MAX_NESTED_GROUPS} kelompok luar tidak bertingkat`, () => {
      const { rowDims, colDim, plan, nested } = rencana(13, 1);
      expect(decideChart(rowDims, colDim, plan, nested).kind).not.toBe("nested-bar");
    });

    it("seri terlalu banyak tetap ditolak dengan alasan seri", () => {
      const { rowDims, colDim, plan, nested } = rencana(2, 2, 13);
      const d = decideChart(rowDims, colDim, plan, nested);
      expect(d.kind).toBe("none");
      expect(d.reason).toContain("13 seri");
    });

    it("tanpa rencana bertingkat perilaku lama tidak berubah", () => {
      const { rowDims, colDim, plan } = rencana(3, 5, 2);
      expect(decideChart(rowDims, colDim, plan).faceted).toBe(true);
    });
  });

  describe("pilihan visualisasi untuk grafik bertingkat", () => {
    const panels = { kind: "grouped-bar", faceted: true } as const;
    const nested = { kind: "nested-bar", faceted: false, panels } as const;

    it("menawarkan Panel terpisah", () => {
      const opts = availableViz(nested, 2, 5);
      expect(opts).toContain("panels");
      expect(opts).toContain("bar");
      expect(opts[opts.length - 1]).toBe("table");
    });

    it("otomatis dan batang tetap bertingkat", () => {
      expect(applyViz(nested, "auto", 2, 5)).toBe(nested);
      expect(applyViz(nested, "bar", 2, 5)).toBe(nested);
    });

    it("Panel terpisah kembali ke panel", () => {
      expect(applyViz(nested, "panels", 2, 5)).toBe(panels);
    });

    it("garis dan bertumpuk memakai jalur panel", () => {
      expect(applyViz(nested, "line", 2, 5)).toEqual({ kind: "line", faceted: true });
      expect(applyViz(nested, "stacked", 2, 5)).toEqual({ kind: "stacked", faceted: true });
    });

    it("bila panel sendiri ditolak, hanya otomatis dan tabel", () => {
      const ditolak = {
        kind: "nested-bar",
        faceted: false,
        panels: { kind: "none", faceted: false, reason: "x" },
      } as const;
      expect(availableViz(ditolak, 2, 5)).toEqual(["auto", "table"]);
    });

    it("pilihan Panel terpisah tidak ada di luar grafik bertingkat", () => {
      expect(availableViz({ kind: "grouped-bar", faceted: true }, 2, 5)).not.toContain("panels");
      const bar = { kind: "bar", faceted: false } as const;
      expect(applyViz(bar, "panels", 1, 5)).toBe(bar);
    });
  });
});

describe("heatmap", () => {
  const P = "DimProdi.nama_prodi";
  const T = "DimAlumni.tahun_lulus";
  const gaji = { key: "F.gaji", label: "Rata-rata gaji", format: "currency" as const };

  const sel = (p: string, t: string, v: number | null) => ({ [P]: p, [T]: t, "F.gaji": v });
  const pivotDari = (rows: ExplorerResult["rows"], colDim: string | null = T) =>
    buildPivot(hasil(rows, [gaji]), [P], colDim);

  describe("canHeatmap", () => {
    const rows = [sel("A", "2021", 1), sel("A", "2022", 2), sel("B", "2021", 3)];

    it("butuh dimensi kolom dengan minimal dua nilai", () => {
      expect(canHeatmap(pivotDari(rows), T)).toBe(true);
      expect(canHeatmap(pivotDari(rows, null), null)).toBe(false);
      expect(canHeatmap(pivotDari([sel("A", "2021", 1), sel("B", "2021", 2)]), T)).toBe(false);
    });

    it(`menolak lebih dari ${MAX_HEATMAP_COLUMNS} kolom`, () => {
      const lebar = Array.from({ length: MAX_HEATMAP_COLUMNS + 1 }, (_, i) => sel("A", `${1900 + i}`, i));
      expect(canHeatmap(pivotDari(lebar), T)).toBe(false);
    });

    it(`menolak lebih dari ${MAX_HEATMAP_ROWS} baris`, () => {
      const tinggi = Array.from({ length: MAX_HEATMAP_ROWS + 1 }, (_, i) => [sel(`P${i}`, "2021", i), sel(`P${i}`, "2022", i)]).flat();
      expect(canHeatmap(pivotDari(tinggi), T)).toBe(false);
    });
  });

  describe("heatScale / heatIntensity", () => {
    it("skala dari nilai terkecil ke terbesar, bukan dari nol", () => {
      const pivot = pivotDari([sel("A", "2021", 4_000_000), sel("A", "2022", 5_000_000), sel("B", "2021", 4_500_000)]);
      const scale = heatScale(pivot, "F.gaji")!;
      expect(scale).toEqual({ min: 4_000_000, max: 5_000_000, diverging: false });
      expect(heatIntensity(4_000_000, scale)).toBe(0);
      expect(heatIntensity(4_500_000, scale)).toBeCloseTo(0.5);
      expect(heatIntensity(5_000_000, scale)).toBe(1);
    });

    it("nilai bertanda campuran memakai skala divergen di sekitar nol", () => {
      const pivot = pivotDari([sel("A", "2021", -2), sel("A", "2022", 4), sel("B", "2021", 1)]);
      const scale = heatScale(pivot, "F.gaji")!;
      expect(scale.diverging).toBe(true);
      expect(heatIntensity(-2, scale)).toBeCloseTo(-0.5);
      expect(heatIntensity(4, scale)).toBe(1);
      expect(heatIntensity(0, scale)).toBe(0);
    });

    it("semua nilai sama → intensitas penuh, bukan pembagian nol", () => {
      const pivot = pivotDari([sel("A", "2021", 3), sel("A", "2022", 3)]);
      const scale = heatScale(pivot, "F.gaji")!;
      expect(heatIntensity(3, scale)).toBe(1);
    });

    it("tanpa nilai sama sekali → null", () => {
      expect(heatScale(pivotDari([sel("A", "2021", null), sel("A", "2022", null)]), "F.gaji")).toBeNull();
    });
  });

  it("sortColumns mengurutkan kolom, angka sebagai angka, tanpa mengubah isi sel", () => {
    const pivot = pivotDari([sel("A", "2021", 1), sel("A", "2019", 2), sel("A", "2020", 3)]);
    const sorted = sortColumns(pivot);
    expect(sorted.columnKeys).toEqual(["2019", "2020", "2021"]);
    expect(sorted.rows[0].cells["2019"]["F.gaji"].value).toBe(2);
    expect(pivot.columnKeys).toEqual(["2021", "2019", "2020"]);
  });

  describe("preferHeatmap", () => {
    const ditolak = { kind: "none", faceted: false, reason: "20 seri" } as const;

    it("grafik yang ditolak diganti heatmap bila heatmap memungkinkan", () => {
      expect(preferHeatmap(ditolak, true)).toEqual({ kind: "heatmap", faceted: false });
    });

    it("tidak mengganti bila heatmap tidak memungkinkan atau grafik tidak ditolak", () => {
      expect(preferHeatmap(ditolak, false)).toBe(ditolak);
      const bar = { kind: "bar", faceted: false } as const;
      expect(preferHeatmap(bar, true)).toBe(bar);
      const tabel = { kind: "none", faceted: false } as const;
      expect(preferHeatmap(tabel, true)).toBe(tabel);
    });
  });
});

describe("sebaran titik (scatter/bubble)", () => {
  const P = "DimProdi.nama_prodi";
  const G = "DimProdi.jenjang";
  const tunggu = { key: "F.tunggu", label: "Rata-rata masa tunggu", format: "decimal" as const };
  const gaji = { key: "F.gaji", label: "Rata-rata gaji", format: "currency" as const };
  const jumlah = { key: "F.jumlah", label: "Jumlah alumni", format: "integer" as const };

  const rows = [
    { [P]: "A", "F.tunggu": 2, "F.gaji": 5, "F.jumlah": 10 },
    { [P]: "B", "F.tunggu": 6, "F.gaji": 3, "F.jumlah": 4 },
    { [P]: "C", "F.tunggu": null, "F.gaji": 4, "F.jumlah": 7 },
  ];
  const pivot = buildPivot(hasil(rows, [tunggu, gaji, jumlah]), [P], null);

  it("satu titik per kelompok; kelompok tanpa X atau Y dibuang", () => {
    const pts = toScatterPoints(pivot, "F.tunggu", "F.gaji", "F.jumlah");
    expect(pts.map((p) => [p.name, p.x, p.y, p.z, p.rowIndex])).toEqual([
      ["A", 2, 5, 10, 0],
      ["B", 6, 3, 4, 1],
    ]);
    expect(pts[0].columnKey).toBe(SINGLE_COLUMN);
  });

  it("tanpa ukuran ketiga, z kosong", () => {
    expect(toScatterPoints(pivot, "F.tunggu", "F.gaji", null)[0].z).toBeNull();
  });

  it("dimensi kolom menjadi seri; satu titik per baris × kolom", () => {
    const r = [
      { [P]: "A", [G]: "D3", "F.tunggu": 1, "F.gaji": 2 },
      { [P]: "A", [G]: "D4", "F.tunggu": 3, "F.gaji": 4 },
    ];
    const pv = buildPivot(hasil(r, [tunggu, gaji]), [P], G);
    const pts = toScatterPoints(pv, "F.tunggu", "F.gaji", null);
    expect(pts.map((p) => [p.name, p.series, p.columnKey])).toEqual([
      ["A", "D3", "D3"],
      ["A", "D4", "D4"],
    ]);
  });

  it("canScatter butuh minimal dua ukuran dan dua titik", () => {
    expect(canScatter(pivot, [tunggu, gaji])).toBe(true);
    expect(canScatter(pivot, [tunggu])).toBe(false);
    const satu = buildPivot(hasil([rows[0]], [tunggu, gaji]), [P], null);
    expect(canScatter(satu, [tunggu, gaji])).toBe(false);
  });

  it("canScatter menolak kolom hasil hitungan (selisih)", () => {
    expect(canScatter({ ...pivot, derivedColumns: ["x"] }, [tunggu, gaji])).toBe(false);
  });

  it("median ganjil, genap, dan kosong", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("pilihan heatmap dan sebaran titik", () => {
  const grouped = { kind: "grouped-bar", faceted: false } as const;

  it("ditawarkan sebelum Tabel hanya bila memungkinkan", () => {
    const opts = availableViz(grouped, 3, 5, 2, { heatmap: true, scatter: true });
    expect(opts.slice(-3)).toEqual(["heatmap", "scatter", "table"]);
    expect(availableViz(grouped, 3, 5, 2)).not.toContain("heatmap");
  });

  it("grafik ditolak tetap menawarkan heatmap", () => {
    const ditolak = { kind: "none", faceted: false, reason: "x" } as const;
    expect(availableViz(ditolak, 20, 5, 1, { heatmap: true })).toEqual(["auto", "heatmap", "table"]);
  });

  it("heatmap otomatis tidak menawarkan heatmap dua kali", () => {
    const heat = { kind: "heatmap", faceted: false } as const;
    expect(availableViz(heat, 20, 5, 2, { heatmap: true, scatter: true })).toEqual(["auto", "scatter", "table"]);
  });

  it("memilih heatmap/sebaran menghasilkan jenis grafiknya", () => {
    const extra = { heatmap: true, scatter: true };
    expect(applyViz(grouped, "heatmap", 3, 5, 2, extra)).toEqual({ kind: "heatmap", faceted: false });
    expect(applyViz(grouped, "scatter", 3, 5, 2, extra)).toEqual({ kind: "scatter", faceted: false });
    expect(applyViz(grouped, "scatter", 3, 5, 2)).toBe(grouped);
  });

  it("grafik bertingkat meneruskan pilihan heatmap", () => {
    const nested = { kind: "nested-bar", faceted: false, panels: { kind: "grouped-bar", faceted: true } } as const;
    expect(availableViz(nested, 2, 5, 1, { heatmap: true })).toContain("heatmap");
    expect(applyViz(nested, "heatmap", 2, 5, 1, { heatmap: true })).toEqual({ kind: "heatmap", faceted: false });
  });
});
