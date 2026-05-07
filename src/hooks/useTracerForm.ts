import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { FormSection, Question, Option } from "@/hooks/useQuestionManagement";

/**
 * Maps the backend questionnaire JSON (from QuestionnaireFetchController)
 * into the frontend FormSection[] format used by the form renderer.
 *
 * Backend response shape:
 * {
 *   success: true,
 *   data: [
 *     {
 *       id, title, description, status, program_id, is_global,
 *       questions: [
 *         {
 *           id, questionnaire_id, question_code, question_text,
 *           question_type, is_required, order_no, metadata,
 *           options: [{ id, question_id, label, value, order_no }]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
/** Map a single backend question object to the frontend Question shape. */
function mapSingleQuestion(q: any): Question {
  const meta = q.metadata ?? {};

  // Smart type detection: 'number' with scale metadata → linear_scale
  let feType = mapQuestionType(q.question_type);
  if (q.question_type === "number" && meta.scale_min != null && meta.scale_max != null) {
    feType = "linear_scale";
  }

  // Boolean questions without group → multiple_choice with Ya/Tidak
  let options: Option[] = (q.options ?? []).map((o: any) => ({
    id: o.value ?? String(o.id),
    label: o.label ?? "",
  }));

  if (q.question_type === "boolean" && !meta.group_code) {
    feType = "multiple_choice";
    options = [
      { id: "1", label: "Ya" },
      { id: "0", label: "Tidak" },
    ];
  }

  return {
    id: q.question_code ?? String(q.id),
    type: feType,
    question: q.question_text ?? "",
    description: meta.description ?? undefined,
    options,
    required: !!q.is_required,
    scaleMin: meta.scale_min ?? 1,
    scaleMax: meta.scale_max ?? 5,
    scaleMinLabel: meta.scale_min_label ?? "",
    scaleMaxLabel: meta.scale_max_label ?? "",
    showIf: meta.show_if ?? undefined,
    groupCode: meta.group_code ?? undefined,
    groupTitle: meta.group_title ?? undefined,
    groupLabel: meta.group_label ?? undefined,
  };
}

function mapBackendToSections(backendData: any[]): FormSection[] {
  const allSections: FormSection[] = [];

  for (const qnr of backendData) {
    const backendSections = qnr.sections ?? [];

    if (backendSections.length > 0) {
      // Use backend sections as individual form steps
      for (const sec of backendSections) {
        const rawQuestions = (sec.questions ?? []).map(mapSingleQuestion);
        allSections.push({
          id: String(sec.id),
          title: sec.title ?? "Bagian",
          description: sec.description ?? undefined,
          questions: mergeGroupedQuestions(rawQuestions),
        });
      }
    } else {
      // Fallback: treat whole questionnaire as single section (backward compat)
      const rawQuestions = (qnr.questions ?? []).map(mapSingleQuestion);
      allSections.push({
        id: String(qnr.id),
        title: qnr.title ?? "Kuesioner",
        description: qnr.description ?? undefined,
        questions: mergeGroupedQuestions(rawQuestions),
      });
    }
  }

  return allSections;
}

/**
 * Merge questions with the same group_code into a single checkbox question.
 * e.g. f401-f415 (15 separate booleans) → 1 checkbox card with 15 options.
 */
