import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

const STORAGE_KEY = "tracer_form_sections";

export const makeId = () => `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export const defaultQuestion = (type: QuestionType = "multiple_choice"): Question => ({
  id: makeId(),
  type,
  question: "",
  options:
    type === "multiple_choice" || type === "checkbox" || type === "dropdown"
      ? [{ id: makeId(), label: "Opsi 1" }]
      : [],
  required: false,
  scaleMin: 1,
  scaleMax: 5,
  scaleMinLabel: "",
  scaleMaxLabel: "",
});

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

const loadSections = (): FormSection[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return initialSections;
};

export const useQuestionManagement = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>(loadSections);
  const [activeQuestion, setActiveQuestion] = useState<string | null>("q1");
  const [deleteTarget, setDeleteTarget] = useState<{ sectionId: string; questionId: string } | null>(null);

  // ── Section helpers ──────────────────────────────────────────────────────────
  const updateSection = (sId: string, patch: Partial<FormSection>) =>
    setSections((prev) => prev.map((s) => (s.id === sId ? { ...s, ...patch } : s)));

  const addSection = () => {
    const newSec: FormSection = { id: makeId(), title: "Bagian baru", questions: [] };
    setSections((prev) => [...prev, newSec]);
  };

  const deleteSection = (sId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sId));
  };

  // ── Question helpers ─────────────────────────────────────────────────────────
  const addQuestion = (sectionId: string) => {
    const q = defaultQuestion("multiple_choice");
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, questions: [...s.questions, q] } : s))
    );
    setActiveQuestion(q.id);
  };

  const duplicateQuestion = (sectionId: string, qId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== sectionId) return s;
        const idx = s.questions.findIndex((q) => q.id === qId);
        if (idx === -1) return s;
        const copy = {
          ...s.questions[idx],
          id: makeId(),
          options: s.questions[idx].options.map((o) => ({ ...o, id: makeId() })),
        };
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
    setDeleteTarget(null);
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

  // ── Option helpers ───────────────────────────────────────────────────────────
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

  // ── Persistence ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    toast({ title: "Tersimpan", description: "Kuesioner berhasil disimpan" });
  };

  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);

  return {
    sections,
    activeQuestion,
    setActiveQuestion,
    deleteTarget,
    setDeleteTarget,
    updateSection,
    addSection,
    deleteSection,
    addQuestion,
    duplicateQuestion,
    deleteQuestion,
    updateQuestion,
    changeType,
    addOption,
    updateOption,
    removeOption,
    handleSave,
    totalQuestions,
  };
};
