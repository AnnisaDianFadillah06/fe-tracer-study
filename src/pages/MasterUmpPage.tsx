import { useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  CheckCircle2,
  CloudDownload,
  Database,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Upload,
  Wallet,
} from "lucide-react";

/** ----- Master 34 provinsi ----- */
const PROVINSI: string[] = [
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Bengkulu",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Lampung",
  "DKI Jakarta",
  "Banten",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
];

type Sumber = "BPS_API" | "IMPORT" | "MANUAL" | "GAGAL" | "KOSONG";

type UmpRow = {
  provinsi: string;
  nilai: number | null;
  sumber: Sumber;
};

type UmpDataset = Record<number, UmpRow[]>;

const seedRows = (gen: (p: string) => Partial<UmpRow>): UmpRow[] =>
  PROVINSI.map((p) => {
    const g = gen(p);
    return {
      provinsi: p,
      nilai: g.nilai ?? null,
      sumber: g.sumber ?? "KOSONG",
    };
  });

/** Mock initial dataset — beberapa tahun sudah ada */
const INITIAL_DATA: UmpDataset = {
  2024: seedRows((p) => ({
    nilai: Math.round((1_800_000 + p.length * 41_000 + 250_000) / 1000) * 1000,
    sumber: "BPS_API",
  })),
  2023: seedRows((p) => ({
    nilai: Math.round((1_700_000 + p.length * 38_000 + 220_000) / 1000) * 1000,
    sumber: "BPS_API",
  })),
  2022: seedRows((p) => ({
    nilai: Math.round((1_600_000 + p.length * 35_000 + 200_000) / 1000) * 1000,
    sumber: "IMPORT",
  })),
};

const formatRp = (v: number | null) =>
  v == null ? "—" : "Rp " + v.toLocaleString("id-ID");

const SumberBadge = ({ sumber }: { sumber: Sumber }) => {
  switch (sumber) {
    case "BPS_API":
      return (
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1">
          <CheckCircle2 className="w-3 h-3" /> BPS_API
        </Badge>
      );
    case "IMPORT":
      return (
        <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1">
          <Upload className="w-3 h-3" /> IMPORT
        </Badge>
      );
    case "MANUAL":
      return (
        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1">
          <Pencil className="w-3 h-3" /> MANUAL
        </Badge>
      );
    case "GAGAL":
      return (
        <Badge variant="outline" className="border-destructive/50 bg-destructive/10 text-destructive gap-1">
          <AlertTriangle className="w-3 h-3" /> Gagal fetch
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">Kosong</Badge>
      );
  }
};