function mergeGroupedQuestions(questions: Question[]): Question[] {
  const grouped: Record<string, Question[]> = {};
  const result: Question[] = [];
  const seenGroups = new Set<string>();

  // Track which individual question code was merged into which group code
  const mergedCodeToGroup: Record<string, string> = {};

  for (const q of questions) {
    if (q.groupCode) {
      if (!grouped[q.groupCode]) grouped[q.groupCode] = [];
      grouped[q.groupCode].push(q);

      // Track: individual code → group code (e.g. f415 → q16_cara_cari_kerja)
      mergedCodeToGroup[q.id] = q.groupCode;

      if (!seenGroups.has(q.groupCode)) {
        seenGroups.add(q.groupCode);
        // Insert a placeholder at this position
        result.push(q);
      }
    } else {
      result.push(q);
    }
  }

  // Replace placeholders with merged checkbox questions, and fix show_if references
  return result.map((q) => {
    // If this is a grouped question placeholder, merge it
    if (q.groupCode && grouped[q.groupCode]) {
      const items = grouped[q.groupCode];
      if (items.length <= 1) return q; // Don't merge single items

      // Find group_title from first item that has it
      const titleItem = items.find((i) => i.groupTitle);

      return {
        id: q.groupCode,
        type: "checkbox" as Question["type"],
        question: titleItem?.groupTitle ?? q.question,
        description: q.description,
        options: items.map((item) => ({
          id: item.id,
          label: item.groupLabel ?? item.question,
        })),
        required: false,
        showIf: q.showIf,
      };
    }

    // For non-grouped questions: rewrite show_if that references a merged code
    if (q.showIf) {
      let rewritten = false;
      const newShowIf: Record<string, (string | number)[]> = {};
      for (const [depCode, values] of Object.entries(q.showIf)) {
        const groupCode = mergedCodeToGroup[depCode];
        if (groupCode) {
          // Rewrite: show when the grouped checkbox answer includes this individual code
          newShowIf[groupCode] = [depCode];
          rewritten = true;
        } else {
          newShowIf[depCode] = values;
        }
      }
      if (rewritten) {
        return { ...q, showIf: newShowIf };
      }
    }

    return q;
  });
}

/**
 * Check if a question should be visible based on current answers.
 * Exported for use in FormPage.tsx.
 */
export function isQuestionVisible(
  q: Question,
  answers: Record<string, unknown>
): boolean {
  if (!q.showIf) return true;

  return Object.entries(q.showIf).every(([depCode, allowedValues]) => {
    const currentAnswer = answers[depCode];
    if (currentAnswer === undefined || currentAnswer === null || currentAnswer === "") return false;

    // For grouped checkbox answers (arrays), check if ANY selected value matches
    if (Array.isArray(currentAnswer)) {
      return allowedValues.some((v) =>
        currentAnswer.includes(String(v))
      );
    }

    return allowedValues.some((v) => String(v) === String(currentAnswer));
  });
}

/**
 * Map backend question_type string → frontend QuestionType.
 */
function mapQuestionType(
  backendType: string
): Question["type"] {
  const map: Record<string, Question["type"]> = {
    short_text: "short",
    short: "short",
    text: "short",
    number: "short",
    long_text: "paragraph",
    paragraph: "paragraph",
    textarea: "paragraph",
    multiple_choice: "multiple_choice",
    radio: "multiple_choice",
    single_choice: "multiple_choice",
    boolean: "multiple_choice",
    checkbox: "checkbox",
    multi_select: "checkbox",
    dropdown: "dropdown",
    select: "dropdown",
    linear_scale: "linear_scale",
    scale: "linear_scale",
    rating: "rating",
    date: "date",
    time: "time",
    file_upload: "file_upload",
  };
  return map[backendType] ?? "short";
}

// ── Fallback sections ketika backend belum tersedia ────────────────────────
const fallbackSections: FormSection[] = [
  {
    id: "s1",
    title: "Kuesioner Tracer Study",
    description: "Silakan isi kuisioner berikut dengan jujur dan lengkap.",
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
      {
        id: "q2",
        type: "short",
        question: "Nama perusahaan / instansi tempat Anda bekerja",
        options: [],
        required: false,
      },
      {
        id: "q3",
        type: "linear_scale",
        question:
          "Seberapa relevan pendidikan Anda dengan pekerjaan saat ini?",
        options: [],
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Tidak relevan",
        scaleMaxLabel: "Sangat relevan",
      },
    ],
  },
];

/**
 * Hook yang menggantikan useFormResponse, dengan integrasi backend:
 *   GET  /api/tracer-study/forms?kode_prodi=xxx  → fetch soal
 *   POST /api/tracer-study/submit                → kirim jawaban
 *
 * Jika backend belum bisa diakses, akan fallback ke soal hardcoded.
 */
