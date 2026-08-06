// ── Backend API types ──────────────────────────────────────────────────────────
/** Shape returned by GET /api/questionnaires */
export interface BackendQuestionnaire {
  id: number;
  code: string;
  title: string;
  description: string | null;
  target: string | null;
  respondents: string[];
  period_year: number;
  version: number;
  status: string;             // 'published' | 'draft'
  program_id: number | null;
  is_global: boolean;
  response_count: number;
  target_graduation_years: number[] | null;
  sections: BackendSection[];
}

export interface BackendSection {
  id: number;
  title: string;
  description: string | null;
  questions: BackendQuestion[];
}

export interface BackendQuestion {
  id: number;
  code: string;
  question: string;
  question_text: string;
  type: string;
  description: string | null;
  options: BackendOption[];
  required: boolean;
  allowOther: boolean;
  scaleMin: number;
  scaleMax: number;
  gridRows: string[];
  gridColumns: string[];
  metadata?: Record<string, unknown> | null;
  show_if?: Record<string, unknown> | null;
}

export interface BackendOption {
  id: number;
  code: string;
  label: string;
  value: string | null;
  order_no: number;
  /** Disembunyikan dari borang alumni, tetapi barisnya tetap ada di basis data. */
  is_hidden?: boolean;
}

// ── Local / Builder types ──────────────────────────────────────────────────────
export type FormStatus = "aktif" | "nonaktif";

export type BuilderQuestionType =
  | "short"
  | "paragraph"
  /**
   * Isian angka bebas — beda dari "linear_scale" yang nilainya terbatas pada
   * rentang tombol. Punya penjagaan tipe, pemisah ribuan yang dibersihkan
   * otomatis, dan batas kewajaran yang bisa disetel per pertanyaan.
   */
  | "number"
  | "multiple_choice"
  | "checkbox"
  | "dropdown"
  /**
   * Isian yang pilihannya diambil dari tabel referensi (prodi, provinsi,
   * kab/kota), bukan diketik pembuat borang. Berbeda dari "dropdown" yang
   * opsinya ditulis satu per satu — daftar 528 kab/kota tidak masuk akal
   * ditulis manual, apalagi diulang tiap kuesioner baru.
   */
  | "lookup"
  | "file_upload"
  | "linear_scale"
  | "rating"
  | "multiple_choice_grid"
  | "checkbox_grid"
  | "date"
  | "time";

export type QuestionLogicType = "always" | "in_array";

export interface QuestionLogic {
  type: QuestionLogicType;
  dependsOn: string;
  values: string[];
}

export interface FormResponseMock {
  respondent: string;
  submittedAt: string;
  answers: Record<string, string | number | string[]>;
}

export interface BuilderQuestion {
  id: string;
  type: BuilderQuestionType;
  question: string;
  /** Kalimat penjelas di bawah pertanyaan. */
  description?: string;
  /** Petunjuk pengisian — teks kecil di bawah kotak isian. */
  hint?: string;
  /** Aturan format isian tambahan; menyalakan validasi di kedua sisi. */
  format?: "email" | "phone" | "url" | "currency";
  /**
   * Batas kewajaran isian angka — PERINGATAN, bukan penolakan.
   *
   * Dipakai menangkap salah ketik nol (pendapatan 500 juta sebulan, masa
   * tunggu 600 bulan) tanpa menghalangi alumni yang nilainya memang di luar
   * kebiasaan. Kosong berarti tidak ada peringatan.
   */
  warnMin?: number;
  warnMax?: number;
  /** Pemisah bertajuk yang dirender tepat sebelum pertanyaan ini. */
  dividerLabel?: string;
  /**
   * Metadata semantik untuk ETL: `competency` + `dimension` pada pertanyaan
   * kompetensi, `method` pada pertanyaan metode pembelajaran. Tidak tampil di
   * layar mana pun, tapi IndikatorEvaluasiDimService memakainya untuk memberi
   * nama indikator di dashboard. Dibawa apa adanya supaya salinan-dari-template
   * tidak kehilangan sambungannya ke analitik.
   */
  analyticsMeta?: Record<string, string>;
  /**
   * Keterangan per opsi, berkunci kode opsi. Belum bisa disunting di borang
   * penyunting; dibawa apa adanya supaya salinan-dari-template tidak
   * membuangnya (lihat option_hints pada f5c).
   */
  optionHints?: Record<string, string>;
  options: string[];
  gridRows?: string[];
  gridColumns?: string[];
  required: boolean;
  allowOther?: boolean;
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: string[];
  logic: QuestionLogic;
  /** Tabel referensi sumber pilihan — hanya untuk type "lookup". */
  lookup?: "program" | "province" | "city";
  /** Kolom yang disimpan sebagai jawaban: id (wilayah) atau code (prodi). */
  lookupValue?: "id" | "code";
  /** Kode pertanyaan induk yang menyaring pilihan (kab/kota ikut provinsi). */
  dependsOn?: string;
  // Group metadata for grouped boolean questions (preserved from template)
  group_code?: string;
  group_label?: string;
  group_title?: string;
  // Original individual question codes for grouped booleans (used to expand on save)
  _individual_codes?: string[];
  /**
   * Sidecar metadata per opsi, sejajar indeks dengan `options`.
   *
   * `options` hanya menyimpan label karena dipakai di banyak tempat sebagai
   * daftar teks (pemicu logika bersyarat mencocokkan label, grid, pratinjau).
   * Kode opsi dan status tersembunyi menumpang di sini, dan WAJIB dijaga
   * panjangnya sama dengan `options` di setiap mutasi — lihat
   * `mutateOptions()` di FormBuilderPage. Kalau tidak sinkron, kode opsi
   * bergeser dan jawaban lama menunjuk ke opsi yang salah.
   */
  _original_options?: Array<{ label: string; code: string; is_hidden?: boolean }>;
}

