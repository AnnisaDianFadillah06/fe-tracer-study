import {
  createDefaultQuestion,
  createId,
  type BuilderQuestion,
  type BuilderQuestionType,
  type FormListItem,
} from "@/lib/formManagement";

export const BUILDER_DRAFT_STORAGE_KEY = "tracer_form_builder_draft";

const BUILDER_QUESTION_TYPES = new Set<BuilderQuestionType>([
  "short",
  "paragraph",
  "multiple_choice",
  "checkbox",
  "dropdown",
  "file_upload",
  "linear_scale",
  "rating",
  "multiple_choice_grid",
  "checkbox_grid",
  "date",
  "time",
]);

const normalizeArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "")).filter((item) => item.trim().length > 0);
};

const normalizeQuestionType = (value: unknown): BuilderQuestionType => {
  const type = String(value ?? "short") as BuilderQuestionType;
  return BUILDER_QUESTION_TYPES.has(type) ? type : "short";
};

const normalizeOptions = (options: unknown): string[] => {
  if (!Array.isArray(options)) return [];

  return options
    .map((option) => {
      if (typeof option === "string") return option;
      if (option && typeof option === "object") {
        const record = option as Record<string, unknown>;
        return String(record.label ?? record.value ?? record.code ?? "");
      }
      return "";
    })
    .filter((option) => option.trim().length > 0);
};

const normalizeScaleLabels = (minValue: number, maxValue: number, labels?: unknown): string[] => {
  const count = Math.max(0, maxValue - minValue + 1);
  const values = normalizeArray(labels);

  return Array.from({ length: count }, (_, index) => values[index] ?? "");
};

export const createBlankFormDraft = (): FormListItem => ({
  id: `form-${createId("new")}`,
  title: "Untitled Form",
  description: "",
  status: "aktif",
  target: [],
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
});

export const createFormDraftFromQuestionnaire = (questionnaire: any): FormListItem => {
  const rawSections = Array.isArray(questionnaire?.sections) ? questionnaire.sections : [];
  const sections = rawSections.length > 0
    ? rawSections.map((section: any, sectionIndex: number) => {
        const rawQuestions = Array.isArray(section?.questions) ? section.questions : [];

        return {
          id: String(section?.id ?? createId("section")),
          title: String(section?.title ?? `Bagian ${sectionIndex + 1}`),
          description: section?.description ? String(section.description) : "",
          questions: rawQuestions.map((question: any) => {
            const type = normalizeQuestionType(question?.type ?? question?.question_type);
            const scaleMin = Number(question?.scaleMin ?? question?.scale_min ?? 1) || 1;
            const scaleMax = Number(question?.scaleMax ?? question?.scale_max ?? 5) || 5;

            const draftQuestion: BuilderQuestion = {
              id: String(question?.code ?? question?.question_code ?? question?.id ?? createId("q")),
              type,
              question: String(question?.question ?? question?.question_text ?? ""),
              description: question?.description ? String(question.description) : "",
              options: normalizeOptions(question?.options),
              required: Boolean(question?.required ?? question?.is_required ?? false),
              allowOther: Boolean(question?.allowOther ?? question?.allow_other ?? false),
              scaleMin,
              scaleMax,
              scaleLabels: normalizeScaleLabels(scaleMin, scaleMax, question?.scaleLabels ?? question?.scale_labels),
              gridRows: normalizeArray(question?.gridRows ?? question?.grid_rows),
              gridColumns: normalizeArray(question?.gridColumns ?? question?.grid_columns),
            };

            if (type !== "linear_scale" && type !== "rating") {
              draftQuestion.scaleLabels = [];
            }

            return draftQuestion;
          }),
        };
      })
    : [
        {
          id: createId("section"),
          title: "Bagian 1",
          description: "",
          questions: [createDefaultQuestion("short")],
        },
      ];

  return {
    id: `template-${String(questionnaire?.code ?? questionnaire?.id ?? createId("template"))}`,
    title: String(questionnaire?.title ?? "Kuesioner"),
    description: questionnaire?.description ? String(questionnaire.description) : "",
    status: questionnaire?.status === "published" ? "aktif" : "nonaktif",
    target: normalizeArray(questionnaire?.target),
    respondents: normalizeArray(questionnaire?.respondents ?? questionnaire?.sample_respondents),
    sections,
    responses: [],
  };
};
