import {
  createDefaultQuestion,
  createId,
  type BuilderQuestion,
  type BuilderQuestionType,
  type FormListItem,
  type QuestionLogic,
  type QuestionLogicType,
  pickAnalyticsMeta,
} from "@/lib/formManagement";

export const BUILDER_DRAFT_STORAGE_KEY = "tracer_form_builder_draft";

/**
 * Versi bentuk draf yang tersimpan di localStorage.
 *
 * Draf itu berumur panjang — ia bertahan melewati pembaruan aplikasi, dan
 * didahulukan daripada data server supaya suntingan yang belum disimpan tidak
 * hilang. Kombinasi itu berbahaya begitu bentuk datanya berubah: draf yang
 * dibuat versi lama akan terus menghidupkan bentuk usang, dan perbaikan
 * apa pun tampak tidak berpengaruh sampai localStorage dibersihkan manual.
 *
 * Contohnya isian angka. Sebelum versi 2, tipe "number" dari basis data
 * dipetakan menjadi "linear_scale", sehingga pertanyaan pendapatan tersimpan
 * di draf sebagai skala 1-5. Menaikkan angka ini membuat draf semacam itu
 * diabaikan, bukan dibiarkan menular.
 *
 * NAIKKAN setiap kali bentuk BuilderQuestion atau pemetaan tipenya berubah.
 */
export const BUILDER_DRAFT_SCHEMA_VERSION = 2;

/** Bungkus draf dengan penanda versi sebelum disimpan. */
export const stampDraft = <T extends object>(draft: T): T & { schemaVersion: number } => ({
  ...draft,
  schemaVersion: BUILDER_DRAFT_SCHEMA_VERSION,
});

/**
 * Baca draf dari localStorage, abaikan yang versinya bukan versi sekarang.
 *
 * @returns draf yang masih sah, atau null bila tidak ada / sudah usang.
 */
export const readDraft = <T>(key: string): T | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { schemaVersion?: number };
    if (parsed?.schemaVersion !== BUILDER_DRAFT_SCHEMA_VERSION) {
      // Dibuang sekalian supaya tidak diperiksa lagi tiap kali halaman dibuka.
      localStorage.removeItem(key);
      return null;
    }

    return parsed as T;
  } catch {
    return null;
  }
};

