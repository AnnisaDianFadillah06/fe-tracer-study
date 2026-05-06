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
function mapBackendToSections(backendData: any[]): FormSection[] {
  return backendData.map((qnr: any) => ({
    id: String(qnr.id),
    title: qnr.title ?? "Kuesioner",
    description: qnr.description ?? undefined,
    questions: (qnr.questions ?? []).map((q: any) => {
      const feType = mapQuestionType(q.question_type);
      const meta = q.metadata ?? {};

      const question: Question = {
        id: q.question_code ?? String(q.id), // use question_code as the key for answers
        type: feType,
        question: q.question_text ?? "",
        description: meta.description ?? undefined,
        options: (q.options ?? []).map((o: any) => ({
          id: o.value ?? String(o.id),
          label: o.label ?? "",
        })),
        required: !!q.is_required,
        scaleMin: meta.scale_min ?? 1,
        scaleMax: meta.scale_max ?? 5,
        scaleMinLabel: meta.scale_min_label ?? "",
        scaleMaxLabel: meta.scale_max_label ?? "",
      };

      return question;
    }),
  }));
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
    long_text: "paragraph",
    paragraph: "paragraph",
    textarea: "paragraph",
    multiple_choice: "multiple_choice",
    radio: "multiple_choice",
    single_choice: "multiple_choice",
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