const downloadFile = (filename: string, content: string, mime = "text/csv") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const MasterUmpPage = () => {
  const { toast } = useToast();

  const [dataset, setDataset] = useState<UmpDataset>(INITIAL_DATA);
  const [activeYear, setActiveYear] = useState<number>(2024);
  const [draftRows, setDraftRows] = useState<UmpRow[] | null>(null); // pending edits
  const [dirty, setDirty] = useState(false);

  const [addYearOpen, setAddYearOpen] = useState(false);
  const [newYear, setNewYear] = useState<string>(String(new Date().getFullYear()));

  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [emptyProvinsi, setEmptyProvinsi] = useState<string[]>([]);

  const [banner, setBanner] = useState<
    | { kind: "success" | "warning" | "error"; text: string }
    | null
  >(null);

  const years = useMemo(
    () => Object.keys(dataset).map(Number).sort((a, b) => b - a),
    [dataset],
  );

  const rows = draftRows ?? dataset[activeYear] ?? [];

  const setRows = (next: UmpRow[]) => {
    setDraftRows(next);
    setDirty(true);
  };

  /** Switch tahun — kalau ada draft dirty, konfirmasi tidak dilakukan di sini (sederhana) */
  const handleSelectYear = (val: string) => {
    if (val === "__add__") {
      setAddYearOpen(true);
      return;
    }
    const y = Number(val);
    setActiveYear(y);
    setDraftRows(null);
    setDirty(false);
    setBanner(null);
  };

  const handleAddYear = () => {
    const y = Number(newYear);
    if (!y || y < 2000 || y > 2100) {
      toast({ title: "Tahun tidak valid", description: "Masukkan tahun 4 digit." });
      return;
    }
    if (dataset[y]) {
      toast({ title: "Tahun sudah ada", description: `Data UMP ${y} sudah tersedia.` });
      setAddYearOpen(false);
      setActiveYear(y);
      return;
    }
    const empty = seedRows(() => ({ nilai: null, sumber: "KOSONG" }));
    setDataset((d) => ({ ...d, [y]: empty }));
    setActiveYear(y);
    setDraftRows(null);
    setDirty(false);
    setAddYearOpen(false);
    setBanner({ kind: "warning", text: `Tahun ${y} ditambahkan. Tabel masih kosong — gunakan Fetch BPS atau Import Excel.` });
  };

  /** Mock Fetch BPS */
  const handleFetchBps = async () => {
    setFetching(true);
    setBanner(null);
    await new Promise((r) => setTimeout(r, 1200));
    const next: UmpRow[] = rows.map((r, i) => {
      // mock: 2 baris terakhir "gagal"
      const fail = i >= rows.length - 2;
      if (fail) return { ...r, nilai: null, sumber: "GAGAL" };
      const base = 2_000_000 + r.provinsi.length * 42_000 + activeYear * 100;
      return { ...r, nilai: Math.round(base / 1000) * 1000, sumber: "BPS_API" };
    });
    setRows(next);
    setFetching(false);
    const ok = next.filter((r) => r.sumber === "BPS_API").length;
    const fail = next.length - ok;
    setBanner({
      kind: fail > 0 ? "warning" : "success",
      text: `${ok}/${next.length} provinsi berhasil difetch.${fail > 0 ? ` ${fail} provinsi gagal, isi manual.` : ""}`,
    });
  };

  /** Mock Import Excel — pakai file picker, baca CSV/XLSX (CSV parse manual) */
  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setImporting(true);
      setBanner(null);
      await new Promise((r) => setTimeout(r, 900));
      // Mock parse — fill semua provinsi dengan nilai dummy + 2 baris "tidak dikenali"
      const next: UmpRow[] = rows.map((r) => ({
        ...r,
        nilai: Math.round((1_900_000 + r.provinsi.length * 39_000) / 1000) * 1000,
        sumber: "IMPORT",
      }));
      setRows(next);
      setImporting(false);
      setBanner({
        kind: "warning",
        text: `Import selesai dari "${file.name}". 2 baris tidak dikenali ("Jawa barat", "Kalimantan Timor") diabaikan.`,
      });
    };
    input.click();
  };

  /** Download template */
  const handleTemplate = () => {
    const header = "tahun,nama_provinsi,nilai_ump";
    const body = PROVINSI.map((p) => `,${p},`).join("\n");
    downloadFile("template_ump.csv", header + "\n" + body);
    toast({ title: "Template diunduh", description: "template_ump.csv" });
  };

  /** Inline edit */
  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditingValue(rows[idx].nilai != null ? String(rows[idx].nilai) : "");
  };
  const commitEdit = () => {
    if (editingIdx == null) return;
    const raw = editingValue.replace(/[^\d]/g, "");
    const num = raw ? Number(raw) : null;
    const next = rows.map((r, i) =>
      i === editingIdx ? { ...r, nilai: num, sumber: "MANUAL" as Sumber } : r,
    );
    setRows(next);
    setEditingIdx(null);
    setEditingValue("");
  };

  /** Save */
  const handleSaveClick = () => {
    const empties = rows.filter((r) => r.nilai == null).map((r) => r.provinsi);
    if (empties.length > 0) {
      setEmptyProvinsi(empties);
      setConfirmSaveOpen(true);
      return;
    }
    void doSave();
  };

  const doSave = async () => {
    setSaving(true);
    setConfirmSaveOpen(false);
    await new Promise((r) => setTimeout(r, 900));
    const filled = rows.filter((r) => r.nilai != null);
    setDataset((d) => ({ ...d, [activeYear]: rows }));
    setDraftRows(null);
    setDirty(false);
    setSaving(false);
    setBanner({
      kind: "success",
      text: `Data UMP ${activeYear} berhasil disimpan (${filled.length} provinsi). ETL mingguan berikutnya akan menggunakan data ini.`,
    });
  };

  const filledCount = rows.filter((r) => r.nilai != null).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" /> Master UMP
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola data Upah Minimum Provinsi (UMP) 34 provinsi per tahun. Digunakan ETL untuk perhitungan KPI gaji.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tahun</Label>
              <Select value={String(activeYear)} onValueChange={handleSelectYear}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      <span className="flex items-center gap-2">
                        {y}
                        {(dataset[y]?.some((r) => r.nilai != null)) && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="__add__">
                    <span className="flex items-center gap-2 text-primary">
                      <Plus className="w-3.5 h-3.5" /> Tambah Tahun Baru
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleFetchBps} disabled={fetching || importing || saving}>
                {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                Fetch BPS
              </Button>
              <Button variant="outline" onClick={handleImportClick} disabled={fetching || importing || saving}>
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import Excel
              </Button>
              <Button variant="outline" onClick={handleTemplate}>
                <FileSpreadsheet className="w-4 h-4" />
                Template
              </Button>
              <Button onClick={handleSaveClick} disabled={!dirty || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Simpan Semua — {rows.length} provinsi
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Banner */}
        {banner && (
          <div
            role="status"
            aria-live="polite"
            className={
              "rounded-lg border px-4 py-3 text-sm flex items-start gap-2 " +
              (banner.kind === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : banner.kind === "warning"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "border-destructive/40 bg-destructive/10 text-destructive")
            }
          >
            {banner.kind === "success" ? (
              <CheckCircle2 className="w-4 h-4 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5" />
            )}
            <span>{banner.text}</span>
          </div>
        )}

        {/* Stats mini */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Tahun aktif</div><div className="text-xl font-semibold">{activeYear}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Terisi</div><div className="text-xl font-semibold">{filledCount}/{rows.length}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Status</div><div className="text-xl font-semibold">{dirty ? "Belum disimpan" : "Tersimpan"}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total tahun</div><div className="text-xl font-semibold">{years.length}</div></CardContent></Card>
        </div>

        {/* Tabel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" /> UMP {activeYear} — 34 Provinsi
              {dirty && <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-600 dark:text-amber-400">Ada perubahan</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Provinsi</TableHead>
                    <TableHead className="w-56">Nilai UMP (Rp)</TableHead>
                    <TableHead className="w-40">Sumber</TableHead>
                    <TableHead className="w-24 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody aria-busy={fetching || importing || saving}>
                  {rows.map((r, i) => (
                    <TableRow key={r.provinsi} className={r.sumber === "GAGAL" ? "bg-destructive/5" : undefined}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.provinsi}</TableCell>
                      <TableCell>
                        {editingIdx === i ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") {
                                setEditingIdx(null);
                                setEditingValue("");
                              }
                            }}
                            placeholder="Masukkan nilai UMP"
                            className="h-8"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(i)}
                            className="text-left w-full hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded px-1"
                          >
                            {r.nilai != null ? formatRp(r.nilai) : <span className="text-muted-foreground italic">Klik untuk isi…</span>}
                          </button>
                        )}
                      </TableCell>
                      <TableCell><SumberBadge sumber={r.sumber} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(i)} aria-label={`Edit ${r.provinsi}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {dirty && (
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraftRows(null);
                    setDirty(false);
                    setBanner(null);
                  }}
                >
                  <RefreshCw className="w-4 h-4" /> Batalkan Perubahan
                </Button>
                <Button onClick={handleSaveClick} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Simpan Semua
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Tambah Tahun Baru */}
      <Dialog open={addYearOpen} onOpenChange={setAddYearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Data UMP Baru</DialogTitle>
            <DialogDescription>
              Buat dataset UMP kosong untuk tahun baru. Setelah itu Anda bisa Fetch BPS atau Import Excel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-year">Tahun</Label>
            <Input
              id="new-year"
              type="number"
              min={2000}
              max={2100}
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddYearOpen(false)}>Batal</Button>
            <Button onClick={handleAddYear}>Lanjutkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Konfirmasi simpan dengan baris kosong */}
      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {emptyProvinsi.length} provinsi masih kosong
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Provinsi berikut belum memiliki nilai UMP:</p>
                <ul className="list-disc pl-5 max-h-40 overflow-auto text-sm">
                  {emptyProvinsi.map((p) => <li key={p}>{p}</li>)}
                </ul>
                <p>Lanjutkan simpan tanpa provinsi ini?</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doSave}>Simpan yang terisi saja</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default MasterUmpPage;