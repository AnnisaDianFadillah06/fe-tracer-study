import {
  createDefaultQuestion,
  createId,
  type BuilderQuestion,
  type BuilderQuestionType,
  type FormListItem,
  type QuestionLogic,
  type QuestionLogicType,
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
  const raw = String(value ?? "short");
  // Map backend DB types → builder types
  const backendToBuilder: Record<string, BuilderQuestionType> = {
    short_text: "short",
    long_text: "paragraph",
    single_choice: "multiple_choice",
    multiple_choice: "checkbox",
    number: "linear_scale",
    boolean: "multiple_choice",
  };
  const type = (backendToBuilder[raw] ?? raw) as BuilderQuestionType;
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

const normalizeLogic = (value: unknown): QuestionLogic => {
  if (!value || typeof value !== "object") {
    return { type: "always", dependsOn: "", values: [] };
  }

  const record = value as Record<string, unknown>;
  const rawType = String(record.type ?? "always") as QuestionLogicType;
  const type: QuestionLogicType = rawType === "in_array" ? "in_array" : "always";
  const dependsOn = record.dependsOn ? String(record.dependsOn) : "";
  const values = normalizeArray(record.values);

  return { type, dependsOn, values };
};

export const createBlankFormDraft = (): FormListItem => ({
  id: `form-${createId("new")}`,
  title: "Untitled Form",
  description: "",
  status: "aktif",
  target: [],
  targetProdi: [],
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

/**
 * Merge grouped boolean questions into a single checkbox question for the builder.
 * 15 individual booleans with same group_code → 1 checkbox with 15 options.
 */
const mergeGroupedForBuilder = (questions: BuilderQuestion[]): BuilderQuestion[] => {
  const grouped: Record<string, BuilderQuestion[]> = {};
  const result: BuilderQuestion[] = [];
  const seenGroups = new Set<string>();
  const individualToGroup: Record<string, { groupCode: string; label: string }> = {};

  for (const q of questions) {
    if (q.group_code) {
      if (!grouped[q.group_code]) grouped[q.group_code] = [];
      grouped[q.group_code].push(q);
      individualToGroup[q.id] = { groupCode: q.group_code, label: q.group_label ?? q.question };
      if (!seenGroups.has(q.group_code)) {
        seenGroups.add(q.group_code);
        result.push(q);
      }
    } else {
      result.push(q);
    }
  }

  const merged = result.map((q) => {
    if (q.group_code && grouped[q.group_code] && grouped[q.group_code].length > 1) {
      const items = grouped[q.group_code];
      const titleItem = items.find((i) => i.group_title);
      return {
        id: q.group_code,
        type: "checkbox" as BuilderQuestionType,
        question: titleItem?.group_title ?? q.question,
        description: "",
        options: items.map((item) => item.group_label ?? item.question),
        required: false,
        allowOther: false,
        logic: { type: "always" as any, dependsOn: "", values: [] },
        group_code: q.group_code,
        group_title: titleItem?.group_title,
        _individual_codes: items.map((item) => item.id),
        _original_options: items.map((item) => ({ label: item.group_label ?? item.question, code: item.id })),
      } as BuilderQuestion;
    }
    return q;
  });

  // Rewrite logic.dependsOn that references a merged individual code
  return merged.map((q) => {
    if (q.logic && q.logic.type === "in_array" && q.logic.dependsOn) {
      const ref = individualToGroup[q.logic.dependsOn];
      if (ref) {
        return { ...q, logic: { ...q.logic, dependsOn: ref.groupCode, values: [ref.label] } };
      }
    }
    return q;
  });
};

export const createFormDraftFromQuestionnaire = (questionnaire: any): FormListItem => {
  const rawSections = Array.isArray(questionnaire?.sections) ? questionnaire.sections : [];

  // Build lookup: question_code → { option_code → option_label }
  // Dipakai untuk translate show_if values (option_code) ke label yang dipakai builder.
  const optionLabelMap: Record<string, Record<string, string>> = {};
  for (const sec of rawSections) {
    for (const q of (sec?.questions ?? [])) {
      const code = String(q?.code ?? q?.question_code ?? q?.id ?? "");
      const opts = Array.isArray(q?.options) ? q.options : [];
      if (code && opts.length > 0) {
        const map: Record<string, string> = {};
        for (const o of opts) {
          const optCode = String(o?.code ?? o?.value ?? o?.id ?? "");
          const optLabel = String(o?.label ?? "");
          if (optCode && optLabel) map[optCode] = optLabel;
        }
        optionLabelMap[code] = map;
      }
    }
  }

  /** Resolve show_if from metadata into QuestionLogic format. */
  const resolveLogicFromMetadata = (question: any): QuestionLogic => {
    // First try explicit logic field (from user-created questionnaires)
    if (question?.logic && typeof question.logic === "object" && question.logic.type === "in_array") {
      return normalizeLogic(question.logic);
    }

    // Then try metadata.show_if (from seeder / backend-stored)
    const meta = question?.metadata;
    const showIf = meta?.show_if;
    if (showIf && typeof showIf === "object") {
      const entries = Object.entries(showIf);
      if (entries.length > 0) {
        const [depCode, vals] = entries[0] as [string, unknown];
        if (depCode && Array.isArray(vals)) {
          const triggerOptions = optionLabelMap[depCode] ?? {};
          const allLabels = Object.values(triggerOptions);
          const resolvedValues = (vals as unknown[]).map((v) => {
            const strVal = String(v);
            if (allLabels.includes(strVal)) return strVal;
            return triggerOptions[strVal] ?? strVal;
          });
          return { type: "in_array", dependsOn: depCode, values: resolvedValues };
        }
      }
    }

    return { type: "always", dependsOn: "", values: [] };
  };

  const sections = rawSections.length > 0
    ? rawSections.map((section: any, sectionIndex: number) => {
        const rawQuestions = Array.isArray(section?.questions) ? section.questions : [];

        const mappedQuestions = rawQuestions.map((question: any) => {
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
              _original_options: Array.isArray(question?.options)
                ? question.options.map((o: any) => ({ label: String(o?.label ?? o ?? ""), code: String(o?.code ?? o?.value ?? "") })).filter((o: any) => o.label)
                : undefined,
              logic: resolveLogicFromMetadata(question),
              group_code: question?.metadata?.group_code ?? undefined,
              group_label: question?.metadata?.group_label ?? undefined,
              group_title: question?.metadata?.group_title ?? undefined,
            };

            if (type !== "linear_scale" && type !== "rating") {
              draftQuestion.scaleLabels = [];
            }

            return draftQuestion;
        });

        return {
          id: String(section?.id ?? createId("section")),
          title: String(section?.title ?? `Bagian ${sectionIndex + 1}`),
          description: section?.description ? String(section.description) : "",
          questions: mergeGroupedForBuilder(mappedQuestions),
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
    targetProdi: normalizeArray(questionnaire?.target_prodi),
    respondents: normalizeArray(questionnaire?.respondents ?? questionnaire?.sample_respondents),
    sections,
    responses: [],
  };
};
