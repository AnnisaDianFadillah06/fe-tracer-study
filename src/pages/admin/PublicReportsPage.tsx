import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import { formatFileSize, publicReportPreviewUrl } from "@/lib/publicReports";
import {
  Download, ExternalLink, FileText, Loader2, Pencil, Plus, Trash2, Upload,
} from "lucide-react";

interface PublicReport {
  id: number;
  title: string;
  description: string | null;
  report_year: number;
  file_name: string;
  file_size: number;
  is_published: boolean;
  published_at: string | null;
  download_count: number;
  uploaded_by_name: string | null;
}

/**
 * Kelola laporan Tracer Study tahunan yang bisa diunduh masyarakat umum.
 * Hanya Ketua Tracer (permission admin.public_report; BE menggate dengan
 * role:head_tracer).
 *
 * Berkas TIDAK bisa diganti lewat halaman ini — untuk mengganti PDF, laporan
 * dihapus lalu diunggah ulang. Ini disengaja: laporan yang sudah dipublikasikan
 * tidak boleh berubah isinya diam-diam sementara judul dan tautannya tetap.
 */
const PublicReportsPage = () => {
  const { toast } = useToast();

  const [reports, setReports] = useState<PublicReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // ── Penyuntingan keterangan laporan ────────────────────────────────────
  // Berkas PDF-nya sendiri TIDAK dapat diganti dari sini; yang disunting
  // hanya judul, keterangan, dan tahun. Untuk mengganti berkasnya, laporan
  // dihapus lalu diunggah ulang — sengaja, supaya jumlah unduhan dan tanggal
  // terbit tidak menempel pada berkas yang isinya sudah berbeda.
  const [editTarget, setEditTarget] = useState<PublicReport | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editYear, setEditYear] = useState("");
  const [isSavingEdit, setSavingEdit] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));
  const [file, setFile] = useState<File | null>(null);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get("/admin/public-reports");
      if (data.success) setReports(data.data ?? []);
    } catch {
      toast({ title: "Gagal", description: "Gagal memuat daftar laporan.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setReportYear(String(new Date().getFullYear()));
    setFile(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Gagal", description: "Pilih berkas PDF terlebih dahulu.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("report_year", reportYear);
      formData.append("file", file);

      const { data } = await api.post("/admin/public-reports", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data.success) {
        toast({ title: "Berhasil", description: data.message });
        setUploadOpen(false);
        resetForm();
        fetchReports();
      }
    } catch (err: unknown) {
      toast({ title: "Gagal", description: uploadErrorMessage(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (report: PublicReport) => {
    setEditTarget(report);
    setEditTitle(report.title);
    setEditDescription(report.description ?? "");
    setEditYear(String(report.report_year));
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;

    const judul = editTitle.trim();
    if (!judul) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      const { data } = await api.put(`/admin/public-reports/${editTarget.id}`, {
        title: judul,
        // Keterangan kosong dikirim sebagai null, bukan untai kosong, supaya
        // pengosongan benar-benar tersimpan sebagai tidak ada keterangan.
        description: editDescription.trim() || null,
        report_year: Number(editYear),
      });
      if (data.success) {
        setReports((prev) => prev.map((r) => (r.id === editTarget.id ? data.data : r)));
        setEditTarget(null);
        toast({ title: "Berhasil", description: "Keterangan laporan diperbarui." });
      }
    } catch (err: unknown) {
      toast({
        title: "Gagal",
        description:
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? "Gagal menyimpan perubahan.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTogglePublish = async (report: PublicReport) => {
    setTogglingId(report.id);
    try {
      const { data } = await api.put(`/admin/public-reports/${report.id}`, {
        is_published: !report.is_published,
      });
      if (data.success) {
        setReports((prev) => prev.map((r) => (r.id === report.id ? data.data : r)));
        toast({
          title: "Berhasil",
          description: data.data.is_published
            ? "Laporan sekarang tampil di halaman publik."
            : "Laporan disembunyikan dari halaman publik.",
        });
      }
    } catch {
      toast({ title: "Gagal", description: "Gagal mengubah status publikasi.", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (deleteTargetId === null) return;
    try {
      const { data } = await api.delete(`/admin/public-reports/${deleteTargetId}`);
      if (data.success) {
        setReports((prev) => prev.filter((r) => r.id !== deleteTargetId));
        toast({ title: "Berhasil", description: data.message });
      }
    } catch {
      toast({ title: "Gagal", description: "Gagal menghapus laporan.", variant: "destructive" });
    } finally {
      setDeleteTargetId(null);
    }
  };

  const publishedCount = reports.filter((r) => r.is_published).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-bold">Laporan Publik</h2>
            <p className="text-muted-foreground text-sm">
              Laporan Tracer Study tahunan yang bisa diunduh masyarakat umum
            </p>
          </div>
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Unggah Laporan
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total Laporan" value={reports.length} />
          <StatCard label="Tampil di Publik" value={publishedCount} />
          <StatCard
            label="Total Unduhan"
            value={reports.reduce((sum, r) => sum + r.download_count, 0)}
          />
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">Daftar Laporan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Tahun</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead className="w-32">Ukuran</TableHead>
                    <TableHead className="w-28">Unduhan</TableHead>
                    <TableHead className="w-40">Tampil Publik</TableHead>
                    <TableHead className="w-32 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                          Memuat laporan…
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Belum ada laporan yang diunggah.
                      </TableCell>
                    </TableRow>
                  ) : reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium tabular-nums">{report.report_year}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium leading-snug">{report.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.file_name}
                            {report.uploaded_by_name ? ` • diunggah ${report.uploaded_by_name}` : ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{formatFileSize(report.file_size)}</TableCell>
                      <TableCell className="text-sm tabular-nums">{report.download_count}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={report.is_published}
                            disabled={togglingId === report.id}
                            aria-label={`Tampilkan ${report.title} di halaman publik`}
                            onCheckedChange={() => handleTogglePublish(report)}
                          />
                          <Badge variant={report.is_published ? "default" : "outline"} className="text-xs">
                            {report.is_published ? "Tampil" : "Draf"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Pratinjau hanya berlaku untuk laporan terbit -- route
                              publiknya menolak yang masih draf. */}
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            disabled={!report.is_published}
                            title={report.is_published ? "Buka pratinjau publik" : "Terbitkan dulu untuk melihat pratinjau"}
                            onClick={() => window.open(publicReportPreviewUrl(report.id), "_blank", "noopener")}
                          >
                            <ExternalLink className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            title="Sunting judul, keterangan, dan tahun"
                            onClick={() => openEdit(report)}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-9 w-9"
                            title="Hapus laporan"
                            onClick={() => setDeleteTargetId(report.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isUploadOpen} onOpenChange={(open) => { setUploadOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Unggah Laporan Tracer Study</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-title">Judul</Label>
              <Input
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Laporan Tracer Study Tahun Pelaksanaan 2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-year">Tahun Pelaksanaan</Label>
              <Input
                id="report-year"
                type="number"
                min={1990}
                max={2100}
                value={reportYear}
                onChange={(e) => setReportYear(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-description">Deskripsi (opsional)</Label>
              <Textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-file">Berkas PDF</Label>
              <Input
                id="report-file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">
                Hanya PDF, maksimal 50 MB. Laporan diunggah sebagai draf — nyalakan
                “Tampil Publik” di daftar setelah isinya diperiksa.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button onClick={handleUpload} disabled={isSubmitting || !title || !file}>
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Mengunggah…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" aria-hidden />Unggah</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sunting keterangan laporan */}
      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sunting Laporan</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-title">Judul</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Laporan Tracer Study 2025"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Keterangan</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Opsional"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-year">Tahun laporan</Label>
              <Input
                id="edit-year"
                type="number"
                value={editYear}
                onChange={(e) => setEditYear(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Berkas PDF-nya tidak dapat diganti dari sini. Untuk mengganti berkas, hapus
              laporan ini lalu unggah ulang — jumlah unduhan dan tanggal terbit sengaja tidak
              dibawa ke berkas yang isinya sudah berbeda.
              {editTarget?.is_published && " Perubahan langsung terlihat di halaman publik."}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={isSavingEdit}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit || !editTitle.trim()}>
              {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus laporan ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Berkas PDF-nya ikut terhapus dari server dan tautan unduhan yang sudah
              tersebar akan berhenti bekerja. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card>
    <CardContent className="flex items-center gap-3 pt-4 pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="h-5 w-5 text-primary" aria-hidden />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </CardContent>
  </Card>
);

/**
 * PHP menolak unggahan yang melewati upload_max_filesize SEBELUM Laravel
 * sempat memvalidasi, dan yang sampai ke sini adalah 413 atau body kosong
 * tanpa pesan yang berguna. Tanpa penanganan khusus, pengguna hanya melihat
 * "gagal" tanpa tahu bahwa penyebabnya ukuran berkas.
 */
function uploadErrorMessage(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response;

  if (response?.status === 413) {
    return "Berkas terlalu besar untuk diterima server. Hubungi pengelola untuk menaikkan batas unggah PHP.";
  }

  const firstError = response?.data?.errors ? Object.values(response.data.errors)[0]?.[0] : undefined;

  return firstError || response?.data?.message || "Gagal mengunggah laporan.";
}

export default PublicReportsPage;
