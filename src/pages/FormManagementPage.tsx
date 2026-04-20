import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getInitialForms,
  saveForms,
  type BuilderQuestion,
  type FormListItem,
} from "@/lib/formManagement";
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

const DaftarFormulirPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [forms, setForms] = useState<FormListItem[]>(() => getInitialForms());
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    saveForms(forms);
  }, [forms]);

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId) ?? null,
    [forms, selectedFormId],
  );

  const stats = useMemo(() => {
    const totalForms = forms.length;
    const activeForms = forms.filter((form) => form.status === "aktif").length;
    const totalRespondents = forms.reduce((acc, form) => acc + form.responses.length, 0);

    return { totalForms, activeForms, totalRespondents };
  }, [forms]);

  const handleDeleteForm = () => {
    if (!deleteTargetId) return;

    setForms((prev) => prev.filter((form) => form.id !== deleteTargetId));
    if (selectedFormId === deleteTargetId) {
      setSelectedFormId(null);
    }
    setDeleteTargetId(null);

    toast({ title: "Berhasil", description: "Formulir berhasil dihapus." });
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
              Manajemen formulir tracer study
            </div>
            <h2 className="font-heading text-2xl font-bold sm:text-3xl">Form Management</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Kelola formulir, buka mode builder penuh untuk tambah/edit, lihat preview, dan unduh hasil respon CSV.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <Button onClick={() => navigate("/dashboard/form-management/new")} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Formulir
            </Button>
            <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Total formulir</p>
                  <p className="mt-1 text-2xl font-bold">{stats.totalForms}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Form aktif</p>
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
                  {forms.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        Belum ada formulir. Klik tombol "Tambah Formulir" untuk membuat formulir baru.
                      </TableCell>
                    </TableRow>
                  )}
                  {forms.map((form, index) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium leading-snug">{form.title}</p>
                          <p className="text-xs text-muted-foreground">{form.sections.length} bagian formulir</p>
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
                        <p className="text-sm leading-snug">{form.target || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => setSelectedFormId(form.id)}>
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

      <Dialog open={Boolean(selectedForm)} onOpenChange={(open) => !open && setSelectedFormId(null)}>
        <DialogContent className="max-w-5xl p-0 sm:max-h-[90vh] sm:rounded-2xl">
          {selectedForm && (
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader className="border-b border-border px-6 py-5 text-left">
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle className="text-xl">{selectedForm.title}</DialogTitle>
                  <Badge variant="outline" className={statusStyles[selectedForm.status]}>
                    {selectedForm.status === "aktif" ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <DialogDescription className="flex flex-wrap gap-4 pt-2">
                  <span>{selectedForm.target || "Tanpa sasaran"}</span>
                  <span>•</span>
                  <span>{selectedForm.responses.length} responden</span>
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[calc(90vh-88px)]">
                <div className="space-y-6 px-6 py-6">
                  {selectedForm.sections.map((section, sectionIndex) => (
                    <Card key={section.id} className="border-t-4 border-t-primary/70">
                      <CardContent className="space-y-5 pt-5">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-heading text-lg font-semibold">{section.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              Bagian {sectionIndex + 1}
                            </Badge>
                          </div>
                          {section.description && <p className="text-sm text-muted-foreground">{section.description}</p>}
                        </div>

                        <div className="space-y-4">
                          {section.questions.map((question) => (
                            <div key={question.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                  <Label className="text-sm font-medium leading-snug">
                                    {question.question || "Pertanyaan tanpa judul"}
                                    {question.required && <span className="ml-1 text-destructive">*</span>}
                                  </Label>
                                </div>
                              </div>
                              <PreviewQuestionField question={question} />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Formulir?</AlertDialogTitle>
            <AlertDialogDescription>
              Formulir yang dihapus tidak bisa dipulihkan. Data respon terkait juga akan ikut terhapus dari daftar.
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

interface PreviewQuestionFieldProps {
  question: BuilderQuestion;
}

const PreviewQuestionField = ({ question }: PreviewQuestionFieldProps) => {
  switch (question.type) {
    case "short":
      return <Input disabled placeholder="Jawaban singkat" className="max-w-xl bg-background" />;

    case "paragraph":
      return <Textarea disabled placeholder="Jawaban panjang" rows={4} className="max-w-2xl bg-background" />;

    case "multiple_choice":
      return (
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <div
              key={`${question.id}-multiple-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
            >
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
              <span className="text-sm">{option}</span>
            </div>
          ))}
          {question.allowOther && (
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
              <span className="text-sm">Other</span>
            </div>
          )}
        </div>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          {question.options.map((option, index) => (
            <div
              key={`${question.id}-checkbox-${index}`}
              className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2"
            >
              <Checkbox disabled />
              <span className="text-sm">{option}</span>
            </div>
          ))}
          {question.allowOther && (
            <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
              <Checkbox disabled />
              <span className="text-sm">Other</span>
            </div>
          )}
        </div>
      );

    case "dropdown":
      return (
        <Select disabled>
          <SelectTrigger className="max-w-xl bg-background">
            <SelectValue placeholder="Pilih salah satu" />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((option, index) => (
              <SelectItem key={`${question.id}-dropdown-${index}`} value={`${index}`}>
                {option}
              </SelectItem>
            ))}
            {question.allowOther && <SelectItem value="other">Other</SelectItem>}
          </SelectContent>
        </Select>
      );

    case "linear_scale": {
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 5;
      const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, idx) => min + idx);

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {values.map((value) => (
              <div
                key={`${question.id}-scale-${value}`}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background text-sm"
              >
                {value}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }

    case "rating":
      return (
        <div className="flex gap-2 text-muted-foreground">
          {Array.from({ length: 5 }).map((_, index) => (
            <span key={`${question.id}-rating-${index}`}>☆</span>
          ))}
        </div>
      );

    case "date":
      return <Input type="date" disabled className="max-w-xs bg-background" />;

    case "time":
      return <Input type="time" disabled className="max-w-xs bg-background" />;

    default:
      return (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Preview untuk tipe ini tersedia setelah renderer responden terintegrasi penuh.
        </div>
      );
  }
};

export default DaftarFormulirPage;