/**
 * Label opsi yang boleh dilihat alumni — opsi ber-`is_hidden` dibuang.
 *
 * Dipakai pratinjau, yang memuat borang lewat endpoint admin
 * (`GET /questionnaires/{id}`). Endpoint itu sengaja mengirim opsi
 * tersembunyi supaya tim tracer bisa menyalakannya lagi, jadi pratinjau
 * harus menyaring sendiri kalau mau jujur menggambarkan tampilan alumni.
 * Borang alumni yang sebenarnya tidak memerlukan ini: penyaringnya sudah
 * di QuestionnaireFetchService.
 */
export const visibleOptions = (question: BuilderQuestion): string[] =>
  question.options.filter(
    (_, index) => !question._original_options?.[index]?.is_hidden,
  );

export const isOptionQuestionType = (type: BuilderQuestionType) =>
  type === "multiple_choice" || type === "checkbox" || type === "dropdown";

export const isGridQuestionType = (type: BuilderQuestionType) =>
  type === "multiple_choice_grid" || type === "checkbox_grid";

export interface BuilderSection {
  id: string;
  title: string;
  description?: string;
  questions: BuilderQuestion[];
}

export interface FormListItem {
  id: string;
  title: string;
  description?: string;
  status: FormStatus;
  target: string[];
  targetProdi: string[];
  respondents: string[];
  sections: BuilderSection[];
  responses: FormResponseMock[];
}

export const FORM_STORAGE_KEY = "tracer_form_management_data";

export const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createDefaultQuestion = (
  type: BuilderQuestionType = "short",
): BuilderQuestion => ({
  id: createId("q"),
  type,
  question: "",
  description: "",
  options: isOptionQuestionType(type) ? ["Opsi 1"] : [],
  gridRows: isGridQuestionType(type) ? ["Baris 1", "Baris 2"] : [],
  gridColumns: isGridQuestionType(type) ? ["Kolom 1", "Kolom 2"] : [],
  required: true,
  allowOther: false,
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: ["", "", "", "", ""],
  logic: {
    type: "always",
    dependsOn: "",
    values: [],
  },
});

/**
 * Merge grouped boolean questions into a single checkbox for the builder.
 */
const mergeGroupedForBuilder = (questions: BuilderQuestion[]): BuilderQuestion[] => {
  const grouped: Record<string, BuilderQuestion[]> = {};
  const result: BuilderQuestion[] = [];
  const seenGroups = new Set<string>();
  // Map individual code → { groupCode, optionLabel }
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
        logic: { type: "always" as QuestionLogicType, dependsOn: "", values: [] },
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
        // e.g. dependsOn "f415" → dependsOn "q16_cara_cari_kerja", values → ["Lainnya"]
        return { ...q, logic: { ...q.logic, dependsOn: ref.groupCode, values: [ref.label] } };
      }
    }
    return q;
  });
};

/**
 * Convert a backend questionnaire (GET /api/questionnaires/:id) to a FormListItem
 * so the FormBuilder can edit seeded/backend questionnaires.
 */
