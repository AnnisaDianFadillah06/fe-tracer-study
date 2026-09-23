import { useMemo, useState } from "react";
import { AlertTriangle, Compass, Download, Info, Loader2, Sparkles } from "lucide-react";
import { isAxiosError } from "axios";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ExplorerChart from "@/components/dashboard/insight/ExplorerChart";
import ExplorerControls from "@/components/dashboard/insight/ExplorerControls";
import ExplorerFacets from "@/components/dashboard/insight/ExplorerFacets";
import PivotTable from "@/components/dashboard/insight/PivotTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExplorerCatalog, useExplorerQuery } from "@/hooks/useExplorer";
import {
  availableStarters,
  buildFacets,
  buildPivot,
  decideChart,
  describeQuestion,
  formatMeasure,
  toCsv,
  type ExplorerQueryInput,
  type ExplorerResult,
} from "@/lib/olapExplorer";

/**
 * Halaman Insight — OLAP Explorer.
 *
 * Pengguna menyusun sendiri kombinasi measure x dimensi di panel kiri; hasilnya
 * digambar sebagai chart dan tabel pivot di kanan. Apa yang boleh dipilih
 * seluruhnya berasal dari katalog peladen (config/olap_catalog.php), jadi
 * halaman ini tidak pernah menebak nama measure atau dimensi Cube.js sendiri.
 *
 * Berbeda dari halaman Multidimensi Insight yang menautkan ke Metabase
 * eksternal, seluruh jalur di sini tetap di dalam SmartTracer dan tunduk pada
 * pembatasan prodi yang sama dengan dashboard lain.
 */
