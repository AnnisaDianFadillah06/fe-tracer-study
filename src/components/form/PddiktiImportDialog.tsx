import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  SkipForward,
  Upload,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/common/use-toast";
import {
  cancelPddiktiImport,
  confirmPddiktiImport,
  downloadPddiktiErrors,
  downloadPddiktiTemplate,
  errorMessage,
  getPddiktiImport,
  isRunning,
  uploadPddiktiImport,
  type PddiktiImport,
  type PddiktiIssueLevel,
} from "@/lib/pddiktiImport";

const nf = new Intl.NumberFormat("id-ID");

const LEVEL_LABEL: Record<PddiktiIssueLevel, string> = {
  error: "Galat",
  warning: "Peringatan",
  skipped: "Dilewati",
};

/**
 * Impor data format PDDikti: unggah → validasi (queue) → pratinjau galat →
 * konfirmasi → impor (queue) → ringkasan. Statusnya dipoll tiap detik selama
 * job berjalan; dialog boleh ditutup tanpa menghentikan prosesnya.
 */
export default function PddiktiImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importId, setImportId] = useState<number | null>(null);
  const [level, setLevel] = useState<PddiktiIssueLevel>("error");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [confirmRollback, setConfirmRollback] = useState(false);

  const { data: imp } = useQuery({
    queryKey: ["pddikti-import", importId, level, page],
    queryFn: () => getPddiktiImport(importId as number, { level, issues_page: page }),
    enabled: importId !== null,
    refetchInterval: (query) => (isRunning(query.state.data?.status) || !query.state.data ? 1000 : false),
  });

  const refreshCohorts = () => queryClient.invalidateQueries({ queryKey: ["ringkasan-tahun"] });

  // Kartu angkatan di belakang dialog ("… sudah mengisi") langsung ikut
  // bertambah begitu impor selesai, tanpa menunggu dialog ditutup.
  const finished = imp?.status === "completed";
  useEffect(() => {
    if (finished) refreshCohorts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const reset = () => {
    setFile(null);
    setImportId(null);
    setLevel("error");
    setPage(1);
    if (fileInput.current) fileInput.current.value = "";
  };

  const run = async (action: () => Promise<PddiktiImport | void>, failMessage: string) => {
    setBusy(true);
    try {
      const result = await action();
      if (result) queryClient.setQueryData(["pddikti-import", result.id, level, page], result);
      return result;
    } catch (err) {
      toast({ title: failMessage, description: errorMessage(err, "Coba lagi beberapa saat."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    const created = await run(() => uploadPddiktiImport(file), "Berkas gagal diunggah");
    if (created) setImportId(created.id);
  };

  const handleConfirm = () => run(() => confirmPddiktiImport(importId as number), "Impor gagal dimulai");

  const handleCancel = async () => {
    const result = await run(() => cancelPddiktiImport(importId as number), "Pembatalan gagal");
    if (!result) return;
    if (result.status === "rolled_back") {
      refreshCohorts();
      toast({ title: "Impor dibatalkan", description: "Seluruh data dari berkas ini sudah dihapus." });
    }
    reset();
  };

  const handleOpenChange = (next: boolean) => {
    // Menutup dialog tidak menghentikan proses: selama job berjalan atau
    // pratinjau menunggu konfirmasi, keadaannya dipertahankan untuk dibuka lagi.
    if (!next && imp && !isRunning(imp.status) && imp.status !== "validated") reset();
    onOpenChange(next);
  };

  const status = imp?.status;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Impor Data PDDikti</DialogTitle>
            <DialogDescription>
              Unggah jawaban tracer study berformat PDDikti. Berkas diperiksa dulu; tidak ada data yang ditulis sebelum Anda
              mengonfirmasi.
            </DialogDescription>
          </DialogHeader>

          {importId === null && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center transition hover:border-primary/60 hover:bg-muted/40"
              >
                <FileSpreadsheet className="h-10 w-10 text-primary" aria-hidden />
                <span className="font-medium">{file ? file.name : "Pilih berkas .xlsx atau .xls"}</span>
                <span className="text-xs text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(0)} KB — klik untuk mengganti` : "Maksimal 20 MB"}
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <ul className="space-y-1.5 rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <li>• Format sama dengan ekspor "Data Kementerian" (kode maupun teks).</li>
                <li>• Wajib: Nomor Mhs, Nama, Tahun Lulus, Kode Prodi, dan pertanyaan bertanda "Wajib diisi" di instrumen kementerian.</li>
                <li>• Alumni yang sudah mengisi kuesioner secara online dilewati; jawaban online-nya dipertahankan.</li>
              </ul>
            </div>
          )}

          {importId !== null && !imp && <Running label="Mengunggah berkas…" />}

          {status === "validating" && imp && (
            <Running label="Memeriksa berkas…" progress={imp.progress} detail={progressDetail(imp)} />
          )}

          {status === "importing" && imp && (
            <Running label="Mengimpor data…" progress={imp.progress} detail={`${nf.format(imp.imported_rows)} baris sudah masuk`} />
          )}

          {status === "validated" && imp && (
            <div className="space-y-5">
              <Summary imp={imp} />
              {imp.cohorts.length > 0 && <Cohorts imp={imp} />}
              {imp.issues_total > 0 || imp.error_rows + imp.skipped_rows + imp.warning_count > 0 ? (
                <Issues
                  imp={imp}
                  level={level}
                  onLevel={(l) => {
                    setLevel(l);
                    setPage(1);
                  }}
                  page={page}
                  onPage={setPage}
                />
              ) : null}
            </div>
          )}

          {status === "completed" && imp && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <div>
                  <p className="font-semibold">{nf.format(imp.imported_rows)} baris berhasil diimpor</p>
                  {imp.skipped_rows > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {nf.format(imp.skipped_rows)} baris dilewati karena alumninya sudah mengisi online.
                    </p>
                  )}
                </div>
              </div>
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Data sudah masuk ke Hasil Kuesioner. Dashboard analitik ikut diperbarui setelah ETL mingguan berikutnya berjalan.
              </p>
            </div>
          )}

          {status === "failed" && imp && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
              <p className="text-sm">{imp.error_message ?? "Proses gagal."}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {importId === null && (
              <>
                <Button variant="ghost" onClick={() => run(downloadPddiktiTemplate, "Templat gagal diunduh")} disabled={busy}>
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                  Unduh templat
                </Button>
                <Button onClick={handleUpload} disabled={!file || busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Upload className="mr-2 h-4 w-4" aria-hidden />}
                  Periksa berkas
                </Button>
              </>
            )}

            {status === "validated" && imp && (
              <>
                <div className="flex gap-2">
                  {imp.error_rows > 0 && (
                    <Button variant="outline" onClick={() => run(() => downloadPddiktiErrors(imp.id), "Daftar galat gagal diunduh")} disabled={busy}>
                      <Download className="mr-2 h-4 w-4" aria-hidden />
                      Unduh daftar galat
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={handleCancel} disabled={busy}>
                    Batal
                  </Button>
                  <Button onClick={handleConfirm} disabled={busy || imp.valid_rows === 0}>
                    Impor {nf.format(imp.valid_rows)} baris sah
                  </Button>
                </div>
              </>
            )}

            {(status === "completed" || status === "failed") && imp && (
              <>
                {(status === "completed" || imp.imported_rows > 0) ? (
                  <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmRollback(true)} disabled={busy}>
                    Batalkan impor ini
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={reset} disabled={busy}>
                    Impor berkas lain
                  </Button>
                  <Button onClick={() => handleOpenChange(false)}>Tutup</Button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRollback} onOpenChange={setConfirmRollback}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan impor ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Seluruh jawaban dari berkas ini dihapus, begitu pula alumni yang dibuat oleh impor ini. Pengisian online tidak tersentuh.
              Draf online yang sudah digantikan impor tidak bisa dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleCancel}>
              Ya, batalkan impor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function progressDetail(imp: PddiktiImport) {
  return imp.total_rows > 0 ? `${nf.format(imp.processed_rows)} dari ${nf.format(imp.total_rows)} baris` : "Membaca berkas…";
}

function Running({ label, progress, detail }: { label: string; progress?: number; detail?: string }) {
  return (
    <div className="space-y-3 py-6" role="status" aria-live="polite">
      <div className="flex items-center gap-2 font-medium">
        <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
        {label}
      </div>
      <Progress value={progress ?? 0} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{detail}</span>
        {progress !== undefined && <span>{progress}%</span>}
      </div>
      <p className="text-xs text-muted-foreground">Dialog ini boleh ditutup; proses tetap berjalan.</p>
    </div>
  );
}

function Summary({ imp }: { imp: PddiktiImport }) {
  const items = [
    { label: "Siap diimpor", value: imp.valid_rows, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-500/10" },
    { label: "Dilewati (sudah online)", value: imp.skipped_rows, icon: SkipForward, tone: "text-sky-600 bg-sky-500/10" },
    { label: "Baris galat", value: imp.error_rows, icon: XCircle, tone: "text-destructive bg-destructive/10" },
    { label: "Peringatan", value: imp.warning_count, icon: AlertTriangle, tone: "text-amber-600 bg-amber-500/10" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="rounded-xl border border-border/60 p-3">
          <span className={`inline-grid h-8 w-8 place-items-center rounded-lg ${tone}`}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <p className="mt-2 text-2xl font-bold">{nf.format(value)}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

function Cohorts({ imp }: { imp: PddiktiImport }) {
  return (
    <div className="rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Angkatan</TableHead>
            <TableHead>Masuk ke kuesioner</TableHead>
            <TableHead className="text-right">Sah</TableHead>
            <TableHead className="text-right">Dilewati</TableHead>
            <TableHead className="text-right">Galat</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {imp.cohorts.map((c) => (
            <TableRow key={c.year}>
              <TableCell className="font-medium">Lulusan {c.year}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{c.questionnaire ?? "— belum ada kuesioner aktif"}</TableCell>
              <TableCell className="text-right">{nf.format(c.valid)}</TableCell>
              <TableCell className="text-right">{nf.format(c.skipped)}</TableCell>
              <TableCell className="text-right">{nf.format(c.error)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Issues({
  imp,
  level,
  onLevel,
  page,
  onPage,
}: {
  imp: PddiktiImport;
  level: PddiktiIssueLevel;
  onLevel: (level: PddiktiIssueLevel) => void;
  page: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(imp.issues_total / imp.issues_per_page));
  return (
    <div className="space-y-3">
      <Tabs value={level} onValueChange={(v) => onLevel(v as PddiktiIssueLevel)}>
        <TabsList>
          {(["error", "warning", "skipped"] as const).map((l) => (
            <TabsTrigger key={l} value={l}>
              {LEVEL_LABEL[l]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {imp.issues.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Tidak ada {LEVEL_LABEL[level].toLowerCase()}.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Baris</TableHead>
                <TableHead className="w-32">NIM</TableHead>
                <TableHead className="w-28">Kolom</TableHead>
                <TableHead>Masalah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {imp.issues.map((i, idx) => (
                <TableRow key={`${i.row}-${i.column}-${idx}`}>
                  <TableCell>{i.row}</TableCell>
                  <TableCell className="font-mono text-xs">{i.nim ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap font-mono">
                      {i.column}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{i.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            Sebelumnya
          </Button>
          <span className="text-muted-foreground">
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
