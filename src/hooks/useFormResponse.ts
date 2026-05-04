import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FormSection } from "@/hooks/useQuestionManagement";
import { useQuestionnaireFetch } from "@/hooks/useQuestionnaireFetch";
import { apiService } from "@/lib/apiClient";

const STORAGE_KEY = "tracer_form_responses";
const DRAFT_STORAGE_KEY = "tracer_form_draft";

const defaultSections: FormSection[] = [
  {
    id: "s1",
    title: "Kuesioner Tracer Study",
    description: "Silakan isi formulir berikut dengan jujur dan lengkap.",
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
        question: "Seberapa relevan pendidikan Anda dengan pekerjaan saat ini?",
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

interface UseFormResponseProps {
  kodeProdi?: string;
  alumniData?: {
    nim: string;
    name: string;
    email: string;
    phone?: string;
    tahun_lulus?: number;
    nik?: string;
    npwp?: string;
    kode_pt?: string;
  };
}

const normalizeKodeProdi = (value: string) => {
  const normalized = value.trim().toUpperCase();

  const prodiMap: Record<string, string> = {
    "TEKNIK INFORMATIKA": "TI",
    "SISTEM INFORMASI": "SI",
    "TEKNIK ELEKTRO": "TE",
    "TEKNIK MESIN": "TM",
    "TEKNIK SIPIL": "TS",
    "AKUNTANSI": "AK",
    "ADMINISTRASI NIAGA": "AN",
    "TEKNIK KIMIA": "TK",
    "TEKNIK REFRIGERASI & TATA UDARA": "TRTU",
    "TEKNIK KONVERSI ENERGI": "TKE",
  };

  return prodiMap[normalized] ?? normalized;
};

export const useFormResponse = ({ kodeProdi = "TI", alumniData }: UseFormResponseProps = {}) => {
  const { toast } = useToast();
  const normalizedKodeProdi = normalizeKodeProdi(kodeProdi);
  
  // Fetch questionnaires from API
  const { sections: fetchedSections, loading: questionsLoading, error: fetchError } = useQuestionnaireFetch(
    normalizedKodeProdi
  );

  const [sections, setSections] = useState<FormSection[]>(defaultSections);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use fetched sections if available, fallback to default
  useEffect(() => {
    if (fetchedSections && fetchedSections.length > 0) {
      setSections(fetchedSections);
    } else if (fetchError) {
      // If fetch failed, use default sections
      setSections(defaultSections);
    }
  }, [fetchedSections, fetchError]);

  // Load saved draft answers from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        setAnswers(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Auto-save draft answers to localStorage
  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => ({ ...prev, [questionId]: "" }));
  };

  const setCheckboxAnswer = (questionId: string, optionId: string, checked: boolean) => {
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

  const validateSection = (sectionIdx: number): boolean => {
    const sec = sections[sectionIdx];
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

  const handleNext = () => {
    if (!validateSection(currentSection)) return;
    setCurrentSection((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setCurrentSection((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSection(currentSection)) return;

    setIsSubmitting(true);
    try {
      // Transform and send to API
      const submitData = {
        kdpstmsmh: kodeProdi,
        ...alumniData,
        answers: answers, // Contains { question_id: answer_value }
      };

      const response = await apiService.submitTracerStudyForm(submitData);

      if (response.success) {
        setSubmitted(true);
        // Clear draft after successful submission
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
        
        toast({
          title: "Berhasil!",
          description: "Kuesioner telah berhasil dikirim ke server",
        });
      } else {
        throw new Error(response.message || "Gagal mengirim kuesioner");
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengirim kuesioner, silakan coba lagi";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setAnswers({});
    setCurrentSection(0);
    setErrors({});
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  };

  const progressPercent = sections.length > 0 ? ((currentSection + 1) / sections.length) * 100 : 0;
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
    questionsLoading,
    isSubmitting,
    fetchError,
    setAnswer,
    setCheckboxAnswer,
    handleNext,
    handleBack,
    handleSubmit,
    handleReset,
  };
};