/** Kunci metadata semantik yang dibawa apa adanya lintas salinan. */
export const ANALYTICS_META_KEYS = ["competency", "dimension", "method"] as const;

export const pickAnalyticsMeta = (metadata: unknown): Record<string, string> | undefined => {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const picked: Record<string, string> = {};
  for (const key of ANALYTICS_META_KEYS) {
    if (typeof meta[key] === "string" && meta[key]) picked[key] = meta[key] as string;
  }

  return Object.keys(picked).length > 0 ? picked : undefined;
};

export function backendToFormListItem(bq: BackendQuestionnaire): FormListItem {
  const VALID_BUILDER_TYPES = new Set([
    "short", "paragraph", "number", "multiple_choice", "checkbox", "dropdown",
    // "lookup" WAJIB ada di sini: tanpa itu isian referensi jatuh ke cabang
    // pemetaan tipe basis data, tidak ketemu, lalu menjadi kotak teks biasa.
    "lookup",
    "file_upload", "linear_scale", "rating", "multiple_choice_grid",
    "checkbox_grid", "date", "time",
  ]);
  const mapType = (t: string, metadata?: Record<string, unknown>): BuilderQuestionType => {
    // If already a valid builder type, pass through
    if (VALID_BUILDER_TYPES.has(t)) {
      // Kecuali "number" yang membawa metadata skala — di basis data kedua
      // bentuk itu bertipe sama, pembedanya hanya scale_min/scale_max.
      if (t === "number" && (metadata?.scale_min != null || metadata?.scaleMin != null)) {
        return "linear_scale";
      }
      return t as BuilderQuestionType;
    }
    // Otherwise map from DB type
    const dbMap: Record<string, BuilderQuestionType> = {
      short_text: "short",
      long_text: "paragraph",
      single_choice: "multiple_choice",
      // Pertanyaan angka BERSKALA sudah dikirim server sebagai "linear_scale"
      // (lihat mapQuestionTypeToFrontend), jadi yang sampai ke sini dengan
      // tipe mentah "number" adalah isian angka bebas.
      number: "number",
      boolean: "multiple_choice",
      file: "file_upload",
    };
    return dbMap[t] ?? "short";
  };

  // Build lookup: question_code → { option_code → option_label }
  // Dipakai untuk translate show_if values (option_code) ke label yang dipakai builder.
  const optionLabelMap: Record<string, Record<string, string>> = {};
  for (const sec of bq.sections ?? []) {
    for (const q of sec.questions ?? []) {
      const code = q.code || String(q.id);
      if (q.options && q.options.length > 0) {
        const map: Record<string, string> = {};
        for (const o of q.options) {
          map[String(o.code ?? o.value ?? o.id)] = o.label;
        }
        optionLabelMap[code] = map;
      }
    }
  }

  const sections: BuilderSection[] = (bq.sections ?? []).map((sec) => {
    const mapped = (sec.questions ?? []).map((q): BuilderQuestion => ({
      id: q.code || String(q.id),
      type: mapType(q.type, (q as any).metadata),
      question: q.question_text || q.question || "",
      // Medan bantu pengisian. Server mengirimkannya di dua tempat: medan
      // datar hasil mapQuestionFull() dan metadata mentah. Dibaca dari
      // keduanya supaya kuesioner lama yang hanya punya metadata tetap
      // terbuka dengan petunjuknya utuh.
      description: q.description ?? (q as any).metadata?.description ?? undefined,
      hint: (q as any).hint ?? (q as any).metadata?.hint ?? undefined,
      format: (q as any).format ?? (q as any).metadata?.format ?? undefined,
      dividerLabel: (q as any).divider_label ?? (q as any).metadata?.divider_label ?? undefined,
      optionHints: (q as any).metadata?.option_hints ?? undefined,
      analyticsMeta: pickAnalyticsMeta((q as any).metadata),
      // Isian referensi bertingkat: kab/kota menempel pada provinsi. Tanpa
      // medan ini daftar kab/kota tidak pernah terbuka di pratinjau, dan
      // menyimpan kuesioner akan membuang tautannya sehingga formulir alumni
      // ikut terkunci.
      lookup: (q as any).lookup ?? (q as any).metadata?.lookup ?? undefined,
      lookupValue: (q as any).lookupValue ?? (q as any).metadata?.lookup_value ?? undefined,
      dependsOn: (q as any).dependsOn ?? (q as any).metadata?.depends_on ?? undefined,
      warnMin: (q as any).warn_min ?? (q as any).metadata?.warn_min ?? undefined,
      warnMax: (q as any).warn_max ?? (q as any).metadata?.warn_max ?? undefined,
      options: (q.options ?? []).map((o) => o.label),
      required: !!q.required,
      allowOther: !!q.allowOther,
      scaleMin: q.scaleMin ?? 1,
      scaleMax: q.scaleMax ?? 5,
      gridRows: q.gridRows ?? [],
      gridColumns: q.gridColumns ?? [],
      group_code: (q as any).metadata?.group_code ?? undefined,
      group_label: (q as any).metadata?.group_label ?? undefined,
      group_title: (q as any).metadata?.group_title ?? undefined,
      _original_options: (q.options ?? []).map((o) => ({
        label: o.label,
        code: o.code ?? o.value ?? "",
        is_hidden: !!(o as { is_hidden?: boolean }).is_hidden,
      })),
      logic: (() => {
        const showIf = (q as any).metadata?.show_if ?? (q as any).show_if;
        if (showIf && typeof showIf === "object") {
          const entries = Object.entries(showIf);
          if (entries.length > 0) {
            const [depCode, vals] = entries[0];
            if (depCode && Array.isArray(vals)) {
              const triggerOptions = optionLabelMap[depCode] ?? {};
              const allLabels = Object.values(triggerOptions);
              const resolvedValues = vals.map((v) => {
                const strVal = String(v);
                if (allLabels.includes(strVal)) return strVal;
                const label = triggerOptions[strVal];
                return label ?? strVal;
              });
              return { type: "in_array" as QuestionLogicType, dependsOn: depCode, values: resolvedValues };
            }
          }
        }
        return { type: "always" as QuestionLogicType, dependsOn: "", values: [] };
      })(),
    }));
    return {
      id: String(sec.id),
      title: sec.title ?? "Bagian",
      description: sec.description ?? undefined,
      questions: mergeGroupedForBuilder(mapped),
    };
  });

  // If no sections returned, create a default empty one
  if (sections.length === 0) {
    sections.push({
      id: createId("section"),
      title: "Bagian 1",
      questions: [createDefaultQuestion()],
    });
  }

  return {
    id: String(bq.id),
    title: bq.title ?? "Untitled Form",
    description: bq.description ?? undefined,
    status: bq.status === "published" ? "aktif" : "nonaktif",
    target: bq.target
      ? bq.target.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    targetProdi: (bq as any).target_prodi ?? [],
    respondents: bq.respondents ?? [],
    sections,
    responses: [],
  };
}

