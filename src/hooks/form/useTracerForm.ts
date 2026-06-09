import { useState, useEffect } from "react";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import type { FormSection, Question, Option } from "@/hooks/form/useQuestionManagement";

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
  // Defensive: metadata bisa object, string JSON, atau null
  let meta: Record<string, any> = {};
  if (q.metadata && typeof q.metadata === "object") {
    meta = q.metadata;
  } else if (typeof q.metadata === "string") {
    try { meta = JSON.parse(q.metadata); } catch { meta = {}; }
  }

  // Smart type detection: 'number' with scale metadata → linear_scale
  let feType = mapQuestionType(q.question_type);
  if (q.question_type === "number" && (meta.scale_min != null || meta.scale_max != null)) {
    feType = "linear_scale";
  }

  // Boolean questions without group → multiple_choice with Ya/Tidak
  let options: Option[] = (q.options ?? []).map((o: any) => ({
    id: o.value ?? o.code ?? String(o.id),
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
    id: q.question_code ?? q.code ?? String(q.id),
    type: feType,
    question: q.question_text ?? "",
    description: meta.description ?? undefined,
    options,
    required: !!q.is_required,
    scaleMin: meta.scale_min ?? meta.scaleMin ?? 1,
    scaleMax: meta.scale_max ?? meta.scaleMax ?? 5,
    scaleMinLabel: meta.scale_labels?.[0] ?? meta.scaleLabels?.[0] ?? meta.scale_min_label ?? meta.scaleMinLabel ?? "",
    scaleMaxLabel: (() => { const labels = meta.scale_labels ?? meta.scaleLabels; return labels?.length ? labels[labels.length - 1] : (meta.scale_max_label ?? meta.scaleMaxLabel ?? ""); })(),
    showIf: meta.show_if ?? meta.showIf ?? undefined,
    groupCode: meta.group_code ?? meta.groupCode ?? undefined,
    groupTitle: meta.group_title ?? meta.groupTitle ?? undefined,
    groupLabel: meta.group_label ?? meta.groupLabel ?? undefined,
  };
}

/** Separator used to namespace question IDs per questionnaire. */
const QID_SEP = "___";

function mapBackendToSections(backendData: any[]): FormSection[] {
  const allSections: FormSection[] = [];

  for (const qnr of backendData) {
    const prefix = String(qnr.id) + QID_SEP;
    // 1 questionnaire = 1 page. Prefix question IDs to avoid collision
    // when multiple questionnaires share the same question_code.
    const rawQuestions = (qnr.questions ?? []).map((q: any) => {
      const mapped = mapSingleQuestion(q);
      // Prefix the question id
      mapped.id = prefix + mapped.id;
      // Prefix showIf dependency keys
      if (mapped.showIf) {
        const prefixed: Record<string, (string | number)[]> = {};
        for (const [depCode, vals] of Object.entries(mapped.showIf)) {
          prefixed[prefix + depCode] = vals;
        }
        mapped.showIf = prefixed;
      }
      // Prefix groupCode so merging stays within same questionnaire
      if (mapped.groupCode) {
        mapped.groupCode = prefix + mapped.groupCode;
      }
      return mapped;
    });
    allSections.push({
      id: String(qnr.id),
      title: qnr.title ?? "Kuesioner",
      description: qnr.description ?? undefined,
      questions: mergeGroupedQuestions(rawQuestions),
    });
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
  answers: Record<string, unknown>,
  allQuestions?: Question[],
): boolean {
  if (!q.showIf) return true;

  return Object.entries(q.showIf).every(([depCode, allowedValues]) => {
    const currentAnswer = answers[depCode];
    if (currentAnswer === undefined || currentAnswer === null || currentAnswer === "") return false;

    // Build lookup: option code → label (untuk match show_if yang simpan label)
    let optionCodeToLabel: Record<string, string> = {};
    if (allQuestions) {
      const trigger = allQuestions.find((tq) => tq.id === depCode);
      if (trigger?.options) {
        for (const opt of trigger.options) {
          optionCodeToLabel[opt.id] = opt.label;
        }
      }
    }

    // For grouped checkbox answers (arrays), check if ANY selected value matches
    if (Array.isArray(currentAnswer)) {
      return allowedValues.some((v) => {
        const strV = String(v);
        return currentAnswer.some((ans) => {
          const strAns = String(ans);
          // Match by: direct equality, or answer's label matches value
          return strAns === strV || optionCodeToLabel[strAns] === strV;
        });
      });
    }

    const strAnswer = String(currentAnswer);
    return allowedValues.some((v) => {
      const strV = String(v);
      // Match by: direct equality (code===code), or answer's label matches value
      return strV === strAnswer || optionCodeToLabel[strAnswer] === strV;
    });
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
export const useTracerForm = (kodeProdi?: string, graduationYear?: number, nim?: string, identityPrefill?: Record<string, string>) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoadingForms, setIsLoadingForms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);

  // ── Fetch forms dari backend ──────────────────────────────────────────────
  useEffect(() => {
    const fetchForms = async () => {
      // Jika tidak ada kodeProdi, tidak bisa fetch — tampilkan empty
      if (!kodeProdi) {
        setSections([]);
        setIsLoadingForms(false);
        toast({ title: "Info", description: "Kode prodi tidak tersedia. Silakan login ulang." });
        return;
      }

      try {
        const { data } = await api.get("/tracer-study/forms", {
          params: { kode_prodi: kodeProdi, ...(graduationYear ? { graduation_year: graduationYear } : {}), ...(nim ? { nim } : {}) },
        });

        if (data.success && data.data && data.data.length > 0) {
          const mapped = mapBackendToSections(data.data);
          setSections(mapped);
          setHasResponded(!!data.has_responded);
          // Auto-fill identity fields from profile
          if (identityPrefill) {
            const prefilled: Record<string, unknown> = {};
            for (const sec of mapped) {
              for (const q of sec.questions) {
                const rawCode = q.id.includes(QID_SEP) ? q.id.split(QID_SEP)[1] : q.id;
                if (identityPrefill[rawCode]) {
                  prefilled[q.id] = identityPrefill[rawCode];
                }
              }
            }
            if (Object.keys(prefilled).length > 0) {
              setAnswers((prev) => ({ ...prefilled, ...prev }));
            }
          }
        } else {
          // Tidak ada kuesioner aktif untuk tahun lulus ini
          setSections([]);
          toast({
            title: "Info",
            description: "Tidak ada kuesioner aktif untuk tahun lulusan Anda.",
          });
        }
      } catch (err: any) {
        console.warn("[useTracerForm] Backend error:", err.message);
        setSections([]);
        toast({
          title: "Gagal",
          description: "Tidak dapat memuat kuesioner. Coba lagi nanti.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingForms(false);
      }
    };

    fetchForms();
  }, [kodeProdi, graduationYear]);

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
      if (q.showIf && !isQuestionVisible(q, answers, sec.questions)) return; // Skip hidden questions
      
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
      // Strip questionnaire prefix from answer keys before sending
      const strippedAnswers: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(answers)) {
        const rawKey = key.includes(QID_SEP) ? key.split(QID_SEP)[1] : key;
        // Strip prefix from checkbox array values too
        const rawValue = Array.isArray(value)
          ? value.map((v) => (typeof v === "string" && v.includes(QID_SEP) ? v.split(QID_SEP)[1] : v))
          : value;
        // Don't overwrite a filled answer with an empty one (handles duplicate question_codes across questionnaires)
        const isEmpty = rawValue === undefined || rawValue === null || rawValue === "" || (Array.isArray(rawValue) && rawValue.length === 0);
        if (!isEmpty || !(rawKey in strippedAnswers)) {
          strippedAnswers[rawKey] = rawValue;
        }
      }

      // Gabungkan jawaban kuesioner + identity data (identity wins for overlapping keys)
      const payload = {
        ...strippedAnswers,
        ...identityData,
        questionnaire_ids: sections.map((s) => Number(s.id)),
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
    hasResponded,
    setAnswer,
    setCheckboxAnswer,
    handleNext,
    handleBack,
    handleSubmit,
    handleReset,
  };
};
