import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  BookmarkPlus,
  Download,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pin,
} from "lucide-react";
import { isAxiosError } from "axios";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ExplorerControls from "@/components/dashboard/insight/ExplorerControls";
import ExplorerResultView from "@/components/dashboard/insight/ExplorerResultView";
import InsightStartPanel from "@/components/dashboard/insight/InsightStartPanel";
import SaveQuestionDialog, {
  type SaveQuestionValues,
} from "@/components/dashboard/insight/SaveQuestionDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExplorerCatalog, useExplorerQuery } from "@/hooks/useExplorer";
import { useToast } from "@/hooks/common/use-toast";
import { useInsightBoard, usePinQuestion } from "@/hooks/useInsightBoard";
import {
  useDeleteInsightQuestion,
  useInsightQuestion,
  useInsightQuestions,
  useSaveInsightQuestion,
  type InsightQuestion,
} from "@/hooks/useInsightQuestions";
import {
  availableStarters,
  describeQuestion,
  diceInput,
  drillFilters,
  isRunnable,
  measureLabelOf,
  rollUpInput,
  sameQuestion,
  toCsv,
  type DrillPoint,
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
 * Seluruh jalur di sini tetap di dalam SmartTracer dan tunduk pada
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
    dataUpdatedAt,
  } = useExplorerQuery(
    current ?? { cube: "", measures: [], rowDims: [], colDim: null, filters: [] },
  );

  const [chartMeasure, setChartMeasure] = useState<string | null>(null);

  const activeChartMeasure =
    result?.measures.find((m) => m.key === chartMeasure) ?? result?.measures[0] ?? null;

  const starters = useMemo(() => (catalog ? availableStarters(catalog) : []), [catalog]);

  const question =
    current && cube
      ? describeQuestion(
          current,
          (k) => measureLabelOf(cube, k, current.formulas),
          (k) =>
            cube.dimension_groups.flatMap((g) => g.members).find((d) => d.key === k)?.label ?? k,
        )
      : "";

  /** Kalimat ringkas untuk susunan mana pun (dipakai kartu contoh). */
  const describeInput = (i: ExplorerQueryInput): string => {
    const c = catalog?.cubes.find((x) => x.key === i.cube);
    if (!c) return "";
    return describeQuestion(
      i,
      (k) => measureLabelOf(c, k, i.formulas),
      (k) => c.dimension_groups.flatMap((g) => g.members).find((d) => d.key === k)?.label ?? k,
    );
  };

  const applyInput = (next: ExplorerQueryInput) => {
    setInput(next);
    setChartMeasure(null);
  };

  // ── Pertanyaan tersimpan ─────────────────────────────────────
  //
  // Pertanyaan yang sedang dibuka dicatat di URL (?q=id), jadi tautannya bisa
  // dibagikan dan halaman yang dimuat ulang tetap membuka pertanyaan yang sama.
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawQ = Number(searchParams.get("q"));
  const questionId = Number.isInteger(rawQ) && rawQ > 0 ? rawQ : null;

  const { data: savedQuestions = [] } = useInsightQuestions();
  const { data: openQuestion, error: openError } = useInsightQuestion(questionId);
  const saveQuestion = useSaveInsightQuestion();
  const deleteQuestion = useDeleteInsightQuestion();
  const [saveOpen, setSaveOpen] = useState(false);
  const { data: board = [] } = useInsightBoard();
  const pinQuestion = usePinQuestion();

  // Terapkan isi pertanyaan sekali per id — perubahan pengguna sesudahnya
  // tidak boleh tertimpa setiap kali data pertanyaan dimuat ulang.
  const appliedId = useRef<number | null>(null);
  useEffect(() => {
    if (openQuestion && appliedId.current !== openQuestion.id) {
      appliedId.current = openQuestion.id;
      setInput(openQuestion.query);
      setChartMeasure(openQuestion.chart_measure);
    }
  }, [openQuestion]);

  const openSaved = (q: InsightQuestion) => {
    appliedId.current = null;
    setSearchParams({ q: String(q.id) });
  };

  const startFresh = (next: ExplorerQueryInput) => {
    appliedId.current = null;
    setSearchParams({});
    applyInput(next);
  };

  const activeQuestion = questionId !== null && openQuestion?.id === questionId ? openQuestion : null;
  const dirty =
    activeQuestion !== null &&
    current !== null &&
    !sameQuestion(activeQuestion.query, current);

  const handleSave = ({ title, isShared, asNew }: SaveQuestionValues) => {
    if (!current) return;

    const updating = activeQuestion?.is_mine && !asNew;

    saveQuestion.mutate(
      {
        id: updating ? activeQuestion.id : undefined,
        title,
        is_shared: isShared,
        query: current,
        chart_measure: activeChartMeasure?.key ?? null,
      },
      {
        onSuccess: (saved) => {
          setSaveOpen(false);
          appliedId.current = saved.id;
          setSearchParams({ q: String(saved.id) });
          toast({ title: updating ? "Perubahan disimpan" : "Pertanyaan disimpan", description: saved.title });
        },
      },
    );
  };

  const pinned = activeQuestion !== null && board.some((i) => i.question.id === activeQuestion.id);

  const handlePin = () => {
    if (!activeQuestion) return;
    pinQuestion.mutate(activeQuestion.id, {
      onSuccess: () =>
        toast({ title: "Disematkan ke Dashboard Saya", description: activeQuestion.title }),
      onError: (e) =>
        toast({ title: "Gagal menyematkan", description: apiMessage(e), variant: "destructive" }),
    });
  };

  const handleDelete = (q: InsightQuestion) => {
    deleteQuestion.mutate(q.id, {
      onSuccess: () => {
        if (q.id === questionId) setSearchParams({});
        toast({ title: "Pertanyaan dihapus", description: q.title });
      },
      onError: (e) =>
        toast({ title: "Gagal menghapus", description: apiMessage(e), variant: "destructive" }),
    });
  };

  /**
   * Slice: saring ke kelompok yang diklik. Dengan `drillDim`, sekaligus
   * dirinci (drill-down) per dimensi itu sebagai Baris berikutnya.
   */
  const handleSlice = (point: DrillPoint, drillDim?: string) => {
    if (!current) return;
    applyInput({
      ...current,
      filters: drillFilters(current.filters, point),
      rowDims: drillDim ? [...current.rowDims, drillDim] : current.rowDims,
    });
  };

  // Dimensi yang masih boleh dipakai "Rinci per": belum terpakai dan muat di
  // batas dimensi katalog.
  const drillDimensions = useMemo(() => {
    if (!current || !cube || !catalog) return [];
    const used = new Set([...current.rowDims, ...(current.colDim ? [current.colDim] : [])]);
    if (used.size >= catalog.limits.max_dimensions) return [];
    return cube.dimension_groups.flatMap((g) => g.members).filter((d) => !used.has(d.key));
  }, [current, cube, catalog]);

  const handleDice = (points: DrillPoint[]) => {
    if (current) applyInput(diceInput(current, points));
  };

  const rolledUp = current ? rollUpInput(current) : null;
  const handleRollUp = () => {
    if (rolledUp) applyInput(rolledUp);
  };

  const handleReset = () => {
    if (!current) return;
    startFresh({ cube: current.cube, measures: [], rowDims: [], colDim: null, filters: [] });
  };

  // Pita filter menempel di bawah top bar, sama seperti filter global di
  // dashboard lain; judul halaman sudah ada di top bar.
  const filterBar =
    catalog && current && cube ? (
      <ExplorerControls
        catalog={catalog}
        cube={cube}
        input={current}
        onChange={applyInput}
        onReset={handleReset}
        onRollUp={rolledUp ? handleRollUp : undefined}
        summary={question}
        fetching={isFetching && isRunnable(current)}
        updatedAt={result ? dataUpdatedAt : undefined}
      />
    ) : undefined;

  return (
    <DashboardLayout filterBar={filterBar}>
      <div className="mx-auto max-w-[1400px] space-y-4">
      {openError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pertanyaan tidak bisa dibuka</AlertTitle>
          <AlertDescription>{apiMessage(openError)}</AlertDescription>
        </Alert>
      )}

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
        <div className="space-y-4">
          <div className="space-y-4">
            {!isRunnable(current) && (
              <InsightStartPanel
                starters={starters}
                describe={describeInput}
                savedQuestions={savedQuestions}
                activeId={questionId}
                onStart={startFresh}
                onOpen={openSaved}
                onDelete={handleDelete}
              />
            )}

            {error && <QueryError error={error} />}

            {isFetching && isRunnable(current) && (
              <Card>
                <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menghitung{question ? `: ${question}` : ""}…
                </CardContent>
              </Card>
            )}

            {!isFetching && !error && result && result.rows.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Tidak ada data untuk kombinasi ini. Coba longgarkan filternya.
                </CardContent>
              </Card>
            )}

            {!isFetching && !error && result && result.rows.length > 0 && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">
                      {activeQuestion ? activeQuestion.title : question}
                      {dirty && (
                        <Badge variant="secondary" className="ml-2 align-middle font-normal">
                          Diubah
                        </Badge>
                      )}
                    </p>
                    {activeQuestion && (
                      <p className="text-sm text-muted-foreground">
                        {question}
                        {!activeQuestion.is_mine && activeQuestion.owner_name
                          ? ` · dibagikan oleh ${activeQuestion.owner_name}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {savedQuestions.length > 0 && (
          <Select
            value={activeQuestion ? String(activeQuestion.id) : ""}
            onValueChange={(v) => {
              const q = savedQuestions.find((x) => String(x.id) === v);
              if (q) openSaved(q);
            }}
          >
            <SelectTrigger className="h-9 w-56 text-sm">
              <SelectValue placeholder={`Pertanyaan tersimpan (${savedQuestions.length})`} />
            </SelectTrigger>
            <SelectContent>
              {savedQuestions.map((q) => (
                <SelectItem key={q.id} value={String(q.id)}>
                  {q.title}
                  {!q.is_mine && q.owner_name ? ` — ${q.owner_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
                    )}
                    <Button size="sm" onClick={() => setSaveOpen(true)}>
                      <BookmarkPlus className="mr-2 h-4 w-4" />
                      {activeQuestion?.is_mine ? "Simpan perubahan" : "Simpan"}
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="mr-2 h-4 w-4" />
                          Lainnya
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {activeQuestion &&
                          (pinned ? (
                            <DropdownMenuItem asChild>
                              <Link to="/dashboard/insight/board">
                                <LayoutGrid className="mr-2 h-4 w-4" />
                                Lihat di Dashboard Saya
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={handlePin} disabled={pinQuestion.isPending}>
                              <Pin className="mr-2 h-4 w-4" />
                              Sematkan ke Dashboard Saya
                            </DropdownMenuItem>
                          ))}
                        <DropdownMenuItem
                          onSelect={() => downloadCsv(result, activeQuestion?.title ?? question)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Unduh CSV
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

                <ExplorerResultView
                  result={result}
                  rowDims={current.rowDims}
                  colDim={current.colDim}
                  filters={current.filters}
                  display={current}
                  chartMeasure={chartMeasure}
                  onChartMeasureChange={setChartMeasure}
                  onVizChange={(viz) => setInput({ ...current, viz })}
                  onSlice={handleSlice}
                  onDice={handleDice}
                  onRollUp={rolledUp ? handleRollUp : undefined}
                  drillDimensions={drillDimensions}
                />
              </>
            )}
          </div>
        </div>
      )}
      </div>
      <SaveQuestionDialog
        open={saveOpen}
        onOpenChange={(o) => {
          setSaveOpen(o);
          if (!o) saveQuestion.reset();
        }}
        defaultTitle={activeQuestion?.is_mine ? activeQuestion.title : question}
        defaultShared={activeQuestion?.is_mine ? activeQuestion.is_shared : false}
        editing={activeQuestion?.is_mine ?? false}
        saving={saveQuestion.isPending}
        error={saveQuestion.error ? apiMessage(saveQuestion.error) : null}
        onSave={handleSave}
      />
    </DashboardLayout>
  );
};

function apiMessage(error: unknown): string {
  return isAxiosError(error) && typeof error.response?.data?.message === "string"
    ? error.response.data.message
    : "Terjadi kesalahan. Coba lagi beberapa saat lagi.";
}

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