const initialForms: FormListItem[] = [
  {
    id: "form-survey-kepuasan",
    title: "Survey Kepuasan",
    description: "Isi dengan jujur",
    status: "aktif",
    target: ["Semua Alumni"],
    targetProdi: ["Teknik Informatika"],
    respondents: ["Ayu", "Budi", "Citra"],
    sections: [
      {
        id: "section-kepuasan-1",
        title: "Bagian 1",
        description: "Penilaian umum responden.",
        questions: [
          {
            id: "q-kepuasan-1",
            type: "multiple_choice",
            question: "Seberapa puas Anda?",
            options: ["Sangat puas", "Puas", "Tidak puas"],
            required: true,
            allowOther: false,
            logic: {
              type: "always",
              dependsOn: "",
              values: [],
            },
          },
        ],
      },
    ],
    responses: [
      {
        respondent: "Ayu",
        submittedAt: "2026-04-12",
        answers: {
          "q-kepuasan-1": "Puas",
        },
      },
    ],
  },
  {
    id: "form-2026-it",
    title: "Tracer Study Lulusan Teknik Informatika 2026",
    description: "Isi dengan jujur dan lengkap.",
    status: "aktif",
    target: ["Lulusan Angkatan 2026"],
    targetProdi: ["Teknik Informatika", "Teknik Komputer"],
    respondents: ["Ayu Pratama", "Dimas Saputra", "Nabila Rahma", "Rizky Hidayat"],
    sections: [
      {
        id: "section-1",
        title: "Identitas Responden",
        description: "Data dasar lulusan untuk kebutuhan pemetaan tracer study.",
        questions: [
          {
            id: "q-1",
            type: "short",
            question: "Nama lengkap",
            options: [],
            required: true,
            logic: {
              type: "always",
              dependsOn: "",
              values: [],
            },
          },
          {
            id: "q-2",
            type: "dropdown",
            question: "Status pekerjaan saat ini",
            options: ["Bekerja", "Wiraswasta", "Studi lanjut", "Mencari kerja"],
            required: true,
            logic: {
              type: "always",
              dependsOn: "",
              values: [],
            },
          },
        ],
      },
      {
        id: "section-2",
        title: "Kesesuaian Pendidikan",
        description: "Masukan untuk evaluasi kurikulum dan kompetensi lulusan.",
        questions: [
          {
            id: "q-3",
            type: "linear_scale",
            question: "Seberapa relevan pendidikan Anda dengan pekerjaan saat ini?",
            options: [],
            required: true,
            scaleMin: 1,
            scaleMax: 5,
            logic: {
              type: "always",
              dependsOn: "",
              values: [],
            },
          },
          {
            id: "q-4",
            type: "paragraph",
            question: "Ceritakan masukan Anda untuk program studi",
            options: [],
            required: false,
            logic: {
              type: "always",
              dependsOn: "",
              values: [],
            },
          },
        ],
      },
    ],
    responses: [
      {
        respondent: "Ayu Pratama",
        submittedAt: "2026-03-18",
        answers: {
          "q-1": "Ayu Pratama",
          "q-2": "Bekerja",
          "q-3": 4,
          "q-4": "Lebih banyak praktik industri akan sangat membantu.",
        },
      },
      {
        respondent: "Dimas Saputra",
        submittedAt: "2026-03-19",
        answers: {
          "q-1": "Dimas Saputra",
          "q-2": "Studi lanjut",
          "q-3": 5,
          "q-4": "Materi pemrograman sudah sangat relevan.",
        },
      },
    ],
  },
  {
    id: "form-2025-satisfaction",
    title: "Survei Kepuasan Alumni 2025",
    description: "Masukan alumni terhadap proses pendidikan.",
    status: "nonaktif",
    target: ["Lulusan Angkatan 2025"],
    targetProdi: [],
    respondents: ["Nabila Rahma", "Fahri Maulana"],
    sections: [
      {
        id: "section-3",
        title: "Evaluasi Pengalaman Kuliah",
        questions: [
          {
            id: "q-5",
            type: "multiple_choice",
            question: "Bagaimana Anda menilai layanan akademik?",
            options: ["Sangat baik", "Baik", "Cukup", "Perlu perbaikan"],
            required: true,
            logic: {
              type: "always",
              dependsOn: "",
              values: [],
            },
          },
        ],
      },
    ],
    responses: [
      {
        respondent: "Nabila Rahma",
        submittedAt: "2025-11-02",
        answers: {
          "q-5": "Baik",
        },
      },
    ],
  },
];