export const useTracerForm = (kodeProdi?: string) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingForms, setIsLoadingForms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch forms dari backend ──────────────────────────────────────────────
  useEffect(() => {
    const fetchForms = async () => {
      // Jika tidak ada kodeProdi, langsung gunakan fallback
      if (!kodeProdi) {
        setSections(fallbackSections);
        setIsLoadingForms(false);
        return;
      }

      try {
        const { data } = await api.get("/tracer-study/forms", {
          params: { kode_prodi: kodeProdi },
        });

        if (data.success && data.data && data.data.length > 0) {
          const mapped = mapBackendToSections(data.data);
          setSections(mapped);
        } else {
          // Tidak ada kuesioner aktif
          setSections(fallbackSections);
          toast({
            title: "Info",
            description:
              data.message || "Tidak ada kuesioner aktif, menampilkan default.",
          });
        }
      } catch (err: any) {
        console.warn(
          "[useTracerForm] Backend tidak tersedia, menggunakan fallback:",
          err.message
        );
        setSections(fallbackSections);
      } finally {
        setIsLoadingForms(false);
      }
    };

    fetchForms();
  }, [kodeProdi]);

  // ── Answer management ─────────────────────────────────────────────────────
  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => ({ ...prev, [questionId]: "" }));
  };

  const setCheckboxAnswer = (
    questionId: string,
    optionId: string,
    checked: boolean
  ) => {
    setAnswers((prev) => {
      const current: string[] = (prev[questionId] as string[]) ?? [];
      return {
        ...prev,
        [questionId]: checked
          ? [...current, optionId]
          : current.filter((id) => id !== optionId),
      };
    });
    setErrors((prev) => ({ ...prev, [questionId]: "" }));
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateSection = (sectionIdx: number): boolean => {
    const sec = sections[sectionIdx];
    if (!sec) return false;
    const newErrors: Record<string, string> = {};
    let valid = true;
    sec.questions.forEach((q) => {
      if (!q.required) return;
      if (q.showIf && !isQuestionVisible(q, answers)) return; // Skip hidden questions
      
      const ans = answers[q.id];
      const isEmpty =
        ans === undefined ||
        ans === "" ||
        ans === null ||
        (Array.isArray(ans) && ans.length === 0);
      if (isEmpty) {
        newErrors[q.id] = "Pertanyaan ini wajib diisi";
        valid = false;
      }
    });
    setErrors(newErrors);
    return valid;
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (!validateSection(currentSection)) return;
    setCurrentSection((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setCurrentSection((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ke backend ─────────────────────────────────────────────────────
  const handleSubmit = async (
    e: React.FormEvent,
    identityData?: Record<string, unknown>
  ) => {
    e.preventDefault();
    if (!validateSection(currentSection)) return;

    setIsSubmitting(true);
    try {
      // Gabungkan identity data (nim, name, email, phone, dll) + jawaban kuesioner
      const payload = {
        ...identityData,
        ...answers,
      };

      await api.post("/tracer-study/submit", payload);

      setSubmitted(true);
      toast({
        title: "Berhasil!",
        description: "Kuesioner telah berhasil dikirim",
      });
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        // Map validation errors ke pertanyaan yang salah
        const newErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(serverErrors)) {
          newErrors[key] = Array.isArray(messages)
            ? messages[0]
            : String(messages);
        }
        setErrors(newErrors);
      }

      const msg =
        err.response?.data?.message || "Gagal mengirim kuesioner";
      toast({
        title: "Gagal",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setSubmitted(false);
    setAnswers({});
    setCurrentSection(0);
    setErrors({});
  };

  const progressPercent =
    sections.length > 0
      ? ((currentSection + 1) / sections.length) * 100
      : 0;
  const section = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  return {
    sections,
    answers,
    submitted,
    currentSection,
    errors,
    section,
    isLastSection,
    progressPercent,
    isLoadingForms,
    isSubmitting,
    setAnswer,
    setCheckboxAnswer,
    handleNext,
    handleBack,
    handleSubmit,
    handleReset,
  };
};
