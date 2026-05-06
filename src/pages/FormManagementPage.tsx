import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getInitialForms, saveForms, type FormListItem } from "@/lib/formManagement";
import {
  CheckCircle2,
  Download,
  Edit,
  Eye,
  FileText,
  Plus,
  Trash2,
  Users,
  XCircle,
  Search,
} from "lucide-react";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));

const formatAnswer = (value: string | number | string[] | undefined) => {
  if (Array.isArray(value)) return value.join("; ");
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
};

const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;

const statusStyles = {
  aktif: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  nonaktif: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const DaftarKuisionerPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [forms, setForms] = useState<FormListItem[]>(() => getInitialForms());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "aktif" | "nonaktif">("all");

  useEffect(() => {
    saveForms(forms);
  }, [forms]);

  const stats = useMemo(() => {
    const totalForms = forms.length;
    const activeForms = forms.filter((form) => form.status === "aktif").length;
    const totalRespondents = forms.reduce((acc, form) => acc + form.responses.length, 0);

    return { totalForms, activeForms, totalRespondents };
  }, [forms]);

  const filtered = useMemo(() => {
    return forms.filter((form) => {
      const matchSearch =
        !searchQuery ||
        form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.target.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === "all" || form.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [forms, searchQuery, statusFilter]);

  const handleDeleteForm = () => {
    if (!deleteTargetId) return;

    setForms((prev) => prev.filter((form) => form.id !== deleteTargetId));
    setDeleteTargetId(null);

    toast({ title: "Berhasil", description: "Kuisioner berhasil dihapus." });
  };

  const downloadCsv = (form: FormListItem) => {
    const questionColumns = form.sections.flatMap((section) =>
      section.questions.map((question) => question.question || "Pertanyaan tanpa judul"),
    );
    const headers = ["Responden", "Tanggal Pengisian", ...questionColumns];

    const rows = form.responses.map((response) => {
      const cells = [
        response.respondent,
        formatDate(response.submittedAt),
        ...form.sections.flatMap((section) =>
          section.questions.map((question) => formatAnswer(response.answers[question.id])),
        ),
      ];
      return cells.map((cell) => escapeCsv(cell)).join(",");
    });

    const csv = [headers.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Unduhan CSV siap",
      description: `Data respon untuk ${form.title} sedang diunduh.`,
    });
  };

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
              Kelola kuisioner, buka mode builder penuh untuk tambah/edit, lihat preview, dan unduh hasil respon CSV.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <Button onClick={() => navigate("/dashboard/form-management/new")} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Kuisioner
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
                  placeholder="Cari kuisioner berdasarkan judul, deskripsi, atau sasaran..."
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
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
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
                    <TableHead>Responden</TableHead>
                    <TableHead className="w-36">Status</TableHead>
                    <TableHead>Sasaran</TableHead>
                    <TableHead className="w-[420px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        {searchQuery || statusFilter !== "all"
                          ? "Tidak ada kuisioner yang sesuai dengan pencarian."
                          : "Belum ada kuisioner. Klik tombol \"Tambah Kuisioner\" untuk membuat kuisioner baru."}
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((form, index) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium leading-snug">{form.title}</p>
                          <p className="text-xs text-muted-foreground">{form.sections.length} bagian kuisioner</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{form.responses.length} responden</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {form.respondents.slice(0, 2).join(", ")}
                            {form.respondents.length > 2 ? ` +${form.respondents.length - 2} lainnya` : ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[form.status]}>
                          {form.status === "aktif" ? (
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                          )}
                          {form.status === "aktif" ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm leading-snug">
                          {form.target.length > 0 ? form.target.join(", ") : "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(
                                `/dashboard/form-management/${form.id}/preview`,
                                "_blank",
                                "noopener,noreferrer",
                              )
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/form-management/${form.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button size="sm" onClick={() => downloadCsv(form)}>
                            <Download className="mr-2 h-4 w-4" />
                            Unduh
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTargetId(form.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus
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

      <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kuisioner?</AlertDialogTitle>
            <AlertDialogDescription>
              Kuisioner yang dihapus tidak bisa dipulihkan. Data respon terkait juga akan ikut terhapus dari daftar.
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
    </DashboardLayout>
  );
};

export default DaftarKuisionerPage;
