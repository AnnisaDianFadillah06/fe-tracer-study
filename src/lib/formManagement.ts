export type FormStatus = "aktif" | "nonaktif";

export type BuilderQuestionType =
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

export interface FormResponseMock {
  respondent: string;
  submittedAt: string;
  answers: Record<string, string | number | string[]>;
}

export interface BuilderQuestion {
  id: string;
  type: BuilderQuestionType;
  question: string;
  description?: string;
  options: string[];
  gridRows?: string[];
  gridColumns?: string[];
  required: boolean;
  allowOther?: boolean;
  scaleMin?: number;
  scaleMax?: number;
}

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
  target: string;
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
  required: false,
  allowOther: false,
  scaleMin: 1,
  scaleMax: 5,
});

const initialForms: FormListItem[] = [
  {
    id: "form-survey-kepuasan",
    title: "Survey Kepuasan",
    description: "Isi dengan jujur",
    status: "aktif",
    target: "Alumni",
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
    target: "Lulusan Angkatan 2026",
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
          },
          {
            id: "q-2",
            type: "dropdown",
            question: "Status pekerjaan saat ini",
            options: ["Bekerja", "Wiraswasta", "Studi lanjut", "Mencari kerja"],
            required: true,
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
          },
          {
            id: "q-4",
            type: "paragraph",
            question: "Ceritakan masukan Anda untuk program studi",
            options: [],
            required: false,
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
    target: "Lulusan Angkatan 2025",
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

export const getInitialForms = (): FormListItem[] => {
  if (typeof window === "undefined") return initialForms;

  try {
    const saved = localStorage.getItem(FORM_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as FormListItem[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore malformed localStorage and fall back to seed data.
  }

  return initialForms;
};

export const saveForms = (forms: FormListItem[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(forms));
};