/**
 * Versi bentuk salinan kuesioner di localStorage.
 *
 * Salinan ini berumur panjang dan ikut menyemai borang penyunting maupun
 * pratinjau, sehingga bentuk lama di dalamnya bisa terus muncul lama setelah
 * kodenya diperbaiki — pertanyaan angka yang tampil sebagai skala 1-5 datang
 * dari sini. NAIKKAN setiap kali bentuk BuilderQuestion berubah.
 */
export const FORM_CACHE_VERSION = 2;
const FORM_CACHE_VERSION_KEY = `${FORM_STORAGE_KEY}:version`;

export const getInitialForms = (): FormListItem[] => {
  if (typeof window === "undefined") return initialForms;

  try {
    // Salinan dari versi lain dibuang, bukan dipakai. Ia hanya cadangan bagi
    // data server, jadi membuangnya tidak menghilangkan apa pun yang tidak
    // bisa diambil ulang.
    if (localStorage.getItem(FORM_CACHE_VERSION_KEY) !== String(FORM_CACHE_VERSION)) {
      localStorage.removeItem(FORM_STORAGE_KEY);
      localStorage.setItem(FORM_CACHE_VERSION_KEY, String(FORM_CACHE_VERSION));
      return initialForms;
    }

    const saved = localStorage.getItem(FORM_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Array<FormListItem & { target?: string | string[] }>;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          ...item,
          target: Array.isArray(item.target)
            ? item.target
            : item.target
              ? [item.target]
              : [],
          targetProdi: Array.isArray(item.targetProdi) ? item.targetProdi : [],
        }));
      }
    }
  } catch {
    // Ignore malformed localStorage and fall back to seed data.
  }

  return initialForms;
};

