import { useMemo, useState } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { FormSection, Question } from "@/hooks/useQuestionManagement";
import {
  CheckCircle2,
  Download,
  Edit,
  Eye,
  FileText,
  Plus,
  Star,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";

interface FormResponseMock {
  respondent: string;
  submittedAt: string;
  answers: Record<string, string | number | string[]>;
}

interface FormListItem {
  id: string;
  title: string;
  target: string;
  isActive: boolean;
  respondents: string[];
  sections: FormSection[];
  responses: FormResponseMock[];
}

const initialForms: FormListItem[] = [
  {
    id: "form-2026-it",
    title: "Tracer Study Lulusan Teknik Informatika 2026",
    target: "Lulusan Angkatan 2026",
    isActive: true,
    respondents: ["Ayu Pratama", "Dimas Saputra", "Nabila Rahma", "Rizky Hidayat"],
    sections: [
      {
        id: "section-1",
        title: "Identitas Responden",
        description: "Data dasar lulusan untuk kebutuhan pemetaan tracer study.",
        questions: [
          {
            id: "q-1",
            type: "short",
            question: "Nama lengkap",
            options: [],
            required: true,
          },
          {
            id: "q-2",
            type: "dropdown",
            question: "Status pekerjaan saat ini",
            options: [
              { id: "o-1", label: "Bekerja" },
              { id: "o-2", label: "Wiraswasta" },
              { id: "o-3", label: "Studi lanjut" },
              { id: "o-4", label: "Mencari kerja" },
            ],
            required: true,
          },
        ],
      },
      {
        id: "section-2",
        title: "Kesesuaian Pendidikan",
        description: "Masukan untuk evaluasi kurikulum dan kompetensi lulusan.",
        questions: [
          {
            id: "q-3",
            type: "linear_scale",
            question: "Seberapa relevan pendidikan Anda dengan pekerjaan saat ini?",
            options: [],
            required: true,
            scaleMin: 1,
            scaleMax: 5,
            scaleMinLabel: "Tidak relevan",
            scaleMaxLabel: "Sangat relevan",
          },
          {
            id: "q-4",
            type: "paragraph",
            question: "Ceritakan masukan Anda untuk program studi",
            options: [],
            required: false,
          },
        ],
      },
    ],
    responses: [
      {
        respondent: "Ayu Pratama",
        submittedAt: "2026-03-18",
        answers: {
          "q-1": "Ayu Pratama",
          "q-2": "Bekerja",
          "q-3": 4,
          "q-4": "Lebih banyak praktik industri akan sangat membantu.",
        },
      },
      {
        respondent: "Dimas Saputra",
        submittedAt: "2026-03-19",
        answers: {
          "q-1": "Dimas Saputra",
          "q-2": "Studi lanjut",
          "q-3": 5,
          "q-4": "Materi pemrograman sudah sangat relevan.",
        },
      },
    ],
  },
  {
    id: "form-2025-satisfaction",
    title: "Survei Kepuasan Alumni 2025",
    target: "Lulusan Angkatan 2025",
    isActive: false,
    respondents: ["Nabila Rahma", "Fahri Maulana"],
    sections: [
      {
        id: "section-3",
        title: "Evaluasi Pengalaman Kuliah",
        questions: [
          {
            id: "q-5",
            type: "multiple_choice",
            question: "Bagaimana Anda menilai layanan akademik?",
            options: [
              { id: "o-5", label: "Sangat baik" },
              { id: "o-6", label: "Baik" },
              { id: "o-7", label: "Cukup" },
              { id: "o-8", label: "Perlu perbaikan" },
            ],
            required: true,
          },
          {
            id: "q-6",
            type: "checkbox",
            question: "Fasilitas yang paling sering Anda gunakan",
            options: [
              { id: "o-9", label: "Perpustakaan" },
              { id: "o-10", label: "Laboratorium" },
              { id: "o-11", label: "Ruang diskusi" },
            ],
            required: false,
          },
        ],
      },
    ],
    responses: [
      {
        respondent: "Nabila Rahma",
        submittedAt: "2025-11-02",
        answers: {
          "q-5": "Baik",
          "q-6": ["Perpustakaan", "Laboratorium"],
        },
      },
    ],
  },
  {
    id: "form-2026-industry",
    title: "Formulir Tindak Lanjut Mitra Industri",
    target: "Mitra Industri",
    isActive: true,
    respondents: ["PT Inovasi Nusantara", "CV Solusi Digital"],
    sections: [
      {
        id: "section-4",
        title: "Informasi Perusahaan",
        questions: [
          {
            id: "q-7",
            type: "short",
            question: "Nama perusahaan",
            options: [],
            required: true,
          },
          {
            id: "q-8",
            type: "date",
            question: "Tanggal kerja sama dimulai",
            options: [],
            required: true,
          },
        ],
      },
    ],
    responses: [
      {
        respondent: "PT Inovasi Nusantara",
        submittedAt: "2026-04-02",
        answers: {
          "q-7": "PT Inovasi Nusantara",
          "q-8": "2026-04-02",
        },
      },
      {
        respondent: "CV Solusi Digital",
        submittedAt: "2026-04-10",
        answers: {
          "q-7": "CV Solusi Digital",
          "q-8": "2026-04-10",
        },
      },
    ],
  },
];

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
  true: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  false: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

interface FormEditorData {
  title: string;
  target: string;
  isActive: "aktif" | "nonaktif";
  respondents: string;
}

const emptyEditorData: FormEditorData = {
  title: "",
  target: "",
  isActive: "aktif",
  respondents: "",
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const DaftarFormulirPage = () => {
  const { toast } = useToast();
  const [forms, setForms] = useState<FormListItem[]>(initialForms);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editorData, setEditorData] = useState<FormEditorData>(emptyEditorData);

  const selectedForm = useMemo(
    () => forms.find((form) => form.id === selectedFormId) ?? null,
    [forms, selectedFormId],
  );

  const stats = useMemo(() => {
    const totalForms = forms.length;
    const activeForms = forms.filter((form) => form.isActive).length;
    const totalRespondents = forms.reduce((acc, form) => acc + form.responses.length, 0);

    return { totalForms, activeForms, totalRespondents };
  }, [forms]);

  const resetEditor = () => {
    setEditorData(emptyEditorData);
    setEditingFormId(null);
  };

  const openCreateDialog = () => {
    resetEditor();
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (form: FormListItem) => {
    setEditingFormId(form.id);
    setEditorData({
      title: form.title,
      target: form.target,
      isActive: form.isActive ? "aktif" : "nonaktif",
      respondents: form.respondents.join(", "),
    });
    setIsFormDialogOpen(true);
  };

  const handleSaveForm = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editorData.title.trim() || !editorData.target.trim()) {
      toast({
        title: "Data belum lengkap",
        description: "Judul dan sasaran formulir wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    const parsedRespondents = editorData.respondents
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (editingFormId) {
      setForms((prev) =>
        prev.map((form) =>
          form.id === editingFormId
            ? {
                ...form,
                title: editorData.title.trim(),
                target: editorData.target.trim(),
                isActive: editorData.isActive === "aktif",
                respondents: parsedRespondents,
              }
            : form,
        ),
      );
      toast({ title: "Berhasil", description: "Formulir berhasil diperbarui." });
    } else {
      const nowId = Date.now();
      const newForm: FormListItem = {
        id: `form-${toSlug(editorData.title)}-${nowId}`,
        title: editorData.title.trim(),
        target: editorData.target.trim(),
        isActive: editorData.isActive === "aktif",
        respondents: parsedRespondents,
        sections: [
          {
            id: `section-${nowId}`,
            title: "Bagian 1",
            description: "Bagian awal formulir.",
            questions: [],
          },
        ],
        responses: [],
      };
      setForms((prev) => [newForm, ...prev]);
      toast({ title: "Berhasil", description: "Formulir baru berhasil ditambahkan." });
    }

    setIsFormDialogOpen(false);
    resetEditor();
  };

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
              Pantau formulir yang tersedia, lihat preview isinya, dan unduh hasil respon dalam format CSV.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
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
                    <TableHead className="w-36">Aktif</TableHead>
                    <TableHead>Sasaran</TableHead>
                    <TableHead className="w-[420px] text-right">Detail</TableHead>
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
                        <Badge variant="outline" className={statusStyles[String(form.isActive) as keyof typeof statusStyles]}>
                          {form.isActive ? (
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          ) : (
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                          )}
                          {form.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm leading-snug">{form.target}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                          <Button variant="outline" size="sm" onClick={() => setSelectedFormId(form.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(form)}>
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

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
        setIsFormDialogOpen(open);
        if (!open) resetEditor();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFormId ? "Edit Formulir" : "Tambah Formulir"}</DialogTitle>
            <DialogDescription>
              Kelola metadata formulir untuk kebutuhan manajemen dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveForm} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="form-title">Judul Formulir</Label>
              <Input
                id="form-title"
                placeholder="Contoh: Tracer Study Lulusan 2026"
                value={editorData.title}
                onChange={(event) => setEditorData((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-target">Sasaran</Label>
              <Input
                id="form-target"
                placeholder="Contoh: Lulusan Angkatan 2026"
                value={editorData.target}
                onChange={(event) => setEditorData((prev) => ({ ...prev, target: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-status">Status</Label>
              <Select
                value={editorData.isActive}
                onValueChange={(value: "aktif" | "nonaktif") =>
                  setEditorData((prev) => ({ ...prev, isActive: value }))
                }
              >
                <SelectTrigger id="form-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-respondents">Responden (pisahkan dengan koma)</Label>
              <Textarea
                id="form-respondents"
                rows={3}
                placeholder="Contoh: Ayu Pratama, Dimas Saputra"
                value={editorData.respondents}
                onChange={(event) =>
                  setEditorData((prev) => ({ ...prev, respondents: event.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">{editingFormId ? "Simpan Perubahan" : "Tambah Formulir"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedForm)} onOpenChange={(open) => !open && setSelectedFormId(null)}>
        <DialogContent className="max-w-5xl p-0 sm:max-h-[90vh] sm:rounded-2xl">
          {selectedForm && (
            <div className="flex max-h-[90vh] flex-col">
              <DialogHeader className="border-b border-border px-6 py-5 text-left">
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle className="text-xl">{selectedForm.title}</DialogTitle>
                  <Badge variant="outline" className={statusStyles[String(selectedForm.isActive) as keyof typeof statusStyles]}>
                    {selectedForm.isActive ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>
                <DialogDescription className="flex flex-wrap gap-4 pt-2">
                  <span>{selectedForm.target}</span>
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
  question: Question;
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
          {question.options.map((option) => (
            <div key={option.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
        </div>
      );

    case "checkbox":
      return (
        <div className="space-y-2">
          {question.options.map((option) => (
            <div key={option.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-background px-3 py-2">
              <Checkbox disabled />
              <span className="text-sm">{option.label}</span>
            </div>
          ))}
        </div>
      );

    case "dropdown":
      return (
        <Select disabled>
          <SelectTrigger className="max-w-xl bg-background">
            <SelectValue placeholder="Pilih salah satu" />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "linear_scale": {
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 5;
      const values = Array.from({ length: max - min + 1 }, (_, index) => index + min);

      return (
        <div className="space-y-3 rounded-lg border border-border/60 bg-background p-4">
          <div className="flex items-center gap-3 text-sm">
            {question.scaleMinLabel && <span className="w-24 text-right text-muted-foreground">{question.scaleMinLabel}</span>}
            <div className="flex flex-1 justify-center gap-3">
              {values.map((value) => (
                <label key={value} className="flex cursor-default flex-col items-center gap-1">
                  <input type="radio" disabled className="h-4 w-4 accent-primary" />
                  <span className="text-xs text-muted-foreground">{value}</span>
                </label>
              ))}
            </div>
            {question.scaleMaxLabel && <span className="w-24 text-left text-muted-foreground">{question.scaleMaxLabel}</span>}
          </div>
        </div>
      );
    }

    case "rating":
      return (
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="h-7 w-7 text-yellow-400" fill="currentColor" />
          ))}
        </div>
      );

    case "date":
      return <Input type="date" disabled className="max-w-xs bg-background" />;

    case "time":
      return <Input type="time" disabled className="max-w-xs bg-background" />;

    case "file_upload":
      return (
        <div className="rounded-xl border-2 border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
          Unggah file
        </div>
      );

    default:
      return (
        <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
          Tipe pertanyaan tidak didukung.
        </div>
      );
  }
};

export default DaftarFormulirPage;
