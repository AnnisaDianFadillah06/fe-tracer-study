import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
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
  Plus,
  Trash2,
  Copy,
  GripVertical,
  Eye,
  MoreVertical,
  AlignLeft,
  AlignJustify,
  CircleDot,
  CheckSquare,
  ChevronDown,
  Upload,
  Sliders,
  Star,
  Grid,
  LayoutGrid,
  Calendar,
  Clock,
  ChevronUp,
  FileText,
} from "lucide-react";

export type QuestionType =
  | "short"
  | "paragraph"
  | "multiple_choice"
  | "checkbox"
  | "dropdown"
  | "file_upload"
  | "linear_scale"
  | "rating"
  | "multiple_choice_grid"
  | "checkbox_grid"
  | "date"
  | "time";

export interface Option {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  description?: string;
  options: Option[];
  required: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

const questionTypeConfig: { value: QuestionType; label: string; icon: React.ElementType }[] = [
  { value: "short", label: "Jawaban singkat", icon: AlignLeft },
  { value: "paragraph", label: "Paragraf", icon: AlignJustify },
  { value: "multiple_choice", label: "Pilihan ganda", icon: CircleDot },
  { value: "checkbox", label: "Kotak centang", icon: CheckSquare },
  { value: "dropdown", label: "Drop-down", icon: ChevronDown },
  { value: "file_upload", label: "Upload file", icon: Upload },
  { value: "linear_scale", label: "Skala linier", icon: Sliders },
  { value: "rating", label: "Rating", icon: Star },
  { value: "multiple_choice_grid", label: "Kisi pilihan ganda", icon: Grid },
  { value: "checkbox_grid", label: "Petak kotak centang", icon: LayoutGrid },
  { value: "date", label: "Tanggal", icon: Calendar },
  { value: "time", label: "Waktu", icon: Clock },
];

const initialSections: FormSection[] = [
  {
    id: "s1",
    title: "Kuesioner Tracer Study",
    description: "Deskripsi kuesioner",
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        question: "Status pekerjaan Anda saat ini?",
        options: [
          { id: "o1", label: "Bekerja" },
          { id: "o2", label: "Wiraswasta" },
          { id: "o3", label: "Studi lanjut" },
          { id: "o4", label: "Mencari kerja" },
        ],
        required: true,
      },
    ],
  },
  {
    id: "s2",
    title: "Bagian 2",
    questions: [],
  },
];

const makeId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const defaultQuestion = (type: QuestionType = "multiple_choice"): Question => ({
  id: makeId(),
  type,
  question: "",
  options: type === "multiple_choice" || type === "checkbox" || type === "dropdown"
    ? [{ id: makeId(), label: "Opsi 1" }]
    : [],
  required: false,
  scaleMin: 1,
  scaleMax: 5,
  scaleMinLabel: "",
  scaleMaxLabel: "",
});

const QuestionManagementPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>(initialSections);
  const [activeQuestion, setActiveQuestion] = useState<string | null>("q1");
  const [deleteTarget, setDeleteTarget] = useState<{ sectionId: string; questionId: string } | null>(null);

  // --- Section helpers ---
  const updateSection = (sId: string, patch: Partial<FormSection>) =>
    setSections((prev) => prev.map((s) => (s.id === sId ? { ...s, ...patch } : s)));

  const addSection = () => {
    const newSec: FormSection = { id: makeId(), title: "Bagian baru", questions: [] };
    setSections((prev) => [...prev, newSec]);
  };

  // --- Question helpers ---
  const addQuestion = (sectionId: string) => {
    const q = defaultQuestion("multiple_choice");
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, questions: [...s.questions, q] } : s
      )
    );
    setActiveQuestion(q.id);
  };

  const duplicateQuestion = (sectionId: string, qId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const idx = s.questions.findIndex((q) => q.id === qId);
        if (idx === -1) return s;
        const copy = { ...s.questions[idx], id: makeId(), options: s.questions[idx].options.map((o) => ({ ...o, id: makeId() })) };
        const qs = [...s.questions];
        qs.splice(idx + 1, 0, copy);
        return { ...s, questions: qs };
      })
    );
  };

  const deleteQuestion = (sectionId: string, qId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, questions: s.questions.filter((q) => q.id !== qId) } : s
      )
    );
    setActiveQuestion(null);
  };

  const updateQuestion = (sectionId: string, qId: string, patch: Partial<Question>) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.map((q) => (q.id === qId ? { ...q, ...patch } : q)) }
          : s
      )
    );

  const changeType = (sectionId: string, qId: string, type: QuestionType) => {
    const newOpts =
      type === "multiple_choice" || type === "checkbox" || type === "dropdown"
        ? [{ id: makeId(), label: "Opsi 1" }]
        : [];
    updateQuestion(sectionId, qId, { type, options: newOpts });
  };

  // --- Option helpers ---
  const addOption = (sectionId: string, qId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === qId
                  ? { ...q, options: [...q.options, { id: makeId(), label: `Opsi ${q.options.length + 1}` }] }
                  : q
              ),
            }
          : s
      )
    );

  const updateOption = (sectionId: string, qId: string, oId: string, label: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === qId
                  ? { ...q, options: q.options.map((o) => (o.id === oId ? { ...o, label } : o)) }
                  : q
              ),
            }
          : s
      )
    );

  const removeOption = (sectionId: string, qId: string, oId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === qId ? { ...q, options: q.options.filter((o) => o.id !== oId) } : q
              ),
            }
          : s
      )
    );

  const handleSave = () => {
    localStorage.setItem("tracer_form_sections", JSON.stringify(sections));
    toast({ title: "Tersimpan", description: "Kuesioner berhasil disimpan" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">Manajemen Pertanyaan</h2>
            <p className="text-muted-foreground text-sm">Buat dan kelola kuesioner tracer study</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/dashboard/form-preview")}>
              <Eye className="w-4 h-4 mr-2" />
              Lihat Form
            </Button>
            <Button onClick={handleSave}>
              <FileText className="w-4 h-4 mr-2" />
              Simpan
            </Button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          {sections.map((section, sectionIndex) => (
            <div key={section.id} className="space-y-3">
              {/* Section Header */}
              <Card className="border-t-4 border-t-primary overflow-hidden">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <Input
                    className="text-xl font-bold border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
                    placeholder="Judul bagian"
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  />
                  <Input
                    className="border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground/50"
                    placeholder="Deskripsi formulir"
                    value={section.description || ""}
                    onChange={(e) => updateSection(section.id, { description: e.target.value })}
                  />
                  {sectionIndex > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Bagian {sectionIndex + 1} dari {sections.length}
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Questions */}
              {section.questions.map((q) => {
                const isActive = activeQuestion === q.id;
                const TypeIcon = questionTypeConfig.find((t) => t.value === q.type)?.icon ?? AlignLeft;

                return (
                  <Card
                    key={q.id}
                    className={`transition-all cursor-pointer ${isActive ? "border-primary shadow-md" : "hover:border-border/80"}`}
                    onClick={() => setActiveQuestion(q.id)}
                  >
                    {isActive && (
                      <div className="h-1 bg-primary w-full rounded-t-lg -mt-px" />
                    )}
                    <CardContent className="pt-4 pb-3 space-y-4">
                      {/* Question top row */}
                      <div className="flex items-start gap-3">
                        <GripVertical className="w-4 h-4 text-muted-foreground mt-3 flex-shrink-0 cursor-grab" />
                        <div className="flex-1 flex items-start gap-3">
                          {isActive ? (
                            <>
                              <Input
                                className="flex-1 text-base"
                                placeholder="Pertanyaan"
                                value={q.question}
                                onChange={(e) => updateQuestion(section.id, q.id, { question: e.target.value })}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Select
                                value={q.type}
                                onValueChange={(v) => changeType(section.id, q.id, v as QuestionType)}
                              >
                                <SelectTrigger className="w-52">
                                  <div className="flex items-center gap-2">
                                    <TypeIcon className="w-4 h-4" />
                                    <SelectValue />
                                  </div>
                                </SelectTrigger>
                                <SelectContent>
                                  {questionTypeConfig.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                      <div className="flex items-center gap-2">
                                        <t.icon className="w-4 h-4" />
                                        {t.label}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </>
                          ) : (
                            <div className="flex-1 flex items-center gap-2">
                              <TypeIcon className="w-4 h-4 text-muted-foreground" />
                              <span className={`text-sm ${!q.question ? "text-muted-foreground italic" : ""}`}>
                                {q.question || "Pertanyaan Tanpa Judul"}
                              </span>
                              {q.required && <span className="text-destructive text-xs">*</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Question body */}
                      {isActive && (
                        <div className="pl-7">
                          <QuestionBody
                            q={q}
                            sectionId={section.id}
                            addOption={addOption}
                            updateOption={updateOption}
                            removeOption={removeOption}
                            updateQuestion={updateQuestion}
                          />
                        </div>
                      )}

                      {/* Question footer */}
                      {isActive && (
                        <div className="pl-7 flex items-center justify-end gap-3 border-t pt-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); duplicateQuestion(section.id, q.id); }}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ sectionId: section.id, questionId: q.id }); }}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                          <div className="w-px h-5 bg-border" />
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Wajib diisi</span>
                            <Switch
                              checked={q.required}
                              onCheckedChange={(v) => updateQuestion(section.id, q.id, { required: v })}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => updateQuestion(section.id, q.id, { description: q.description !== undefined ? undefined : "" })}>
                                {q.description !== undefined ? "Sembunyikan deskripsi" : "Tambah deskripsi"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Add question for this section */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pl-1">
                <span>
                  Setelah bagian {sectionIndex + 1}{" "}
                  <span className="text-primary cursor-pointer hover:underline">
                    Lanjutkan ke bagian berikut
                  </span>
                </span>
              </div>
            </div>
          ))}

          {/* Floating actions */}
          <div className="flex items-center gap-3 justify-center pt-2 pb-8">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                const lastSection = sections[sections.length - 1];
                if (lastSection) addQuestion(lastSection.id);
              }}
            >
              <Plus className="w-4 h-4" />
              Tambah Pertanyaan
            </Button>
            <Button variant="outline" className="gap-2" onClick={addSection}>
              <FileText className="w-4 h-4" />
              Tambah Bagian
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pertanyaan?</AlertDialogTitle>
            <AlertDialogDescription>
              Pertanyaan ini akan dihapus permanen dari kuesioner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteQuestion(deleteTarget.sectionId, deleteTarget.questionId);
                  setDeleteTarget(null);
                }
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

// ─── Question Body Sub-component ───────────────────────────────────────────────

interface QuestionBodyProps {
  q: Question;
  sectionId: string;
  addOption: (sId: string, qId: string) => void;
  updateOption: (sId: string, qId: string, oId: string, label: string) => void;
  removeOption: (sId: string, qId: string, oId: string) => void;
  updateQuestion: (sId: string, qId: string, patch: Partial<Question>) => void;
}

const QuestionBody = ({ q, sectionId, addOption, updateOption, removeOption, updateQuestion }: QuestionBodyProps) => {
  const makeId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (q.description !== undefined) {
    // show description field
  }

  switch (q.type) {
    case "short":
      return (
        <div className="space-y-2">
          {q.description !== undefined && (
            <Input
              placeholder="Deskripsi (opsional)"
              value={q.description}
              onChange={(e) => updateQuestion(sectionId, q.id, { description: e.target.value })}
              className="text-sm"
            />
          )}
          <Input disabled placeholder="Teks jawaban singkat" className="max-w-sm bg-muted/30" />
        </div>
      );

    case "paragraph":
      return (
        <div className="space-y-2">
          {q.description !== undefined && (
            <Input
              placeholder="Deskripsi (opsional)"
              value={q.description}
              onChange={(e) => updateQuestion(sectionId, q.id, { description: e.target.value })}
              className="text-sm"
            />
          )}
          <Textarea disabled placeholder="Teks jawaban panjang" className="max-w-sm bg-muted/30 resize-none" rows={3} />
        </div>
      );

    case "multiple_choice":
    case "checkbox":
    case "dropdown":
      return (
        <div className="space-y-2">
          {q.description !== undefined && (
            <Input
              placeholder="Deskripsi (opsional)"
              value={q.description}
              onChange={(e) => updateQuestion(sectionId, q.id, { description: e.target.value })}
              className="text-sm mb-2"
            />
          )}
          {q.options.map((opt, idx) => (
            <div key={opt.id} className="flex items-center gap-2">
              {q.type === "multiple_choice" && (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
              )}
              {q.type === "checkbox" && (
                <div className="w-4 h-4 rounded border-2 border-muted-foreground flex-shrink-0" />
              )}
              {q.type === "dropdown" && (
                <span className="text-sm text-muted-foreground w-4 text-center flex-shrink-0">{idx + 1}</span>
              )}
              <Input
                className="flex-1 h-8 border-0 border-b rounded-none px-0 focus-visible:ring-0 bg-transparent"
                value={opt.label}
                onChange={(e) => updateOption(sectionId, q.id, opt.id, e.target.value)}
                placeholder={`Opsi ${idx + 1}`}
              />
              {q.options.length > 1 && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOption(sectionId, q.id, opt.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-primary gap-1 pl-0" onClick={() => addOption(sectionId, q.id)}>
            <Plus className="w-3.5 h-3.5" />
            Tambahkan opsi
            {q.type === "multiple_choice" && (
              <span className="text-muted-foreground ml-1">atau <span className="text-primary cursor-pointer hover:underline">tambahkan "Lainnya"</span></span>
            )}
          </Button>
        </div>
      );

    case "linear_scale":
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Select
              value={String(q.scaleMin ?? 1)}
              onValueChange={(v) => updateQuestion(sectionId, q.id, { scaleMin: Number(v) })}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1].map((v) => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">sampai</span>
            <Select
              value={String(q.scaleMax ?? 5)}
              onValueChange={(v) => updateQuestion(sectionId, q.id, { scaleMax: Number(v) })}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => <SelectItem key={v} value={String(v)}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-4">{q.scaleMin ?? 1}</span>
              <Input
                placeholder="Label (opsional)"
                value={q.scaleMinLabel || ""}
                onChange={(e) => updateQuestion(sectionId, q.id, { scaleMinLabel: e.target.value })}
                className="h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-4">{q.scaleMax ?? 5}</span>
              <Input
                placeholder="Label (opsional)"
                value={q.scaleMaxLabel || ""}
                onChange={(e) => updateQuestion(sectionId, q.id, { scaleMaxLabel: e.target.value })}
                className="h-8"
              />
            </div>
          </div>
        </div>
      );

    case "rating":
      return (
        <div className="flex gap-1 py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-7 h-7 text-muted-foreground/40" />
          ))}
        </div>
      );

    case "date":
      return <Input disabled type="date" className="max-w-xs bg-muted/30" />;

    case "time":
      return <Input disabled type="time" className="max-w-xs bg-muted/30" />;

    case "file_upload":
      return (
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center max-w-sm bg-muted/20">
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Upload file</p>
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground italic">Tipe belum didukung</p>;
  }
};

export default QuestionManagementPage;
