import { describe, expect, it } from "vitest";
import {
  applyViz,
  availableViz,
  SINGLE_COLUMN,
  buildFacets,
  buildPivot,
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