const InsightPage = () => {
  const { data: catalog, isLoading: catalogLoading, isError: catalogError } =
    useExplorerCatalog();

  const [input, setInput] = useState<ExplorerQueryInput | null>(null);

  // Pilihan awal ditentukan setelah katalog tiba: sumber data pertama, tanpa
  // measure apa pun. Tidak ada query yang berjalan sampai pengguna memilih —
  // halaman ini tidak memanggil Cube.js hanya karena dibuka.
  const current: ExplorerQueryInput | null = useMemo(() => {
    if (input) return input;
    if (!catalog || catalog.cubes.length === 0) return null;

    return {
      cube: catalog.cubes[0].key,
      measures: [],
      rowDims: [],
      colDim: null,
      filters: [],
    };
  }, [input, catalog]);

  const cube = catalog?.cubes.find((c) => c.key === current?.cube) ?? null;

  const {
    data: result,
    isFetching,
    error,
  } = useExplorerQuery(
    current ?? { cube: "", measures: [], rowDims: [], colDim: null, filters: [] },
  );

  const [chartMeasure, setChartMeasure] = useState<string | null>(null);

  const pivot = useMemo(
    () => (result && current ? buildPivot(result, current.rowDims, current.colDim) : null),
    [result, current],
  );

  // Chart dipecah per nilai dimensi Baris kedua (small multiples). Tabel di
  // bawah tetap memakai pivot utuh — dua dimensi baris terbaca baik di sana
  // sebagai kolom bersarang.
  const plan = useMemo(
    () => (result && current ? buildFacets(result, current.rowDims, current.colDim) : null),
    [result, current],
  );

  // Keputusan chart memakai hasil yang sesungguhnya, bukan cuma jumlah dimensi
  // — dua dimensi baris bisa menghasilkan ratusan kelompok.
  const chart =
    current && plan
      ? decideChart(current.rowDims, current.colDim, plan)
      : { kind: "none" as const, faceted: false, reason: undefined };

  // Dimensi panel dipilih otomatis oleh buildFacets (yang nilainya paling
  // sedikit), jadi labelnya dibaca dari rencana itu — bukan dari slot yang
  // dipilih pengguna.
  const facetLabel =
    result?.dimensions.find((d) => d.key === plan?.facetDim)?.label ?? "kelompok";

  const activeChartMeasure =
    result?.measures.find((m) => m.key === chartMeasure) ?? result?.measures[0] ?? null;

  const starters = useMemo(() => (catalog ? availableStarters(catalog) : []), [catalog]);

  const question =
    current && cube
      ? describeQuestion(
          current,
          (k) => cube.measures.find((m) => m.key === k)?.label ?? k,
          (k) =>
            cube.dimension_groups.flatMap((g) => g.members).find((d) => d.key === k)?.label ?? k,
        )
      : "";

  const applyInput = (next: ExplorerQueryInput) => {
    setInput(next);
    setChartMeasure(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-2 mb-6">
        <h1 className="font-heading text-2xl font-bold">Insight</h1>
        <p className="text-muted-foreground">
          Susun sendiri analisis multidimensi: pilih ukuran, pecah menurut dimensi apa pun,
          dan saring sesuai kebutuhan.
        </p>
      </div>

      {catalogLoading && <Skeleton className="h-96 w-full" />}

      {catalogError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Katalog tidak bisa dimuat</AlertTitle>
          <AlertDescription>
            Layanan analitik sedang tidak tersedia. Coba muat ulang halaman beberapa saat lagi.
          </AlertDescription>
        </Alert>
      )}

      {catalog && current && cube && (
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <ExplorerControls
              catalog={catalog}
              cube={cube}
              input={current}
              onChange={applyInput}
            />
          </div>

          <div className="space-y-6 lg:col-span-3">
            {current.measures.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Compass className="h-8 w-8 text-primary" />
                  </div>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Pilih apa yang ingin dihitung di panel kiri, lalu kelompokkan menurut
                    jurusan, tahun lulus, atau lainnya. Atau mulai dari salah satu contoh:
                  </p>

                  {starters.length > 0 && (
                    <div className="mt-2 flex max-w-2xl flex-wrap justify-center gap-2">
                      {starters.map((s) => (
                        <Button
                          key={s.title}
                          variant="outline"
                          size="sm"
                          className="h-auto whitespace-normal py-2 text-left"
                          onClick={() => applyInput(s.input)}
                        >
                          <Sparkles className="mr-2 h-3.5 w-3.5 shrink-0 text-primary" />
                          {s.title}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {error && <QueryError error={error} />}

            {isFetching && current.measures.length > 0 && (
              <Card>
                <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menghitung…
                </CardContent>
              </Card>
            )}

            {!isFetching && !error && result && pivot && result.rows.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Tidak ada data untuk kombinasi ini. Coba longgarkan filternya.
                </CardContent>
              </Card>
            )}

            {!isFetching && !error && result && pivot && result.rows.length > 0 && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold">{question}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCsv(result, question)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Unduh CSV
                  </Button>
                </div>

                {result.truncated && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Hasil dipotong</AlertTitle>
                    <AlertDescription>
                      Query ini menghasilkan lebih banyak baris dari batas {catalog.limits.max_rows}.
                      Tambahkan filter supaya angkanya lengkap.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Tanpa dimensi sama sekali, hasilnya satu baris angka —
                    chart tidak punya sumbu, jadi ditampilkan sebagai kartu. */}
                {chart.kind === "number" && (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {result.measures.map((m) => (
                      <Card key={m.key}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            {m.label}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-2xl font-bold tabular-nums">
                            {formatMeasure(
                              pivot.rows[0]?.cells[""]?.[m.key]?.value ?? null,
                              m.format,
                            )}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {chart.kind === "none" && chart.reason && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Tidak digambar sebagai chart</AlertTitle>
                    <AlertDescription>{chart.reason}</AlertDescription>
                  </Alert>
                )}

                {chart.kind !== "number" && chart.kind !== "none" && activeChartMeasure && (
                  <Card>
                    <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-2">
                      <CardTitle className="text-base">{activeChartMeasure.label}</CardTitle>

                      {result.measures.length > 1 && (
                        <Select
                          value={activeChartMeasure.key}
                          onValueChange={setChartMeasure}
                        >
                          <SelectTrigger className="w-64">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {result.measures.map((m) => (
                              <SelectItem key={m.key} value={m.key}>
                                {m.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </CardHeader>
                    <CardContent>
                      {chart.faceted ? (
                        <ExplorerFacets
                          kind={chart.kind}
                          facets={plan!.facets}
                          measure={activeChartMeasure}
                          facetLabel={facetLabel}
                        />
                      ) : (
                        <ExplorerChart
                          kind={chart.kind}
                          pivot={pivot}
                          measure={activeChartMeasure}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Tabel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PivotTable
                      pivot={pivot}
                      measures={result.measures}
                      rowDimensions={result.dimensions.filter((d) =>
                        current.rowDims.includes(d.key),
                      )}
                      hasColumnDimension={current.colDim !== null}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

/** BOM di depan supaya Excel membaca huruf non-ASCII dengan benar. */
function downloadCsv(result: ExplorerResult, question: string) {
  const blob = new Blob(["\uFEFF" + toCsv(result)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(question || "insight").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 80)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Galat 422 dari katalog sudah berisi kalimat yang bisa dibaca pengguna
 * ("Dimensi X tidak tersedia pada sumber data Y"), jadi ditampilkan apa adanya
 * alih-alih diganti pesan umum yang menghilangkan informasinya.
 */
const QueryError = ({ error }: { error: unknown }) => {
  const message =
    isAxiosError(error) && typeof error.response?.data?.message === "string"
      ? error.response.data.message
      : "Query gagal dijalankan. Coba ubah kombinasinya.";

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Tidak bisa dihitung</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

export default InsightPage;
