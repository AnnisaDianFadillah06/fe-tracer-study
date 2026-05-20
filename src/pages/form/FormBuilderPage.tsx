import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/common/use-toast";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
import {
  createDefaultQuestion,
  createId,
  isGridQuestionType,
  isOptionQuestionType,
  formListItemToApiPayload,
  backendToFormListItem,
  type BuilderQuestion,
  type BuilderQuestionType,
  type BuilderSection,
  type FormListItem,
  getInitialForms,
  saveForms,
} from "@/lib/formManagement";
import api from "@/lib/api";
import { BUILDER_DRAFT_STORAGE_KEY, createBlankFormDraft } from "@/lib/questionnaireDrafts";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
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

const PREVIEW_DRAFT_KEY = "tracer_form_preview_draft";

const normalizeTargets = (data: FormListItem): FormListItem => {
  const rawTarget = (data as { target?: string | string[] }).target;
  const targets = Array.isArray(rawTarget)
    ? rawTarget
    : rawTarget
      ? [rawTarget]
      : [];

  return {
    ...data,
    target: targets,
    targetProdi: Array.isArray(data.targetProdi) ? data.targetProdi : [],
  };
};

const ensureQuestionLogic = (data: FormListItem): FormListItem => ({
  ...data,
  sections: data.sections.map((section) => ({
    ...section,
    questions: section.questions.map((question) =>
      question.logic
        ? question
        : {
            ...question,
            logic: {
              type: "always",
              dependsOn: "",
              values: [],
            },
          },
    ),
  })),
});

