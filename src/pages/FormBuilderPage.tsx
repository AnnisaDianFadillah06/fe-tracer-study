import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  createDefaultQuestion,
  createId,
  isGridQuestionType,
  isOptionQuestionType,
  type BuilderQuestion,
  type BuilderQuestionType,
  type BuilderSection,
  type FormListItem,
  getInitialForms,
  saveForms,
} from "@/lib/formManagement";
import {
  ArrowLeft,
  Copy,
  Eye,
  FileImage,
  FileText,
  Film,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

const questionTypeOptions: Array<{ value: BuilderQuestionType; label: string }> = [
  { value: "short", label: "Short Answer" },
  { value: "paragraph", label: "Paragraph" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" },
  { value: "file_upload", label: "File Upload" },
  { value: "linear_scale", label: "Linear Scale" },
  { value: "rating", label: "Rating" },
  { value: "multiple_choice_grid", label: "Multiple Choice Grid" },
  { value: "checkbox_grid", label: "Checkbox Grid" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
];

interface DragQuestionPayload {
  sectionId: string;
  questionId: string;
}

interface DragTarget {
  sectionId: string;
  questionId?: string;
  atEnd: boolean;
}

const FormBuilderPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();

  const existingForms = useMemo(() => getInitialForms(), []);
  const isEditMode = Boolean(formId);
  const sourceForm = existingForms.find((item) => item.id === formId);

  const [form, setForm] = useState<FormListItem>(() => {
    if (sourceForm) {
      return JSON.parse(JSON.stringify(sourceForm)) as FormListItem;
    }

    return {
      id: `form-${createId("new")}`,
      title: "Untitled Form",
      description: "",
      status: "aktif",
      target: "",
      respondents: [],
      sections: [
        {
          id: createId("section"),
          title: "Bagian 1",
          description: "",
          questions: [createDefaultQuestion("short")],
        },
      ],
      responses: [],
    };
  });

  const [draggedQuestion, setDraggedQuestion] = useState<DragQuestionPayload | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    patch: Partial<BuilderQuestion>,
  ) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              questions: section.questions.map((question) =>
                question.id === questionId ? { ...question, ...patch } : question,
              ),
            },
      ),
    }));
  };

  const addQuestion = (sectionId?: string) => {
    setForm((prev) => {
      const targetSectionId = sectionId ?? prev.sections[prev.sections.length - 1]?.id;
      if (!targetSectionId) return prev;

      return {
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === targetSectionId
            ? { ...section, questions: [...section.questions, createDefaultQuestion("short")] }
            : section,
        ),
      };
    });
  };

  const duplicateQuestion = (sectionId: string, questionId: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.id !== sectionId) return section;

        const index = section.questions.findIndex((question) => question.id === questionId);
        if (index < 0) return section;

        const base = section.questions[index];
        const clone: BuilderQuestion = {
          ...base,
          id: createId("q"),
          options: [...base.options],
          gridRows: [...(base.gridRows ?? [])],
          gridColumns: [...(base.gridColumns ?? [])],
        };

        const questions = [...section.questions];
        questions.splice(index + 1, 0, clone);
        return { ...section, questions };
      }),
    }));
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              questions: section.questions.filter((question) => question.id !== questionId),
            },
      ),
    }));
  };

  const moveQuestion = (
    sourceSectionId: string,
    sourceQuestionId: string,
    targetSectionId: string,
    targetQuestionId?: string,
  ) => {
    if (
      sourceSectionId === targetSectionId &&
      targetQuestionId &&
      sourceQuestionId === targetQuestionId
    ) {
      return;
    }

    setForm((prev) => {
      let dragged: BuilderQuestion | null = null;

      const withoutSource = prev.sections.map((section) => {
        if (section.id !== sourceSectionId) return section;

        const nextQuestions = section.questions.filter((question) => {
          const isTarget = question.id === sourceQuestionId;
          if (isTarget) dragged = question;
          return !isTarget;
        });

        return { ...section, questions: nextQuestions };
      });

      if (!dragged) return prev;

      return {
        ...prev,
        sections: withoutSource.map((section) => {
          if (section.id !== targetSectionId) return section;

          const insertAt = targetQuestionId
            ? section.questions.findIndex((question) => question.id === targetQuestionId)
            : -1;
          const nextQuestions = [...section.questions];

          if (insertAt >= 0) {
            nextQuestions.splice(insertAt, 0, dragged);
          } else {
            nextQuestions.push(dragged);
          }

          return { ...section, questions: nextQuestions };
        }),
      };
    });
  };

  const addSection = () => {
    const nextIndex = form.sections.length + 1;
    const newSection: BuilderSection = {
      id: createId("section"),
      title: `Bagian ${nextIndex}`,
      description: "",
      questions: [createDefaultQuestion("short")],
    };

    setForm((prev) => ({ ...prev, sections: [...prev.sections, newSection] }));
  };

  const updateSection = (sectionId: string, patch: Partial<BuilderSection>) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, ...patch } : section,
      ),
    }));
  };

  const changeQuestionType = (
    sectionId: string,
    questionId: string,
    type: BuilderQuestionType,
  ) => {
    updateQuestion(sectionId, questionId, {
      type,
      options: isOptionQuestionType(type) ? ["Opsi 1"] : [],
      gridRows: isGridQuestionType(type) ? ["Baris 1", "Baris 2"] : [],
      gridColumns: isGridQuestionType(type) ? ["Kolom 1", "Kolom 2"] : [],
      allowOther: false,
    });
  };

  const saveForm = () => {
    if (!form.title.trim()) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }

    const allForms = getInitialForms();
    const exists = allForms.some((item) => item.id === form.id);

    const updatedForms = exists
      ? allForms.map((item) => (item.id === form.id ? form : item))
      : [form, ...allForms];

    saveForms(updatedForms);
    toast({ title: "Berhasil", description: "Formulir berhasil disimpan." });
    navigate("/dashboard/form-management");
  };

  const floatingAction = (label: string) => {
    toast({ title: label, description: "Aksi ini sudah disiapkan untuk integrasi tahap berikutnya." });
  };

  const openPreview = () => {
    if (isEditMode && formId) {
      navigate(`/dashboard/form-management/${formId}/preview`, { state: { form } });
      return;
    }

    navigate("/dashboard/form-management/new/preview", { state: { form } });
  };

  if (isEditMode && !sourceForm) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 py-8 text-center">
            <h1 className="text-xl font-semibold">Formulir tidak ditemukan</h1>
            <p className="text-sm text-muted-foreground">Data formulir yang ingin Anda edit tidak tersedia.</p>
            <Button onClick={() => navigate("/dashboard/form-management")}>Kembali ke Form Management</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/form-management")}> 
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isEditMode ? "Edit Formulir" : "Tambah Formulir"}
              </p>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                className="h-10 border-0 bg-transparent px-0 text-lg font-semibold focus-visible:ring-0"
                placeholder="Untitled Form"
              />
              <Input
                value={form.description ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                className="h-8 border-0 bg-transparent px-0 text-sm text-muted-foreground focus-visible:ring-0"
                placeholder="Deskripsi formulir (opsional)"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-lg border bg-background px-3 py-1.5 md:flex">
              <span className="text-xs text-muted-foreground">Status</span>
              <Switch
                checked={form.status === "aktif"}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, status: checked ? "aktif" : "nonaktif" }))
                }
              />
              <span className="text-xs font-medium">{form.status === "aktif" ? "Aktif" : "Tidak Aktif"}</span>
            </div>
            <Button variant="outline" onClick={openPreview}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard/form-management")}>Kembali</Button>
            <Button onClick={saveForm}>
              <Save className="mr-2 h-4 w-4" />
              Simpan
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1320px] grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[1fr_72px] sm:px-6">
        <div className="space-y-5">
          <Card className="shadow-sm">
            <CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="form-target">Sasaran</Label>
                <Input
                  id="form-target"
                  value={form.target}
                  onChange={(event) => setForm((prev) => ({ ...prev, target: event.target.value }))}
                  placeholder="Contoh: Lulusan Angkatan 2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-respondents">Contoh responden (opsional)</Label>
                <Input
                  id="form-respondents"
                  value={form.respondents.join(", ")}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      respondents: event.target.value
                        .split(",")
                        .map((value) => value.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="Ayu Pratama, Dimas Saputra"
                />
              </div>
            </CardContent>
          </Card>

          {form.sections.map((section, sectionIndex) => (
            <Card key={section.id} className="border-t-4 border-t-primary shadow-sm">
              <CardContent className="space-y-5 p-5">
                <div className="space-y-2">
                  <Input
                    value={section.title}
                    onChange={(event) => updateSection(section.id, { title: event.target.value })}
                    className="h-9 rounded-none border-0 border-b px-0 text-lg font-semibold focus-visible:ring-0"
                    placeholder={`Bagian ${sectionIndex + 1}`}
                  />
                  <Input
                    value={section.description ?? ""}
                    onChange={(event) => updateSection(section.id, { description: event.target.value })}
                    className="h-8 rounded-none border-0 border-b px-0 text-sm focus-visible:ring-0"
                    placeholder="Deskripsi section (opsional)"
                  />
                </div>

                <div className="space-y-4">
                  {section.questions.map((question) => {
                    const isDropTarget =
                      dragTarget?.sectionId === section.id &&
                      dragTarget?.questionId === question.id &&
                      !dragTarget.atEnd;

                    return (
                      <Card
                        key={question.id}
                        className={`border shadow-none transition ${
                          isDropTarget
                            ? "border-primary ring-1 ring-primary/40"
                            : "border-border/70"
                        }`}
                        draggable
                        onDragStart={(event) => {
                          const payload: DragQuestionPayload = {
                            sectionId: section.id,
                            questionId: question.id,
                          };
                          event.dataTransfer.setData("text/plain", JSON.stringify(payload));
                          event.dataTransfer.effectAllowed = "move";
                          setDraggedQuestion(payload);
                        }}
                        onDragEnd={() => {
                          setDraggedQuestion(null);
                          setDragTarget(null);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragTarget({ sectionId: section.id, questionId: question.id, atEnd: false });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          try {
                            const payload = JSON.parse(
                              event.dataTransfer.getData("text/plain"),
                            ) as DragQuestionPayload;
                            moveQuestion(payload.sectionId, payload.questionId, section.id, question.id);
                          } catch {
                            // Ignore malformed drag payload.
                          }
                          setDraggedQuestion(null);
                          setDragTarget(null);
                        }}
                      >
                        <CardContent className="space-y-4 p-4">
                          <div className="flex items-start gap-3">
                            <GripVertical
                              className={`mt-2 h-4 w-4 ${
                                draggedQuestion?.questionId === question.id
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                            <div className="flex-1 space-y-3">
                              <Input
                                value={question.question}
                                onChange={(event) =>
                                  updateQuestion(section.id, question.id, { question: event.target.value })
                                }
                                placeholder="Pertanyaan"
                              />
                              <Select
                                value={question.type}
                                onValueChange={(value: BuilderQuestionType) =>
                                  changeQuestionType(section.id, question.id, value)
                                }
                              >
                                <SelectTrigger className="w-full md:w-72">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {questionTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <QuestionEditor
                            question={question}
                            onChange={(patch) => updateQuestion(section.id, question.id, patch)}
                          />

                          <Separator />

                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={question.required}
                                onCheckedChange={(checked) =>
                                  updateQuestion(section.id, question.id, { required: checked })
                                }
                              />
                              <span className="text-sm text-muted-foreground">Required</span>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => duplicateQuestion(section.id, question.id)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteQuestion(section.id, question.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div
                  className={`rounded-lg border border-dashed px-3 py-2 text-xs transition ${
                    dragTarget?.sectionId === section.id && dragTarget.atEnd
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/70 text-muted-foreground"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragTarget({ sectionId: section.id, atEnd: true });
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    try {
                      const payload = JSON.parse(
                        event.dataTransfer.getData("text/plain"),
                      ) as DragQuestionPayload;
                      moveQuestion(payload.sectionId, payload.questionId, section.id);
                    } catch {
                      // Ignore malformed drag payload.
                    }
                    setDraggedQuestion(null);
                    setDragTarget(null);
                  }}
                >
                  Drag pertanyaan ke sini untuk menaruh di akhir section.
                </div>

                <Button variant="outline" onClick={() => addQuestion(section.id)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Pertanyaan pada Section Ini
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="md:sticky md:top-24 md:h-fit">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col gap-2 p-3">
              <Button variant="outline" size="icon" onClick={() => addQuestion()} title="Tambah pertanyaan baru">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={addSection} title="Tambah section baru">
                <FileText className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => floatingAction("Tambah gambar")} title="Tambah gambar">
                <FileImage className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => floatingAction("Tambah video")} title="Tambah video">
                <Film className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => floatingAction("Tambah deskripsi teks")} title="Tambah deskripsi teks">
                <FileText className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

interface QuestionEditorProps {
  question: BuilderQuestion;
  onChange: (patch: Partial<BuilderQuestion>) => void;
}

const QuestionEditor = ({ question, onChange }: QuestionEditorProps) => {
  if (isOptionQuestionType(question.type)) {
    return (
      <div className="space-y-2">
        {question.options.map((option, optionIndex) => (
          <div key={`${question.id}-option-${optionIndex}`} className="flex items-center gap-2">
            <Input
              value={option}
              onChange={(event) => {
                const nextOptions = [...question.options];
                nextOptions[optionIndex] = event.target.value;
                onChange({ options: nextOptions });
              }}
              placeholder={`Opsi ${optionIndex + 1}`}
            />
            {question.options.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  const nextOptions = question.options.filter((_, index) => index !== optionIndex);
                  onChange({ options: nextOptions });
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ options: [...question.options, `Opsi ${question.options.length + 1}`] })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Option
          </Button>

          <Button
            type="button"
            variant={question.allowOther ? "default" : "outline"}
            size="sm"
            onClick={() => onChange({ allowOther: !question.allowOther })}
          >
            Other
          </Button>
        </div>
      </div>
    );
  }

  if (isGridQuestionType(question.type)) {
    const rows = question.gridRows ?? [];
    const columns = question.gridColumns ?? [];

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <GridOptionEditor
          label="Rows"
          values={rows}
          onChange={(nextRows) => onChange({ gridRows: nextRows })}
          addLabel="Tambah Row"
          placeholderPrefix="Baris"
        />
        <GridOptionEditor
          label="Columns"
          values={columns}
          onChange={(nextColumns) => onChange({ gridColumns: nextColumns })}
          addLabel="Tambah Column"
          placeholderPrefix="Kolom"
        />
      </div>
    );
  }

  if (question.type === "linear_scale") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Min</Label>
          <Input
            type="number"
            min={0}
            max={9}
            value={question.scaleMin ?? 1}
            onChange={(event) => onChange({ scaleMin: Number(event.target.value) || 1 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={question.scaleMax ?? 5}
            onChange={(event) => onChange({ scaleMax: Number(event.target.value) || 5 })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
      Konfigurasi tambahan untuk tipe ini akan mengikuti backend schema pada tahap integrasi.
    </div>
  );
};

interface GridOptionEditorProps {
  label: string;
  values: string[];
  onChange: (nextValues: string[]) => void;
  addLabel: string;
  placeholderPrefix: string;
}

const GridOptionEditor = ({
  label,
  values,
  onChange,
  addLabel,
  placeholderPrefix,
}: GridOptionEditorProps) => {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>

      {values.map((value, index) => (
        <div key={`${label}-${index}`} className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              onChange(next);
            }}
            placeholder={`${placeholderPrefix} ${index + 1}`}
          />
          {values.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(values.filter((_, valueIndex) => valueIndex !== index))}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...values, `${placeholderPrefix} ${values.length + 1}`])}
      >
        <Plus className="mr-2 h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
};

export default FormBuilderPage;
