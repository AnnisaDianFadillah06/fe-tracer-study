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
import { useUmpManagement, type UmpSumber } from "@/hooks/useUmpManagement";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const formatRp = (v: number | null) =>
  v == null ? "—" : "Rp " + v.toLocaleString("id-ID");

const SumberBadge = ({ sumber }: { sumber: UmpSumber }) => {
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

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

const MasterUmpPage = () => {
  const {
    // data
    years,
    activeYear,
    rows,
    sudahTersimpan,
    isDirty,
    filledCount,

    // loading
    loadingInit,
    fetching,
    importing,
    saving,

    // year selector
    handleSelectYear,
    addYearOpen,
    setAddYearOpen,
    newYearInput,
    setNewYearInput,
    handleAddYear,

    // actions
    handleFetchBps,
    handleImportClick,
    handleDownloadTemplate,
    handleSaveClick,
    doSave,
    handleDiscard,

    // inline edit
    editingIdx,
    editingValue,
    setEditingValue,
    startEdit,
    commitEdit,
    cancelEdit,

    // confirm save dialog
    confirmSaveOpen,
    setConfirmSaveOpen,
    emptyProvinsi,

    // banner
    banner,
  } = useUmpManagement();

  if (loadingInit) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Memuat data UMP…</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
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
              <Select
                value={activeYear != null ? String(activeYear) : ""}
                onValueChange={handleSelectYear}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      <span className="flex items-center gap-2">
                        {y}
                        {sudahTersimpan && y === activeYear && (
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
              <Button
                variant="outline"
                onClick={handleFetchBps}
                disabled={fetching || importing || saving || activeYear == null}
              >
                {fetching
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CloudDownload className="w-4 h-4" />}
                Fetch BPS
              </Button>

              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={fetching || importing || saving || activeYear == null}
              >
                {importing
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Upload className="w-4 h-4" />}
                Import Excel
              </Button>

              <Button variant="outline" onClick={handleDownloadTemplate}>
                <FileSpreadsheet className="w-4 h-4" />
                Template
              </Button>

              <Button
                onClick={handleSaveClick}
                disabled={!isDirty || saving || activeYear == null}
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Save className="w-4 h-4" />}
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
            {banner.kind === "success"
              ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span>{banner.text}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Tahun aktif</div>
              <div className="text-xl font-semibold">{activeYear ?? "—"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Terisi</div>
              <div className="text-xl font-semibold">{filledCount}/{rows.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="text-xl font-semibold">
                {isDirty ? "Belum disimpan" : sudahTersimpan ? "Tersimpan" : "Belum ada data"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">Total tahun</div>
              <div className="text-xl font-semibold">{years.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabel */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="w-4 h-4" />
              UMP {activeYear ?? "—"} — {rows.length} Provinsi
              {isDirty && (
                <Badge variant="outline" className="ml-2 border-amber-500/40 text-amber-600 dark:text-amber-400">
                  Ada perubahan
                </Badge>
              )}
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
                    <TableRow
                      key={r.id_provinsi}
                      className={r.sumber === "GAGAL" ? "bg-destructive/5" : undefined}
                    >
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>

                      <TableCell className="font-medium">{r.nama_provinsi}</TableCell>

                      <TableCell>
                        {editingIdx === i ? (
                          <Input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") cancelEdit();
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
                            {r.nilai_ump != null
                              ? formatRp(r.nilai_ump)
                              : <span className="text-muted-foreground italic">Klik untuk isi…</span>}
                          </button>
                        )}
                      </TableCell>

                      <TableCell>
                        <SumberBadge sumber={r.sumber} />
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEdit(i)}
                          aria-label={`Edit ${r.nama_provinsi}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {isDirty && (
              <div className="mt-3 flex justify-end gap-2">
                <Button variant="outline" onClick={handleDiscard}>
                  <RefreshCw className="w-4 h-4" /> Batalkan Perubahan
                </Button>
                <Button onClick={handleSaveClick} disabled={saving}>
                  {saving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Save className="w-4 h-4" />}
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
              value={newYearInput}
              onChange={(e) => setNewYearInput(e.target.value)}
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