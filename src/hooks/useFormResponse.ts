import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { FormSection } from "@/hooks/useQuestionManagement";

const STORAGE_KEY = "tracer_form_sections";

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

export const useFormResponse = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>(defaultSections);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSections(JSON.parse(saved));
      } catch {}
    }
  }, []);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSection(currentSection)) return;
    setSubmitted(true);
    toast({ title: "Berhasil!", description: "Kuesioner telah berhasil dikirim" });
  };

  const handleReset = () => {
    setSubmitted(false);
    setAnswers({});
    setCurrentSection(0);
    setErrors({});
  };

  const progressPercent = ((currentSection + 1) / sections.length) * 100;
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
    setAnswer,
    setCheckboxAnswer,
    handleNext,
    handleBack,
    handleSubmit,
    handleReset,
  };
};