const BUILDER_QUESTION_TYPES = new Set<BuilderQuestionType>([
  "short",
  "paragraph",
  "number",
  "multiple_choice",
  "checkbox",
  "dropdown",
  "lookup",
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

  // PENTING: cek kosakata builder LEBIH DULU. "multiple_choice" ada di kedua
  // kosakata dengan arti BERLAWANAN — di basis data artinya jawaban boleh
  // lebih dari satu (checkbox), di builder artinya pilihan tunggal (radio).
  // Backend sudah menerjemahkan ke kosakata builder sebelum mengirim
  // (single_choice → multiple_choice di mapQuestionFull), jadi tanpa
  // penjagaan ini pertanyaan radio yang sudah benar akan diterjemahkan
  // sekali lagi menjadi checkbox. Itulah sebabnya f8 "Jelaskan status Anda
  // saat ini?" — single_choice di seeder — terbuka sebagai Checkboxes.
  if (BUILDER_QUESTION_TYPES.has(raw as BuilderQuestionType)) {
    return raw as BuilderQuestionType;
  }

  // Sisanya memang tipe basis data mentah.
  const backendToBuilder: Record<string, BuilderQuestionType> = {
    short_text: "short",
    long_text: "paragraph",
    single_choice: "multiple_choice",
    multiple_choice: "checkbox",
    // Pertanyaan angka BERSKALA sudah dikirim server sebagai "linear_scale",
    // jadi tipe mentah "number" yang sampai di sini adalah isian angka bebas.
    // Dulu semuanya dijadikan skala, sehingga pertanyaan pendapatan pun
    // terbuka sebagai lima tombol "Sangat tidak setuju".
    number: "number",
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

/**
 * Sidecar metadata opsi (kode + status tersembunyi), sejajar indeks dengan
 * daftar label hasil normalizeOptions().
 *
 * Ini gerbang muat: kalau panjangnya tidak sama persis dengan labelnya —
 * draf lama dari versi builder sebelumnya, atau opsi yang labelnya kosong
 * lalu tersaring — sidecar dibuang seluruhnya, bukan dipakai setengah.
 * Sidecar yang miring satu indeks lebih berbahaya daripada tidak ada:
 * kodenya akan menempel ke opsi yang salah dan jawaban lama ikut salah baca.
 */
const normalizeOptionMeta = (
  raw: unknown,
  labels: string[],
): BuilderQuestion["_original_options"] => {
  if (!Array.isArray(raw)) return undefined;

  const meta = raw
    .map((option) => {
      if (typeof option === "string") {
        return { label: option, code: "", is_hidden: false };
      }
      const record = (option ?? {}) as Record<string, unknown>;
      return {
        label: String(record.label ?? record.value ?? record.code ?? ""),
        code: String(record.code ?? record.value ?? ""),
        is_hidden: Boolean(record.is_hidden),
      };
    })
    .filter((option) => option.label.trim().length > 0);

  return meta.length === labels.length ? meta : undefined;
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
            let type = normalizeQuestionType(question?.type ?? question?.question_type);

            // Penjaga untuk sumber yang hanya membawa tipe mentah basis data:
            // di sana pertanyaan skala dan isian angka sama-sama bertipe
            // "number", dan yang membedakan hanya metadata skalanya.
            //
            // HANYA metadata yang boleh dijadikan penentu. Medan datar
            // scaleMin/scaleMax selalu terisi 1 dan 5 oleh server sebagai
            // nilai bawaan penyunting skala — ikut memeriksanya berarti
            // menyatakan SEMUA pertanyaan angka sebagai skala.
            if (type === "number" && question?.metadata?.scale_min != null) {
              type = "linear_scale";
            }
            const scaleMin = Number(question?.scaleMin ?? question?.scale_min ?? 1) || 1;
            const scaleMax = Number(question?.scaleMax ?? question?.scale_max ?? 5) || 5;
            const optionLabels = normalizeOptions(question?.options);

            const draftQuestion: BuilderQuestion = {
              id: String(question?.code ?? question?.question_code ?? question?.id ?? createId("q")),
              type,
              question: String(question?.question ?? question?.question_text ?? ""),
              // Medan bantu pengisian ikut disalin. Sebelumnya hanya medan
              // yang disebut namanya di sini yang terbawa, sehingga menyalin
              // kuesioner sebagai template membuang petunjuk, keterangan,
              // format, dan pemisahnya — hilang bahkan sebelum disimpan.
              description: String(question?.description ?? question?.metadata?.description ?? ""),
              hint: question?.hint ?? question?.metadata?.hint ?? undefined,
              format: question?.format ?? question?.metadata?.format ?? undefined,
              dividerLabel: question?.divider_label ?? question?.metadata?.divider_label ?? undefined,
              optionHints: question?.metadata?.option_hints ?? undefined,
              analyticsMeta: pickAnalyticsMeta(question?.metadata),
              warnMin: question?.warn_min ?? question?.metadata?.warn_min ?? undefined,
              warnMax: question?.warn_max ?? question?.metadata?.warn_max ?? undefined,
              options: optionLabels,
              required: Boolean(question?.required ?? question?.is_required ?? false),
              allowOther: Boolean(question?.allowOther ?? question?.allow_other ?? false),
              scaleMin,
              scaleMax,
              scaleLabels: normalizeScaleLabels(scaleMin, scaleMax, question?.scaleLabels ?? question?.scale_labels),
              gridRows: normalizeArray(question?.gridRows ?? question?.grid_rows),
              gridColumns: normalizeArray(question?.gridColumns ?? question?.grid_columns),
              _original_options: normalizeOptionMeta(question?.options, optionLabels),
              logic: resolveLogicFromMetadata(question),
              group_code: question?.metadata?.group_code ?? undefined,
              group_label: question?.metadata?.group_label ?? undefined,
              group_title: question?.metadata?.group_title ?? undefined,
              // Isian referensi: backend mengirimkannya di dua tempat — medan
              // datar hasil mapQuestionFull() dan metadata mentah. Dibaca dari
              // keduanya supaya borang lama yang hanya punya metadata tetap
              // terbuka sebagai lookup, bukan berubah jadi kotak teks.
              lookup: question?.lookup ?? question?.metadata?.lookup ?? undefined,
              lookupValue: question?.lookupValue ?? question?.metadata?.lookup_value ?? undefined,
              dependsOn: question?.dependsOn ?? question?.metadata?.depends_on ?? undefined,
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
