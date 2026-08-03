import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/common/use-toast";
import { useRole } from "@/contexts/RoleContext";
import type { BackendQuestionnaire } from "@/lib/formManagement";
import { backendToFormListItem, saveForms, getInitialForms } from "@/lib/formManagement";
import api from "@/lib/api";
import {
  CheckCircle2,
  Edit,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Users,
  XCircle,
  Search,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  published: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  draft: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const statusLabel: Record<string, string> = {
  published: "Published",
  draft: "Draft",
};

const DaftarKuisionerPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { currentRole } = useRole();
  const isHeadTracer = currentRole === "head_tracer";

  const [forms, setForms] = useState<BackendQuestionnaire[]>([]);
  const [programMap, setProgramMap] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteRequestDialogId, setDeleteRequestDialogId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">((searchParams.get("status") as any) || "all");
  const [exportingId, setExportingId] = useState<number | null>(null);
  const [page, setPageRaw] = useState(Number(searchParams.get("page")) || 1);
  const [graduationYearFilter, setGraduationYearFilterRaw] = useState(searchParams.get("year") || "all");
  const [paginationMeta, setPaginationMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });

  const setPage = (p: number) => {
    setPageRaw(p);
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    setSearchParams(params, { replace: true });
  };
  const setGraduationYearFilter = (v: string) => {
    setGraduationYearFilterRaw(v);
    setPageRaw(1);
    const params = new URLSearchParams(searchParams);
    params.set("year", v);
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  };

  // Fetch questionnaires from backend (paginated)
  useEffect(() => {
    const fetchForms = async () => {
      setIsLoading(true);
      try {
        const params: Record<string, string> = { page: String(page), per_page: "100" };
        if (graduationYearFilter !== "all") params.graduation_year = graduationYearFilter;
        if (searchQuery) params.search = searchQuery;
        const { data } = await api.get("/questionnaires", { params });
        if (data.success && data.data) {
          // Paginated response has data.data.data (nested)
          const payload = data.data;
          if (payload.data && payload.current_page) {
            setForms(payload.data);
            setPaginationMeta({ currentPage: payload.current_page, lastPage: payload.last_page, total: payload.total });
          } else {
            // Fallback: non-paginated response (backward compat)
            setForms(Array.isArray(payload) ? payload : []);
            setPaginationMeta({ currentPage: 1, lastPage: 1, total: Array.isArray(payload) ? payload.length : 0 });
          }
        }
      } catch (err) {
        console.error("[FormManagementPage] Failed to fetch questionnaires:", err);
        toast({
          title: "Gagal memuat data",
          description: "Tidak dapat mengambil data kuisioner dari server.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchForms();
  }, [page, graduationYearFilter, searchQuery]);

  useEffect(() => {
    api.get("/programs").then(({ data }) => {
      const programs = data.data ?? data;
      if (Array.isArray(programs)) {
        const map: Record<number, string> = {};
        programs.forEach((p: any) => { map[p.id] = `${p.name}${p.degree ? ` (${p.degree})` : ""}`; });
        setProgramMap(map);
      }
    }).catch(() => {});
  }, []);

  const stats = useMemo(() => {
    const totalForms = paginationMeta.total;
    const activeForms = forms.filter((form) => form.status === "published").length;
    const totalRespondents = forms.reduce((acc, form) => acc + (form.response_count ?? 0), 0);

    return { totalForms, activeForms, totalRespondents };
  }, [forms, paginationMeta]);

  const filtered = useMemo(() => {
    return forms.filter((form) => {
      const matchSearch =
        !searchQuery ||
        form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.code?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" || form.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [forms, searchQuery, statusFilter]);

  const handleDeleteForm = async () => {
    if (deleteTargetId === null) return;
    try {
      const { data } = await api.delete(`/questionnaires/${deleteTargetId}`);
      if (data.success) {
        setForms((prev) => prev.filter((form) => form.id !== deleteTargetId));
        toast({ title: "Berhasil", description: "Kuisioner berhasil dihapus." });
      } else {
        toast({ title: "Gagal", description: data.message, variant: "destructive" });
      }
    } catch (err: any) {
      const message = err.response?.data?.message || "Gagal menghapus kuisioner.";
      toast({ title: "Gagal", description: message, variant: "destructive" });
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleExport = async (form: BackendQuestionnaire) => {
    setExportingId(form.id);
    try {
      const response = await api.get("/reports/export-alumni", {
        params: { questionnaire_id: form.id },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export_${form.code}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export berhasil",
        description: `File Excel untuk "${form.title}" sedang diunduh.`,
      });
    } catch {
      toast({
        title: "Gagal",
        description: "Gagal mengekspor data. Pastikan Anda sudah login sebagai admin.",
        variant: "destructive",
      });
    } finally {
      setExportingId(null);
    }
  };

  const handlePreview = (form: BackendQuestionnaire) => {
    // Bridge: convert backend data to FormListItem and store in localStorage for preview page
    const formListItem = backendToFormListItem(form);
    const allForms = getInitialForms();
    const existsIndex = allForms.findIndex((f) => f.id === formListItem.id);
    if (existsIndex >= 0) {
      allForms[existsIndex] = formListItem;
    } else {
      allForms.unshift(formListItem);
    }
    saveForms(allForms);
    window.open(
      `/dashboard/form-management/${form.id}/preview`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleOpenRespondents = (formId: number) => {
    navigate(`/dashboard/form-management/${formId}/respondents`);
  };

  const handleEdit = (form: BackendQuestionnaire) => {
    navigate(`/dashboard/form-management/${form.id}/edit`);
  };

  const deleteTarget = deleteTargetId !== null ? forms.find((f) => f.id === deleteTargetId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Manajemen kuisioner tracer study
            </div>
            <h2 className="font-heading text-2xl font-bold sm:text-3xl">Manajemen Kuisioner</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Kelola kuisioner, lihat preview, edit, hapus, dan export hasil respon ke Excel.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <Button onClick={() => navigate("/dashboard/form-management/new")} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {isHeadTracer ? "Tambah Kuisioner" : "Ajukan Kuisioner Baru"}
            </Button>
            <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total kuisioner</p>
                  <p className="mt-1 text-2xl font-bold">{stats.totalForms}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Kuisioner aktif</p>
                  <p className="mt-1 text-2xl font-bold">{stats.activeForms}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total respon</p>
                  <p className="mt-1 text-2xl font-bold">{stats.totalRespondents}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cari kuisioner berdasarkan judul, deskripsi, atau kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <Select value={graduationYearFilter} onValueChange={(v) => { setGraduationYearFilter(v); setPage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Tahun Lulusan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">No</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Sasaran</TableHead>
                    <TableHead>Responden</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead className="w-[420px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Memuat kuisioner dari server...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        {searchQuery || statusFilter !== "all"
                          ? "Tidak ada kuisioner yang sesuai dengan pencarian."
                          : "Belum ada kuisioner di database."}
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    filtered.map((form, index) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium leading-snug">{form.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {form.code} • {(form.sections ?? []).length} bagian
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {(form as any).target_graduation_years?.length > 0
                              ? `Lulusan ${(form as any).target_graduation_years.join(", ")}`
                              : (form.target || `Lulusan ${form.period_year}`)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 font-medium"
                              onClick={() => handleOpenRespondents(form.id)}
                            >
                              {form.response_count ?? 0} responden
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {form.is_global
                              ? <Badge variant="secondary" className="text-xs">Semua Prodi</Badge>
                              : <Badge variant="outline" className="text-xs">{programMap[form.program_id!] ?? `Prodi #${form.program_id}`}</Badge>
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusStyles[form.status] ?? statusStyles.draft}
                          >
                            {form.status === "published" ? (
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="mr-1 h-3.5 w-3.5" />
                            )}
                            {statusLabel[form.status] ?? form.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(form)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(form)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={exportingId === form.id || (form.response_count ?? 0) === 0}
                              title={
                                (form.response_count ?? 0) === 0
                                  ? "Tidak ada responden untuk diekspor"
                                  : "Export ke Excel"
                              }
                              onClick={() => handleExport(form)}
                            >
                              <FileSpreadsheet className="mr-2 h-4 w-4" />
                              {exportingId === form.id ? "Mengekspor..." : "Export"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={(form.response_count ?? 0) > 0}
                              title={
                                (form.response_count ?? 0) > 0
                                  ? `Tidak bisa dihapus: ${form.response_count} responden`
                                  : isHeadTracer ? "Hapus kuisioner" : "Ajukan penghapusan"
                              }
                              onClick={() => {
                                if (isHeadTracer) {
                                  setDeleteTargetId(form.id);
                                } else {
                                  setDeleteRequestDialogId(form.id);
                                  setDeleteReason("");
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {isHeadTracer ? "Hapus" : "Ajukan Hapus"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            {paginationMeta.lastPage > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">Menampilkan halaman {paginationMeta.currentPage} dari {paginationMeta.lastPage} ({paginationMeta.total} kuesioner)</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>
                    <span className="sr-only">First</span>«
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                    <span className="sr-only">Prev</span>‹
                  </Button>
                  {Array.from({ length: Math.min(5, paginationMeta.lastPage) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, paginationMeta.lastPage - 4));
                    const p = start + i;
                    if (p > paginationMeta.lastPage) return null;
                    return (
                      <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>
                        {p}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= paginationMeta.lastPage} onClick={() => setPage(page + 1)}>
                    <span className="sr-only">Next</span>›
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= paginationMeta.lastPage} onClick={() => setPage(paginationMeta.lastPage)}>
                    <span className="sr-only">Last</span>»
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kuisioner?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Kuisioner "${deleteTarget.title}" akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.`
                : "Kuisioner yang dihapus tidak bisa dipulihkan."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteForm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog pengajuan hapus (tracer_team) */}
      <Dialog open={deleteRequestDialogId !== null} onOpenChange={(open) => { if (!open) setDeleteRequestDialogId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajukan Penghapusan Kuesioner</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Kuesioner: <strong>{forms.find((f) => f.id === deleteRequestDialogId)?.title}</strong>
            </p>
            <div>
              <Label>Alasan Penghapusan *</Label>
              <Textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Jelaskan alasan mengapa kuesioner ini perlu dihapus..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRequestDialogId(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={!deleteReason.trim()}
              onClick={async () => {
                const form = forms.find((f) => f.id === deleteRequestDialogId);
                if (!form) return;
                try {
                  await api.post("/approvals/request-delete", {
                    questionnaire_id: form.id,
                    title: form.title,
                    note: deleteReason,
                  });
                  toast({ title: "Request Terkirim", description: `Permintaan hapus "${form.title}" telah dikirim ke Super Admin.` });
                } catch {
                  toast({ title: "Gagal", description: "Gagal mengirim request.", variant: "destructive" });
                }
                setDeleteRequestDialogId(null);
                setDeleteReason("");
              }}
            >
              Ajukan Penghapusan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DaftarKuisionerPage;
