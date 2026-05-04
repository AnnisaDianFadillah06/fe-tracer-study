import { useState, useEffect } from "react";
import { apiService } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";
import type { FormSection, Question, Option } from "@/hooks/useQuestionManagement";

interface QuestionnaireResponse {
  id: number;
  code: string;
  title: string;
  period_year: number;
  version: number;
  status: string;
  is_global: boolean;
  questions: BackendQuestion[];
}

interface BackendQuestion {
  id: number;
  code: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  order_no: number;
  options: BackendOption[];
  metadata?: any;
}

interface BackendOption {
  id: number;
  option_code: string;
  option_label: string;
  order_no: number;
}

/**
 * Transform backend question type to frontend question type
 */
const transformQuestionType = (backendType: string): string => {
  const typeMap: Record<string, string> = {
    single_choice: "multiple_choice",
    multiple_choice: "checkbox",
    checkbox: "checkbox",
    short_text: "short",
    text: "paragraph",
    paragraph: "paragraph",
    dropdown: "dropdown",
    linear_scale: "linear_scale",
    rating: "rating",
    date: "date",
    time: "time",
    number: "short",
    boolean: "checkbox",
  };
  return typeMap[backendType] || "short";
};

/**
 * Transform backend questions and options to frontend format
 */
const transformQuestionnaire = (
  questionnaire: QuestionnaireResponse
): FormSection => {
  const questions: Question[] = questionnaire.questions.map((q) => {
    const transformedType = transformQuestionType(q.question_type);
    const options: Option[] = q.options.map((opt) => ({
      id: `opt_${opt.id}`,
      label: opt.option_label,
    }));

    const question: Question = {
      id: `q_${q.id}`,
      type: transformedType as any,
      question: q.question_text,
      options,
      required: q.is_required,
      scaleMin: 1,
      scaleMax: 5,
      scaleMinLabel: "Tidak setuju",
      scaleMaxLabel: "Sangat setuju",
    };

    return question;
  });

  return {
    id: `qnr_${questionnaire.id}`,
    title: questionnaire.title,
    description: `Kuesioner ${questionnaire.is_global ? "Nasional" : "Prodi"} Tahun ${questionnaire.period_year}`,
    questions,
  };
};

export const useQuestionnaireFetch = (kodeProdi: string) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kodeProdi) return;

    const fetchQuestionnaires = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.getQuestionnaireForms(kodeProdi);

        if (response.success && response.data) {
          const transformedSections = response.data.map((qnr: QuestionnaireResponse) =>
            transformQuestionnaire(qnr)
          );
          setSections(transformedSections);
        } else {
          throw new Error(
            response.message || "Gagal mengambil data kuesioner dari server"
          );
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Gagal memuat kuesioner dari server";
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaires();
  }, [kodeProdi, toast]);

  return {
    sections,
    loading,
    error,
  };
};