const ensureFirstQuestionRequired = (data: FormListItem): FormListItem => {
  const firstSection = data.sections[0];
  const firstQuestion = firstSection?.questions[0];

  if (!firstSection || !firstQuestion || firstQuestion.required) {
    return data;
  }

  return {
    ...data,
    sections: data.sections.map((section, index) =>
      index === 0
        ? {
            ...section,
            questions: section.questions.map((question, qIndex) =>
              qIndex === 0 ? { ...question, required: true } : question,
            ),
          }
        : section,
    ),
  };
};

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
  const { alumni, isLoading: isAlumniLoading } = useDashboardData();

  const existingForms = useMemo(() => getInitialForms(), []);
  const isEditMode = Boolean(formId);
  const sourceForm = existingForms.find((item) => item.id === formId);

  const builderDraft = useMemo(() => {
    if (typeof window === "undefined") return null;
    const key = formId ? `${BUILDER_DRAFT_STORAGE_KEY}:${formId}` : `${BUILDER_DRAFT_STORAGE_KEY}:new`;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as FormListItem) : null;
    } catch {
      return null;
    }
  }, [formId]);

  const [form, setForm] = useState<FormListItem>(() => {
    if (builderDraft) {
      return ensureFirstQuestionRequired(ensureQuestionLogic(normalizeTargets(builderDraft)));
    }
    if (sourceForm) {
      const cloned = JSON.parse(JSON.stringify(sourceForm)) as FormListItem;
      return ensureFirstQuestionRequired(ensureQuestionLogic(normalizeTargets(cloned)));
    }

    return ensureFirstQuestionRequired(ensureQuestionLogic(createBlankFormDraft()));
  });

  const [isLoadingForm, setIsLoadingForm] = useState(() => Boolean(formId && /^\d+$/.test(formId)));
  const [targetGraduationYears, setTargetGraduationYears] = useState<number[]>([]);

  // Fetch from API when editing a backend questionnaire
  useEffect(() => {
    if (!formId) return;
    // Only fetch if formId looks like a numeric backend ID
    if (!/^\d+$/.test(formId)) return;

    const fetchFromApi = async () => {
      setIsLoadingForm(true);
      try {
        const { data } = await api.get(`/questionnaires/${formId}`);
        if (data.success && data.data) {
          const converted = backendToFormListItem(data.data);
          // Resolve program_id to prodi name
          if (data.data.program_id && converted.targetProdi.length === 0) {
            try {
              const progRes = await api.get("/programs");
              const programs = progRes.data.data ?? progRes.data;
              const match = (programs as any[]).find((p: any) => p.id === data.data.program_id);
              if (match) converted.targetProdi = [match.name];
            } catch { /* ignore */ }
          }
          setForm(ensureFirstQuestionRequired(ensureQuestionLogic(normalizeTargets(converted))));
          if (data.data.target_graduation_years) {
            setTargetGraduationYears(data.data.target_graduation_years);
          }
        }
      } catch (err) {
        console.error("[FormBuilder] Failed to fetch questionnaire from API:", err);
        toast({
          title: "Gagal",
          description: "Tidak dapat memuat data kuesioner dari server.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingForm(false);
      }
    };
    fetchFromApi();
  }, [formId, sourceForm, builderDraft]);

  const [draggedQuestion, setDraggedQuestion] = useState<DragQuestionPayload | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const [activeQuestionKey, setActiveQuestionKey] = useState<string | null>(null);
  const questionRefs = useRef(new Map<string, HTMLDivElement | null>());
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number }>({
    top: 120,
    left: 0,
  });
  const [targetPickerValue, setTargetPickerValue] = useState<string | undefined>(undefined);
  const [prodiPickerValue, setProdiPickerValue] = useState<string | undefined>(undefined);
  const [prodiOptions, setProdiOptions] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [isProdiLoading, setIsProdiLoading] = useState(false);

  useEffect(() => {
    const fetchProdi = async () => {
      setIsProdiLoading(true);
      try {
        const { data } = await api.get("/programs");
        const programs = data.data ?? data;
        setProdiOptions(Array.isArray(programs) ? programs.map((p: any) => ({ id: p.id, name: p.name, code: p.code })) : []);
      } catch {
        setProdiOptions([]);
      } finally {
        setIsProdiLoading(false);
      }
    };
    fetchProdi();
  }, []);

  const angkatanOptions = useMemo(() => {
    const counts = new Map<number, number>();

    alumni.forEach((item) => {
      if (!item.graduation_year) return;
      const year = item.graduation_year;
      if (!Number.isFinite(year)) return;
      counts.set(year, (counts.get(year) ?? 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, count]) => ({ year: String(year), count }));
  }, [alumni]);

  const targetOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    const addOption = (value: string, label: string) => {
      if (!value || seen.has(value)) return;
      options.push({ value, label });
      seen.add(value);
    };

    addOption("Semua Alumni", "Semua Alumni");
    angkatanOptions.forEach(({ year, count }) => {
      addOption(`Lulusan ${year}`, `Lulusan ${year} (${count} alumni)`);
    });

    form.target.forEach((target) => {
      if (!seen.has(target)) {
        addOption(target, `Sasaran tersimpan: ${target}`);
      }
    });

    return options;
  }, [angkatanOptions, form.target]);

  const flatQuestions = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      type: BuilderQuestionType;
      options: string[];
      order: number;
    }> = [];
    let order = 0;

    form.sections.forEach((section) => {
      section.questions.forEach((question) => {
        list.push({
          id: question.id,
          label: question.question?.trim() || `Pertanyaan ${order + 1}`,
          type: question.type,
          options: question.options ?? [],
          order,
        });
        order += 1;
      });
    });

    return list;
  }, [form.sections]);

  const questionOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    flatQuestions.forEach((item) => map.set(item.id, item.order));
    return map;
  }, [flatQuestions]);

  const addTarget = (value: string) => {
    if (!value) return;
    setForm((prev) => {
      if (prev.target.includes(value)) return prev;
      return { ...prev, target: [...prev.target, value] };
    });
    // Extract year from "Lulusan YYYY" pattern
    const yearMatch = value.match(/^Lulusan\s+(\d{4})$/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      setTargetGraduationYears((prev) => prev.includes(year) ? prev : [...prev, year]);
    }
    setTargetPickerValue(undefined);
  };

  const removeTarget = (value: string) => {
    setForm((prev) => ({
      ...prev,
      target: prev.target.filter((item) => item !== value),
    }));
    // Remove year from targetGraduationYears
    const yearMatch = value.match(/^Lulusan\s+(\d{4})$/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1]);
      setTargetGraduationYears((prev) => prev.filter((y) => y !== year));
    }
  };

  const updateFloatingPanelPosition = () => {
    const panel = panelRef.current;
    if (!panel) return;

    const panelRect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const defaultLeft = Math.max(16, viewportWidth - panelRect.width - 24);
    const clampTop = (value: number) =>
      Math.min(Math.max(value, 96), viewportHeight - panelRect.height - 24);

    if (activeQuestionKey) {
      const target = questionRefs.current.get(activeQuestionKey);
      if (target) {
        const rect = target.getBoundingClientRect();
        const desiredLeft = Math.min(rect.right + 16, defaultLeft);
        setPanelStyle({
          top: clampTop(rect.top),
          left: Math.max(16, desiredLeft),
        });
        return;
      }
    }

    setPanelStyle({ top: clampTop(120), left: defaultLeft });
  };

  useEffect(() => {
    let frame: number | null = null;

    const scheduleUpdate = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        updateFloatingPanelPosition();
      });
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, true);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate, true);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [activeQuestionKey, form.sections.length]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const key = formId ? `${BUILDER_DRAFT_STORAGE_KEY}:${formId}` : `${BUILDER_DRAFT_STORAGE_KEY}:new`;
    const timer = window.setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(form));
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [form, formId]);

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

  const saveForm = async () => {
    if (!form.title.trim()) {
      toast({ title: "Judul wajib diisi", variant: "destructive" });
      return;
    }

    if (form.target.length === 0) {
      toast({ title: "Sasaran wajib dipilih", description: "Pilih minimal satu sasaran angkatan.", variant: "destructive" });
      return;
    }

    try {
      const prodiNameToId: Record<string, number> = {};
      prodiOptions.forEach((p) => { prodiNameToId[p.name] = p.id; });
      const payload = formListItemToApiPayload({ ...form, targetGraduationYears }, prodiNameToId);
      const isNumericId = /^\d+$/.test(form.id);

      if (isEditMode && isNumericId) {
        await api.put(`/questionnaires/${form.id}`, payload);
      } else {
        await api.post('/questionnaires', payload);
      }

      // Also keep localStorage cache for preview/edit bridge
      const allForms = getInitialForms();
      const exists = allForms.some((item) => item.id === form.id);
      const updatedForms = exists
        ? allForms.map((item) => (item.id === form.id ? form : item))
        : [form, ...allForms];
      saveForms(updatedForms);

      if (typeof window !== "undefined") {
        const key = formId ? `${BUILDER_DRAFT_STORAGE_KEY}:${formId}` : `${BUILDER_DRAFT_STORAGE_KEY}:new`;
        localStorage.removeItem(key);
      }
      toast({ title: "Berhasil", description: "Kuisioner berhasil disimpan ke server." });
      navigate("/dashboard/form-management");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Gagal menyimpan kuisioner ke server.";
      toast({ title: "Gagal", description: msg, variant: "destructive" });
    }
  };

  const floatingAction = (label: string) => {
    toast({ title: label, description: "Aksi ini sudah disiapkan untuk integrasi tahap berikutnya." });
  };

  const openPreview = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(PREVIEW_DRAFT_KEY, JSON.stringify(form));
      const previewPath = isEditMode && formId
        ? `/dashboard/form-management/${formId}/preview`
        : "/dashboard/form-management/new/preview";
      window.open(`${previewPath}?draft=1`, "_blank", "noopener,noreferrer");
    }
  };

  if (isLoadingForm) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Memuat kuesioner...</p>
        </div>
      </div>
    );
  }

  if (isEditMode && !sourceForm && !isLoadingForm && !builderDraft) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-3 py-8 text-center">
            <h1 className="text-xl font-semibold">Kuisioner tidak ditemukan</h1>
            <p className="text-sm text-muted-foreground">Data kuisioner yang ingin Anda edit tidak tersedia.</p>
            <Button onClick={() => navigate("/dashboard/form-management")}>Kembali ke Manajemen Kuisioner</Button>
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
                {isEditMode ? "Edit Kuisioner" : "Tambah Kuisioner"}
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
                placeholder="Deskripsi kuisioner (opsional)"
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
                <Label htmlFor="form-target">Sasaran <span className="text-destructive">*</span></Label>
                <Select
                  value={targetPickerValue}
                  onValueChange={addTarget}
                >
                  <SelectTrigger id="form-target">
                    <SelectValue
                      placeholder={
                        isAlumniLoading ? "Memuat data alumni..." : "Pilih angkatan alumni"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {targetOptions.length === 0 ? (
                      <SelectItem value="no-data" disabled>
                        Belum ada data alumni tersedia
                      </SelectItem>
                    ) : (
                      targetOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.target.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.target.map((target) => (
                      <div
                        key={target}
                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs"
                      >
                        <span>{target}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => removeTarget(target)}
                          aria-label={`Hapus sasaran ${target}`}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Wajib. Tambahkan lebih dari satu sasaran jika diperlukan.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-prodi">Target Prodi</Label>
                <Select
                  value={prodiPickerValue}
                  onValueChange={(value) => {
                    if (!value) return;
                    setForm((prev) => {
                      if (prev.targetProdi.includes(value)) return prev;
                      return { ...prev, targetProdi: [...prev.targetProdi, value] };
                    });
                    setProdiPickerValue(undefined);
                  }}
                >
                  <SelectTrigger id="form-prodi">
                    <SelectValue
                      placeholder={isProdiLoading ? "Memuat data prodi..." : "Pilih program studi"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {prodiOptions.length === 0 ? (
                      <SelectItem value="no-data" disabled>
                        Belum ada data prodi tersedia
                      </SelectItem>
                    ) : (
                      prodiOptions.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {form.targetProdi.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.targetProdi.map((prodi) => (
                      <div
                        key={prodi}
                        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1 text-xs"
                      >
                        <span>{prodi}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              targetProdi: prev.targetProdi.filter((item) => item !== prodi),
                            }))
                          }
                          aria-label={`Hapus prodi ${prodi}`}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Opsional. Jika tidak dipilih, kuesioner dikirim ke semua prodi.
                </p>
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
                    const questionKey = `${section.id}:${question.id}`;
                    const isActive = activeQuestionKey === questionKey;
                    const isDropTarget =
                      dragTarget?.sectionId === section.id &&
                      dragTarget?.questionId === question.id &&
                      !dragTarget.atEnd;
                    const currentOrder = questionOrderMap.get(question.id) ?? 0;
                    const triggerCandidates = flatQuestions.filter(
                      (item) => item.order < currentOrder && isOptionQuestionType(item.type),
                    );
                    const hasTriggers = triggerCandidates.length > 0;
                    const isConditional = question.logic.type === "in_array";
                    const selectedTrigger = triggerCandidates.find(
                      (item) => item.id === question.logic.dependsOn,
                    );
                    const triggerOptions = selectedTrigger?.options ?? [];

                    return (
                      <Card
                        key={question.id}
                        ref={(node) => {
                          if (node) {
                            questionRefs.current.set(questionKey, node);
                          } else {
                            questionRefs.current.delete(questionKey);
                          }
                        }}
                        className={`border border-slate-300/80 bg-white shadow-sm transition ${
                          isDropTarget
                            ? "border-primary ring-2 ring-primary/30"
                            : isActive
                              ? "border-primary/80 ring-1 ring-primary/20"
                            : ""
                        }`}
                        draggable
                        onClick={() => setActiveQuestionKey(questionKey)}
                        onFocusCapture={() => setActiveQuestionKey(questionKey)}
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

                          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Pertanyaan Bersyarat</p>
                                <p className="text-xs text-muted-foreground">
                                  Tampilkan pertanyaan ini jika jawaban pada pertanyaan pemicu cocok.
                                </p>
                              </div>
                              <Switch
                                checked={isConditional}
                                disabled={!hasTriggers}
                                onCheckedChange={(checked) => {
                                  if (!checked) {
                                    updateQuestion(section.id, question.id, {
                                      logic: { type: "always", dependsOn: "", values: [] },
                                    });
                                    return;
                                  }

                                  const defaultTrigger = triggerCandidates[0];
                                  updateQuestion(section.id, question.id, {
                                    logic: {
                                      type: "in_array",
                                      dependsOn: defaultTrigger?.id ?? "",
                                      values: [],
                                    },
                                  });
                                }}
                              />
                            </div>

                            {!hasTriggers && (
                              <p className="text-xs text-muted-foreground">
                                Buat pertanyaan pilihan ganda sebelumnya agar bisa digunakan sebagai pemicu.
                              </p>
                            )}

                            {isConditional && hasTriggers && (
                              <div className="space-y-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Pertanyaan pemicu</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between font-normal"
                                      >
                                        {question.logic.dependsOn
                                          ? triggerCandidates.find((item) => item.id === question.logic.dependsOn)?.label ?? "Pilih pertanyaan"
                                          : "Pilih pertanyaan"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                      <Command>
                                        <CommandInput placeholder="Cari pertanyaan..." />
                                        <CommandList>
                                          <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                                          <CommandGroup>
                                            {triggerCandidates.map((item) => (
                                              <CommandItem
                                                key={item.id}
                                                value={item.label}
                                                onSelect={() => {
                                                  updateQuestion(section.id, question.id, {
                                                    logic: {
                                                      ...question.logic,
                                                      dependsOn: item.id,
                                                      values: [],
                                                    },
                                                  });
                                                }}
                                              >
                                                <Check
                                                  className={cn(
                                                    "mr-2 h-4 w-4",
                                                    question.logic.dependsOn === item.id ? "opacity-100" : "opacity-0"
                                                  )}
                                                />
                                                {item.label}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs">Jawaban pemicu</Label>
                                  {triggerOptions.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">
                                      Pertanyaan pemicu belum memiliki opsi jawaban.
                                    </p>
                                  ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {triggerOptions.map((option) => {
                                        const checked = question.logic.values.includes(option);
                                        return (
                                          <label
                                            key={`${question.id}-logic-${option}`}
                                            className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-2 text-sm"
                                          >
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={(value) => {
                                                const isChecked = value === true;
                                                const nextValues = isChecked
                                                  ? [...question.logic.values, option]
                                                  : question.logic.values.filter((item) => item !== option);
                                                updateQuestion(section.id, question.id, {
                                                  logic: {
                                                    ...question.logic,
                                                    values: nextValues,
                                                  },
                                                });
                                              }}
                                            />
                                            <span>{option}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    Pertanyaan ini tampil jika salah satu jawaban di atas dipilih.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

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
                <p className="text-xs text-muted-foreground">
                  Pertanyaan baru akan masuk ke section ini. Gunakan tombol di bawah untuk membuat section baru.
                </p>
              </CardContent>
            </Card>
          ))}

          <Card className="border-dashed bg-white/70 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Buat section baru</p>
                <p className="text-xs text-muted-foreground">
                  Pisahkan kelompok pertanyaan agar alur pengisian lebih jelas.
                </p>
              </div>
              <Button onClick={addSection}>
                <FileText className="mr-2 h-4 w-4" />
                Tambah Section Baru
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Card
            ref={panelRef}
            style={{
              position: "fixed",
              top: panelStyle.top,
              left: panelStyle.left,
            }}
            className={`z-40 w-[72px] shadow-sm transition-all duration-200 ${
              activeQuestionKey ? "ring-1 ring-primary/30" : ""
            }`}
          >
            <CardContent className="flex flex-col gap-3 p-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => addQuestion()}
                title="Tambah pertanyaan (section terakhir)"
                aria-label="Tambah pertanyaan (section terakhir)"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={addSection}
                title="Tambah section baru"
                aria-label="Tambah section baru"
              >
                <FileText className="h-4 w-4" />
              </Button>
              <Separator />
              <Button
                variant="outline"
                size="icon"
                onClick={() => floatingAction("Tambah gambar")}
                title="Tambah gambar"
                aria-label="Tambah gambar"
              >
                <FileImage className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => floatingAction("Tambah video")}
                title="Tambah video"
                aria-label="Tambah video"
              >
                <Film className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => floatingAction("Tambah deskripsi teks")}
                title="Tambah deskripsi teks"
                aria-label="Tambah deskripsi teks"
              >
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
    const minValue = question.scaleMin ?? 1;
    const maxValue = question.scaleMax ?? 5;
    const count = Math.max(0, maxValue - minValue + 1);
    const labels = Array.from({ length: count }, (_, index) => question.scaleLabels?.[index] ?? "");

    const updateScale = (nextMin: number, nextMax: number) => {
      const normalizedMin = Number.isFinite(nextMin) ? nextMin : 1;
      const normalizedMax = Number.isFinite(nextMax) ? nextMax : normalizedMin;
      const nextCount = Math.max(0, normalizedMax - normalizedMin + 1);
      const nextLabels = Array.from({ length: nextCount }, (_, index) => labels[index] ?? "");
      onChange({
        scaleMin: normalizedMin,
        scaleMax: normalizedMax,
        scaleLabels: nextLabels,
      });
    };

    return (
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Min</Label>
            <Input
              type="number"
              min={0}
              max={9}
              value={minValue}
              onChange={(event) => updateScale(Number(event.target.value) || 1, maxValue)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={maxValue}
              onChange={(event) => updateScale(minValue, Number(event.target.value) || 5)}
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {labels.map((label, index) => {
            const value = minValue + index;
            return (
              <div key={`${question.id}-label-${value}`} className="space-y-1">
                <Label className="text-xs">Label {value}</Label>
                <Input
                  value={label}
                  onChange={(event) => {
                    const nextLabels = [...labels];
                    nextLabels[index] = event.target.value;
                    onChange({ scaleLabels: nextLabels });
                  }}
                  placeholder={`Keterangan untuk ${value}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
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