export const saveForms = (forms: FormListItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(forms));
  localStorage.setItem(FORM_CACHE_VERSION_KEY, String(FORM_CACHE_VERSION));
};




/** Convert FormListItem → backend API payload for POST/PUT /api/questionnaires */
export const formListItemToApiPayload = (form: FormListItem & { targetGraduationYears?: number[] }, prodiNameToId?: Record<string, number>) => ({
  title: form.title,
  description: form.description ?? null,
  target: Array.isArray(form.target) ? form.target.join(", ") : (form.target ?? null),
  program_id: form.targetProdi.length > 0 && prodiNameToId
    ? prodiNameToId[form.targetProdi[0]] ?? null
    : null,
  target_prodi: form.targetProdi ?? [],
  target_graduation_years: form.targetGraduationYears ?? null,
  respondents: form.respondents ?? [],
  status: form.status === "aktif" ? "published" : "draft",
  sections: form.sections.map((s, si) => ({
    title: s.title,
    description: s.description ?? null,
    order_no: si + 1,
    questions: s.questions.flatMap((q, qi) => {
      // Expand merged grouped checkbox back to individual boolean questions
      if (q.group_code && q._individual_codes && q._individual_codes.length > 1) {
        return q._individual_codes.map((code, i) => ({
          code,
          question: `${q.question} — ${q.options[i] ?? ""}`,
          type: "multiple_choice",
          required: false,
          order_no: qi + i + 1,
          allowOther: false,
          scaleMin: undefined,
          scaleMax: undefined,
          gridRows: [],
          gridColumns: [],
          group_code: q.group_code,
          group_label: q.options[i] ?? "",
          group_title: q.group_title ?? q.question,
          logic: null,
          options: [],
        }));
      }
      return [{
        code: q.id,
        question: q.question,
        type: q.type,
        required: q.required,
        // Medan bantu pengisian ikut dikirim supaya suntingan Tim Tracer
        // tersimpan, dan supaya salinan-dari-template membawanya serta —
        // pada kuesioner baru belum ada baris lama di server yang bisa
        // dijadikan sumber pelestarian.
        description: q.description || undefined,
        hint: q.hint || undefined,
        format: q.format || undefined,
        divider_label: q.dividerLabel || undefined,
        option_hints: q.optionHints && Object.keys(q.optionHints).length > 0 ? q.optionHints : undefined,
        ...(q.analyticsMeta ?? {}),
        warn_min: Number.isFinite(q.warnMin) ? q.warnMin : undefined,
        warn_max: Number.isFinite(q.warnMax) ? q.warnMax : undefined,
        order_no: qi + 1,
        allowOther: q.allowOther ?? false,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        scaleLabels: q.scaleLabels ?? undefined,
        gridRows: q.gridRows ?? [],
        gridColumns: q.gridColumns ?? [],
        group_code: q.group_code ?? undefined,
        group_label: q.group_label ?? undefined,
        group_title: q.group_title ?? undefined,
        lookup: q.type === "lookup" ? q.lookup : undefined,
        lookupValue: q.type === "lookup" ? q.lookupValue : undefined,
        dependsOn: q.type === "lookup" ? q.dependsOn : undefined,
        logic: q.logic && q.logic.type === "in_array" && q.logic.dependsOn
          ? { type: "in_array", dependsOn: q.logic.dependsOn, values: q.logic.values }
          : null,
        // Label selalu diambil dari `options` (itu yang disunting pengguna);
        // kode dan flag tersembunyi menumpang dari sidecar per indeks.
        //
        // Dulu di sini ada syarat panjang harus sama persis, jatuh ke
        // pembuatan ulang `opt_1..n` kalau tidak. Akibatnya menghapus SATU
        // opsi menyetel ulang kode SEMUA opsi, dan jawaban lama jadi
        // menunjuk ke opsi yang salah. Sekarang sidecar dijaga sinkron di
        // titik mutasi, dan dibuang di gerbang muat kalau terlanjur miring
        // (lihat normalizeOptionMeta di questionnaireDrafts.ts), jadi
        // penggabungan per indeks aman.
        options: q.options.map((opt, oi) => {
          const label = typeof opt === "string" ? opt : String(opt ?? "");
          const meta = q._original_options?.[oi];
          return {
            label,
            code: meta?.code || `opt_${oi + 1}`,
            is_hidden: !!meta?.is_hidden,
          };
        }),
      }];
    }),
  })),
});
