import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import type { FormSection, Question, Option } from "@/hooks/form/useQuestionManagement";
import { validateAnswer, validateCrossField } from "@/lib/formValidation";
import {
  saveDraft, readDraft, clearDraft, questionnaireFingerprint, countAnswered, relativeTime,
} from "@/lib/formDraft";
import { getStudentToken } from "@/hooks/auth/useStudentAuth";

/** Satu masalah pengisian, dipakai untuk isi toast dan penggulir otomatis. */
export interface FormIssue {
  /** id pertanyaan (berawalan id kuesioner) — dipakai untuk scroll & fokus. */
  id: string;
  question: string;
  message: string;
}

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
/** Map a single backend question object to the frontend Question shape. */
function mapSingleQuestion(q: any): Question {
  // Defensive: metadata bisa object, string JSON, atau null
  let meta: Record<string, any> = {};
  if (q.metadata && typeof q.metadata === "object") {
    meta = q.metadata;
  } else if (typeof q.metadata === "string") {
    try { meta = JSON.parse(q.metadata); } catch { meta = {}; }
  }

  // Smart type detection: 'number' with scale metadata → linear_scale
  let feType = mapQuestionType(q.question_type);
  if (q.question_type === "number" && (meta.scale_min != null || meta.scale_max != null)) {
    feType = "linear_scale";
  }

  // Boolean questions without group → multiple_choice with Ya/Tidak
  let options: Option[] = (q.options ?? []).map((o: any) => ({
    id: o.value ?? o.code ?? String(o.id),
    label: o.label ?? "",
  }));

  if (q.question_type === "boolean" && !meta.group_code) {
    feType = "multiple_choice";
    options = [
      { id: "1", label: "Ya" },
      { id: "0", label: "Tidak" },
    ];
  }

  return {
    id: q.question_code ?? q.code ?? String(q.id),
    type: feType,
    question: q.question_text ?? "",
    description: meta.description ?? undefined,
    options,
    required: !!q.is_required,
    scaleMin: meta.scale_min ?? meta.scaleMin ?? 1,
    scaleMax: meta.scale_max ?? meta.scaleMax ?? 5,
    scaleMinLabel: meta.scale_labels?.[0] ?? meta.scaleLabels?.[0] ?? meta.scale_min_label ?? meta.scaleMinLabel ?? "",
    scaleMaxLabel: (() => { const labels = meta.scale_labels ?? meta.scaleLabels; return labels?.length ? labels[labels.length - 1] : (meta.scale_max_label ?? meta.scaleMaxLabel ?? ""); })(),
    showIf: meta.show_if ?? meta.showIf ?? undefined,
    groupCode: meta.group_code ?? meta.groupCode ?? undefined,
    groupTitle: meta.group_title ?? meta.groupTitle ?? undefined,
    groupLabel: meta.group_label ?? meta.groupLabel ?? undefined,

    // Tipe asli backend dipertahankan. `type` di atas hanya menentukan widget
    // — number dan short_text sama-sama jadi "short", sehingga tanpa ini
    // informasi bahwa sebuah isian harus angka hilang di komponen.
    backendType: q.question_type ?? undefined,
    code: q.question_code ?? q.code ?? undefined,
    metadata: meta,
    optionHints: meta.option_hints ?? meta.optionHints ?? undefined,

    // Isian referensi (Kode Prodi, Provinsi, Kab/Kota). Tipe backend-nya tetap
    // short_text, jadi penanda inilah satu-satunya cara perender tahu harus
    // menampilkan daftar referensi.
    lookup: meta.lookup ?? undefined,
    lookupValue: meta.lookup_value ?? meta.lookupValue ?? undefined,
    dependsOn: meta.depends_on ?? meta.dependsOn ?? undefined,
  };
}

/** Separator used to namespace question IDs per questionnaire. */
const QID_SEP = "___";

/** Data alumni yang sudah diketahui sistem, dipakai mengisi bagian identitas. */
export interface IdentityPrefill {
  nim?: string;
  name?: string;
  email?: string;
  phone?: string;
  kodeProdi?: string;
  graduationYear?: number | null;
}

/**
 * Kode pertanyaan identitas => medan sesi yang mengisinya.
 *
 * Kode PT sengaja TIDAK ikut: kolom kode_pt tidak pernah diisi impor alumni,
 * jadi mengisinya dari sesi hanya akan menaruh nilai kosong. NIK dan NPWP juga
 * tidak ada di basis data sama sekali — keduanya memang harus diketik alumni.
 */
const IDENTITY_MAP: Record<string, keyof IdentityPrefill> = {
  nimhsmsmh:    "nim",
  nmmhsmsmh:    "name",
  emailmsmh:    "email",
  telpomsmh:    "phone",
  kdpstmsmh:    "kodeProdi",
  tahun_lulus:  "graduationYear",
};

/**
 * Isi otomatis bagian identitas dari data alumni yang sudah ada.
 *
 * Isian yang sudah terjawab — dari draf yang dipulihkan — TIDAK ditimpa;
 * suntingan alumni selalu lebih baru daripada data impor. Pengecualiannya NIM:
 * server menolak submit bila NIM tidak sama persis dengan pemegang token, jadi
 * nilainya selalu diseragamkan dengan sesi dan isiannya dikunci di antarmuka.
 */
function applyIdentityPrefill(
  sections: FormSection[],
  answers: Record<string, unknown>,
  identity?: IdentityPrefill,
): Record<string, unknown> {
  if (!identity) return answers;

  const filled = { ...answers };

  for (const section of sections) {
    for (const q of section.questions) {
      const field = q.code ? IDENTITY_MAP[q.code] : undefined;
      if (!field) continue;

      const raw = identity[field];
      if (raw === undefined || raw === null || raw === "") continue;

      const existing = filled[q.id];
      const isEmpty = existing === undefined || existing === null || existing === "";
      if (!isEmpty && q.code !== "nimhsmsmh") continue;

      filled[q.id] = String(raw);
    }
  }

  return filled;
}

/** Pangkas teks panjang agar isi toast tetap terbaca. */
function truncate(text: string, max: number): string {
  const trimmed = (text ?? "").trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function mapBackendToSections(backendData: any[]): FormSection[] {
  const allSections: FormSection[] = [];

  for (const qnr of backendData) {
    const prefix = String(qnr.id) + QID_SEP;
    // 1 questionnaire = 1 page. Prefix question IDs to avoid collision
    // when multiple questionnaires share the same question_code.
    const rawQuestions = (qnr.questions ?? []).map((q: any) => {
      const mapped = mapSingleQuestion(q);
      // Prefix the question id
      mapped.id = prefix + mapped.id;
      // Prefix showIf dependency keys
      if (mapped.showIf) {
        const prefixed: Record<string, (string | number)[]> = {};
        for (const [depCode, vals] of Object.entries(mapped.showIf)) {
          prefixed[prefix + depCode] = vals;
        }
        mapped.showIf = prefixed;
      }
      // Prefix groupCode so merging stays within same questionnaire
      if (mapped.groupCode) {
        mapped.groupCode = prefix + mapped.groupCode;
      }
      // Sama untuk induk isian referensi: kab/kota harus membaca jawaban
      // provinsi dari kuesioner yang SAMA, bukan dari kuesioner lain yang
      // kebetulan memakai kode pertanyaan serupa.
      if (mapped.dependsOn) {
        mapped.dependsOn = prefix + mapped.dependsOn;
      }
      return mapped;
    });
    allSections.push({
      id: String(qnr.id),
      title: qnr.title ?? "Kuesioner",
      description: qnr.description ?? undefined,
      questions: mergeGroupedQuestions(rawQuestions),
    });
  }

  return allSections;
}

/**
 * Merge questions with the same group_code into a single checkbox question.
 * e.g. f401-f415 (15 separate booleans) → 1 checkbox card with 15 options.
 */
function mergeGroupedQuestions(questions: Question[]): Question[] {
  const grouped: Record<string, Question[]> = {};
  const result: Question[] = [];
  const seenGroups = new Set<string>();

  // Track which individual question code was merged into which group code
  const mergedCodeToGroup: Record<string, string> = {};

  for (const q of questions) {
    if (q.groupCode) {
      if (!grouped[q.groupCode]) grouped[q.groupCode] = [];
      grouped[q.groupCode].push(q);

      // Track: individual code → group code (e.g. f415 → q16_cara_cari_kerja)
      mergedCodeToGroup[q.id] = q.groupCode;

      if (!seenGroups.has(q.groupCode)) {
        seenGroups.add(q.groupCode);
        // Insert a placeholder at this position
        result.push(q);
      }
    } else {
      result.push(q);
    }
  }

  // Replace placeholders with merged checkbox questions, and fix show_if references
  return result.map((q) => {
    // If this is a grouped question placeholder, merge it
    if (q.groupCode && grouped[q.groupCode]) {
      const items = grouped[q.groupCode];
      if (items.length <= 1) return q; // Don't merge single items

      // Find group_title from first item that has it
      const titleItem = items.find((i) => i.groupTitle);

      return {
        id: q.groupCode,
        type: "checkbox" as Question["type"],
        question: titleItem?.groupTitle ?? q.question,
        description: q.description,
        options: items.map((item) => ({
          id: item.id,
          label: item.groupLabel ?? item.question,
        })),
        required: false,
        showIf: q.showIf,
      };
    }

    // For non-grouped questions: rewrite show_if that references a merged code
    if (q.showIf) {
      let rewritten = false;
      const newShowIf: Record<string, (string | number)[]> = {};
      for (const [depCode, values] of Object.entries(q.showIf)) {
        const groupCode = mergedCodeToGroup[depCode];
        if (groupCode) {
          // Rewrite: show when the grouped checkbox answer includes this individual code
          newShowIf[groupCode] = [depCode];
          rewritten = true;
        } else {
          newShowIf[depCode] = values;
        }
      }
      if (rewritten) {
        return { ...q, showIf: newShowIf };
      }
    }

    return q;
  });
}

/**
 * Check if a question should be visible based on current answers.
 * Exported for use in FormPage.tsx.
 */
export function isQuestionVisible(
  q: Question,
  answers: Record<string, unknown>,
  allQuestions?: Question[],
): boolean {
  if (!q.showIf) return true;

  return Object.entries(q.showIf).every(([depCode, allowedValues]) => {
    const currentAnswer = answers[depCode];
    if (currentAnswer === undefined || currentAnswer === null || currentAnswer === "") return false;

    // Build lookup: option code → label (untuk match show_if yang simpan label)
    let optionCodeToLabel: Record<string, string> = {};
    if (allQuestions) {
      const trigger = allQuestions.find((tq) => tq.id === depCode);
      if (trigger?.options) {
        for (const opt of trigger.options) {
          optionCodeToLabel[opt.id] = opt.label;
        }
      }
    }

    // For grouped checkbox answers (arrays), check if ANY selected value matches
    if (Array.isArray(currentAnswer)) {
      return allowedValues.some((v) => {
        const strV = String(v);
        return currentAnswer.some((ans) => {
          const strAns = String(ans);
          // Match by: direct equality, or answer's label matches value
          return strAns === strV || optionCodeToLabel[strAns] === strV;
        });
      });
    }

    const strAnswer = String(currentAnswer);
    return allowedValues.some((v) => {
      const strV = String(v);
      // Match by: direct equality (code===code), or answer's label matches value
      return strV === strAnswer || optionCodeToLabel[strAnswer] === strV;
    });
  });
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
    number: "short",
    long_text: "paragraph",
    paragraph: "paragraph",
    textarea: "paragraph",
    multiple_choice: "multiple_choice",
    radio: "multiple_choice",
    single_choice: "multiple_choice",
    boolean: "multiple_choice",
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
export const useTracerForm = (
  kodeProdi?: string,
  graduationYear?: number,
  nim?: string,
  identity?: IdentityPrefill,
) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Peringatan lunak — nilainya sah, tapi patut dikonfirmasi ulang. */
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  /** Ringkasan masalah untuk toast + penanda field mana yang harus digulir. */
  const [issues, setIssues] = useState<FormIssue[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);

  /** Info draf yang dipulihkan, untuk diberitahukan ke pengguna sekali saja. */
  const [restoredDraft, setRestoredDraft] = useState<{
    count: number; time: string;
  } | null>(null);
  /**
   * Penanda bahwa pemulihan draf sudah dicoba. Penyimpanan otomatis baru
   * boleh berjalan setelah ini, supaya state awal yang masih kosong tidak
   * keburu menimpa draf yang tersimpan.
   */
  const draftSaveReady = useRef(false);
  /**
   * Ada perubahan yang belum dikirim ke server.
   *
   * Draf disimpan ke DUA tempat dengan irama berbeda: localStorage tiap 800 ms
   * (murah, tanpa jaringan) dan server tiap 15 detik atau saat pindah bagian
   * (mahal, jadi jangan seirama ketikan). Penanda ini yang menahan pengiriman
   * berkala kalau tidak ada yang berubah.
   */
  const serverDraftDirty = useRef(false);

  /**
   * Identitas dibaca lewat ref, bukan dependensi effect: pemanggil menyusun
   * objeknya inline sehingga acuannya berganti tiap render, dan menjadikannya
   * dependensi akan memicu pengambilan ulang kuesioner tanpa henti.
   */
  const identityRef = useRef(identity);
  identityRef.current = identity;

  // ── Fetch forms dari backend ──────────────────────────────────────────────
  useEffect(() => {
    const fetchForms = async () => {
      // Jika tidak ada kodeProdi, tidak bisa fetch — tampilkan empty
      if (!kodeProdi) {
        setSections([]);
        setIsLoadingForms(false);
        toast({ title: "Info", description: "Kode prodi tidak tersedia. Silakan login ulang." });
        return;
      }

      try {
        const { data } = await api.get("/tracer-study/forms", {
          params: { kode_prodi: kodeProdi, ...(graduationYear ? { graduation_year: graduationYear } : {}), ...(nim ? { nim } : {}) },
        });

        if (data.success && data.data && data.data.length > 0) {
          const mapped = mapBackendToSections(data.data);
          setSections(mapped);
          setHasResponded(!!data.has_responded);

          /** Jawaban awal sebelum draf — hanya berisi identitas yang sudah diketahui. */
          let initialAnswers = applyIdentityPrefill(mapped, {}, identityRef.current);

          // Pulihkan isian yang tertinggal, kecuali kuesionernya sudah pernah
          // dikirim. Dilakukan setelah sections siap karena sidik kuesioner
          // dihitung dari daftar pertanyaannya.
          if (nim && !data.has_responded) {
            const fingerprint = questionnaireFingerprint(mapped.flatMap((s) => s.questions.map((q) => q.id)));
            const local = readDraft(nim, fingerprint);
            const server = await fetchServerDraft(mapped);

            // Dua sumber, ambil yang paling baru. Draf lokal paling mutakhir di
            // perangkat ini, tapi draf server bisa lebih baru kalau alumni
            // sempat mengisi dari perangkat lain — itu justru gunanya draf
            // server, jadi jangan asal menangkan yang lokal.
            const localAt  = local && countAnswered(local.answers) > 0 ? local.savedAt : 0;
            const serverAt = server ? server.savedAt : 0;
            const winner   = localAt === 0 && serverAt === 0
              ? null
              : serverAt > localAt
                ? { answers: server!.answers, section: 0, savedAt: serverAt }
                : { answers: local!.answers, section: local!.currentSection, savedAt: localAt };

            if (winner) {
              // Draf ditumpuk di atas identitas, lalu identitas dilewatkan
              // sekali lagi supaya isian yang masih kosong di draf lama ikut
              // terisi dan NIM tetap mengikuti pemegang token.
              initialAnswers = applyIdentityPrefill(
                mapped,
                { ...initialAnswers, ...winner.answers },
                identityRef.current,
              );
              setCurrentSection(Math.min(winner.section, mapped.length - 1));
              setRestoredDraft({
                count: countAnswered(winner.answers),
                time: relativeTime(winner.savedAt),
              });
            }
          }

          setAnswers(initialAnswers);
        } else {
          // Tidak ada kuesioner aktif untuk tahun lulus ini
          setSections([]);
          toast({
            title: "Info",
            description: "Tidak ada kuesioner aktif untuk tahun lulusan Anda.",
          });
        }
      } catch (err: any) {
        console.warn("[useTracerForm] Backend error:", err.message);
        setSections([]);
        toast({
          title: "Gagal",
          description: "Tidak dapat memuat kuesioner. Coba lagi nanti.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingForms(false);
        // Sejak titik ini state sudah mencerminkan keadaan sebenarnya,
        // sehingga penyimpanan otomatis aman dijalankan.
        draftSaveReady.current = true;
      }
    };

    fetchForms();
  }, [kodeProdi, graduationYear]);

  // ── Draf server ───────────────────────────────────────────────────────────
  //
  // Selalu memuat jawaban terbaru tanpa perlu masuk sebagai dependensi effect
  // — interval autosave dibuat sekali, tapi harus mengirim isi termutakhir.
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const draftAuth = () => {
    const token = getStudentToken();
    return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
  };

  /** Kunci berawalan id kuesioner ("1___f505") → kode mentah ("f505"). */
  const stripPrefix = (key: string) => (key.includes(QID_SEP) ? key.split(QID_SEP)[1] : key);

  /** Bentuk penyimpanan server: berkunci question_code, sama seperti submit. */
  const toServerAnswers = (source: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source)) {
      const code = stripPrefix(key);
      const clean = Array.isArray(value) ? value.map((v) => (typeof v === "string" ? stripPrefix(v) : v)) : value;
      const isEmpty = clean === undefined || clean === null || clean === ""
        || (Array.isArray(clean) && clean.length === 0);
      // Jangan biarkan duplikat kode antar-kuesioner menimpa jawaban terisi
      // dengan yang kosong — aturan yang sama dipakai saat submit.
      if (!isEmpty || !(code in out)) out[code] = clean;
    }
    return out;
  };

  /** Kebalikannya: kode mentah dari server → kunci berawalan id pertanyaan. */
  const fromServerAnswers = (raw: Record<string, string>, sectionList: FormSection[]) => {
    const out: Record<string, unknown> = {};
    for (const s of sectionList) {
      for (const q of s.questions) {
        const code = q.code ?? stripPrefix(q.id);
        const value = raw[code];
        if (value === undefined) continue;

        // Checkbox disimpan sebagai JSON array oleh backend.
        if (typeof value === "string" && value.startsWith("[")) {
          try {
            const parsed = JSON.parse(value);
            out[q.id] = Array.isArray(parsed)
              ? parsed.map((v) => (typeof v === "string" ? `${q.id.split(QID_SEP)[0]}${QID_SEP}${stripPrefix(v)}` : v))
              : value;
            continue;
          } catch {
            /* bukan JSON — perlakukan sebagai teks biasa */
          }
        }
        out[q.id] = value;
      }
    }
    return out;
  };

  const fetchServerDraft = async (sectionList: FormSection[]) => {
    try {
      const { data } = await api.get("/tracer-study/draft", draftAuth());
      const raw = data?.data?.answers;
      const savedAt = data?.data?.saved_at;
      if (!raw || !savedAt || Object.keys(raw).length === 0) return null;

      return {
        answers: fromServerAnswers(raw, sectionList),
        savedAt: new Date(savedAt).getTime(),
      };
    } catch {
      // Draf server hanyalah kenyamanan tambahan. Kalau gagal dimuat,
      // pengisian tetap jalan dengan draf lokal.
      return null;
    }
  };

  /** Kirim draf ke server bila ada yang berubah. Tidak pernah mengganggu pengisian. */
  const flushServerDraft = async () => {
    if (!serverDraftDirty.current || !nim || submitted || hasResponded) return;

    const payload = toServerAnswers(answersRef.current);
    if (Object.keys(payload).length === 0) return;

    // Ditandai bersih SEBELUM permintaan dikirim supaya perubahan yang terjadi
    // selama permintaan berjalan tidak ikut hilang tandanya.
    serverDraftDirty.current = false;
    try {
      await api.post("/tracer-study/draft", { answers: payload }, draftAuth());
    } catch (e) {
      serverDraftDirty.current = true;   // coba lagi di siklus berikutnya
      console.warn("[useTracerForm] draf server gagal disimpan:", e);
    }
  };

  // Tandai ada perubahan yang belum terkirim.
  useEffect(() => {
    if (!draftSaveReady.current || submitted || hasResponded) return;
    serverDraftDirty.current = true;
  }, [answers, submitted, hasResponded]);

  // Kirim berkala tiap 15 detik — hanya kalau memang ada perubahan.
  useEffect(() => {
    if (!nim || submitted || hasResponded) return;
    const timer = setInterval(() => { void flushServerDraft(); }, 15_000);
    return () => clearInterval(timer);
  }, [nim, submitted, hasResponded]);

  // Pindah bagian adalah titik alami untuk menyimpan: alumni baru saja
  // menyelesaikan sekumpulan pertanyaan, dan di sinilah dia paling mungkin
  // berhenti atau menutup tab.
  useEffect(() => {
    if (!draftSaveReady.current) return;
    void flushServerDraft();
  }, [currentSection]);

  // ── Penyimpanan draf otomatis ─────────────────────────────────────────────
  //
  // Ditunda 800 ms setelah ketikan terakhir. Tanpa jeda, setiap huruf yang
  // diketik memicu penulisan localStorage dan serialisasi seluruh jawaban --
  // pemborosan yang terasa pada kuesioner sepanjang ini.
  useEffect(() => {
    if (!nim || !draftSaveReady.current || submitted || hasResponded) return;
    if (sections.length === 0) return;
    if (countAnswered(answers) === 0) return;

    const fingerprint = questionnaireFingerprint(sections.flatMap((s) => s.questions.map((q) => q.id)));
    const timer = setTimeout(() => {
      saveDraft(nim, answers, currentSection, fingerprint);
    }, 800);

    return () => clearTimeout(timer);
  }, [answers, currentSection, nim, sections, submitted, hasResponded]);

  // ── Answer management ─────────────────────────────────────────────────────
  const setAnswer = (questionId: string, value: unknown) => {
    // Isian referensi yang menempel pada pertanyaan ini — kab/kota mengikuti
    // provinsi. Begitu induknya berganti, jawaban turunannya menjadi mustahil
    // (kota dari provinsi lain), jadi dikosongkan alih-alih dibiarkan.
    const dependents = sections
      .flatMap((s) => s.questions)
      .filter((q) => q.dependsOn === questionId)
      .map((q) => q.id);

    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      if (prev[questionId] !== value) {
        for (const id of dependents) next[id] = "";
      }
      return next;
    });
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
  /**
   * Memvalidasi satu bagian dan mengembalikan daftar masalahnya.
   *
   * Berbeda dari versi sebelumnya yang hanya memeriksa "wajib tapi kosong",
   * sekarang setiap jawaban juga diperiksa tipenya lewat validasiJawaban()
   * — aturan yang sama dengan SubmitTracerStudyRequest di backend. Dengan
   * begitu kolom pendapatan yang diisi teks langsung ketahuan di sini,
   * bukan setelah satu putaran ke server.
   */
  const checkSection = (sectionIdx: number) => {
    const sec = sections[sectionIdx];
    if (!sec) return { errors: {}, warnings: {}, issueList: [] as FormIssue[] };

    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};
    const issueList: FormIssue[] = [];

    // Kumpulkan jawaban per KODE (tanpa awalan id kuesioner) untuk
    // validasi silang antar-pertanyaan.
    const byCode: Record<string, unknown> = {};

    sec.questions.forEach((q) => {
      if (q.showIf && !isQuestionVisible(q, answers, sec.questions)) return;
      const code = q.code ?? (q.id.includes(QID_SEP) ? q.id.split(QID_SEP)[1] : q.id);
      byCode[code] = answers[q.id];

      const result = validateAnswer(q, answers[q.id]);
      if (result.error) {
        errors[q.id] = result.error;
        issueList.push({ id: q.id, question: q.question, message: result.error });
      } else if (result.warning) {
        warnings[q.id] = result.warning;
      }
    });

    // Validasi silang f6 >= f7 >= f7a — hasilnya berkunci kode, perlu
    // dipetakan balik ke id pertanyaan supaya tampil di bawah field.
    const crossErrors = validateCrossField(byCode);
    for (const [code, message] of Object.entries(crossErrors)) {
      const q = sec.questions.find(
        (x) => (x.code ?? x.id.split(QID_SEP).pop()) === code,
      );
      if (!q || errors[q.id]) continue;
      errors[q.id] = message;
      issueList.push({ id: q.id, question: q.question, message });
    }

    return { errors, warnings, issueList };
  };

  const validateSection = (sectionIdx: number): boolean => {
    const { errors, warnings, issueList } = checkSection(sectionIdx);
    setErrors(errors);
    setWarnings(warnings);
    setIssues(issueList);
    return issueList.length === 0;
  };

  /** Validasi satu pertanyaan saja — dipakai saat pengguna meninggalkan field. */
  const validateQuestion = (q: Question) => {
    const result = validateAnswer(q, answers[q.id]);
    setErrors((prev) => {
      const next = { ...prev };
      if (result.error) next[q.id] = result.error; else delete next[q.id];
      return next;
    });
    setWarnings((prev) => {
      const next = { ...prev };
      if (result.warning) next[q.id] = result.warning; else delete next[q.id];
      return next;
    });
  };

  /**
   * Toast yang menyebutkan pertanyaan mana yang bermasalah.
   *
   * Pesan umum semacam "ada isian yang salah" memaksa alumni menyisir ulang
   * seluruh bagian. Di sini maksimal tiga pertanyaan disebut namanya, sisanya
   * diringkas. Durasi 9 detik karena bawaannya 4 detik — terlalu cepat untuk
   * membaca beberapa baris.
   */
  const showIssuesToast = (issueList: FormIssue[]) => {
    if (issueList.length === 0) return;

    const shown = issueList.slice(0, 3);
    const remaining = issueList.length - shown.length;

    const details = shown
      .map((m) => `• ${truncate(m.question, 60)} — ${m.message}`)
      .join("\n");

    toast({
      title: issueList.length === 1
        ? "1 pertanyaan belum benar"
        : `${issueList.length} pertanyaan belum benar`,
      description: remaining > 0 ? `${details}\n…dan ${remaining} pertanyaan lainnya.` : details,
      variant: "destructive",
      duration: 9000,
    });
  };

  /** Gulir ke pertanyaan bermasalah pertama lalu fokuskan isiannya. */
  const scrollToFirstIssue = (issueList: FormIssue[]) => {
    const first = issueList[0];
    if (!first) return;
    // Ditunda satu frame supaya penanda error sudah tergambar lebih dulu.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-question-id="${CSS.escape(first.id)}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector<HTMLElement>("input, textarea, select, [role='radiogroup']")?.focus({ preventScroll: true });
    });
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  //
  // Sebagian bagian isinya bersyarat seluruhnya: "Studi Lanjut" hanya untuk
  // f8 = 4, "Kontak Penilai" hanya untuk f8 = 1/3/4. Tanpa penyaringan di
  // bawah, alumni yang tidak memenuhi syarat tetap melewati halaman berisi
  // judul tanpa satu pun pertanyaan — dan ikut terhitung pada "Bagian X dari
  // Y". Yang dilewati hanya bagian yang memang punya pertanyaan bersyarat;
  // bagian kosong karena kuesionernya memang belum diisi tetap ditampilkan.
  const visibleSectionIdx = useMemo(() => {
    const idx = sections
      .map((_, i) => i)
      .filter((i) => {
        const qs = sections[i].questions;
        if (qs.length === 0) return true;
        return qs.some((q) => isQuestionVisible(q, answers, qs));
      });

    return idx.length > 0 ? idx : sections.map((_, i) => i);
  }, [sections, answers]);

  /**
   * Bagian yang sedang dibuka bisa mendadak tersembunyi — misalnya alumni
   * kembali ke belakang lalu mengubah f8 dari "Melanjutkan Pendidikan"
   * menjadi "Bekerja". Kalau itu terjadi, geser ke bagian terlihat terdekat
   * supaya layar tidak membeku pada halaman tanpa isi.
   */
  useEffect(() => {
    if (sections.length === 0) return;
    if (visibleSectionIdx.includes(currentSection)) return;

    const fallback =
      [...visibleSectionIdx].reverse().find((i) => i < currentSection) ??
      visibleSectionIdx[0];
    setCurrentSection(fallback);
  }, [visibleSectionIdx, currentSection, sections.length]);

  const handleNext = () => {
    const { errors, warnings, issueList } = checkSection(currentSection);
    setErrors(errors);
    setWarnings(warnings);
    setIssues(issueList);

    if (issueList.length > 0) {
      showIssuesToast(issueList);
      scrollToFirstIssue(issueList);
      return;
    }

    const next = visibleSectionIdx.find((i) => i > currentSection);
    if (next === undefined) return;

    setCurrentSection(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    const prev = [...visibleSectionIdx].reverse().find((i) => i < currentSection);
    if (prev === undefined) return;

    setCurrentSection(prev);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ke backend ─────────────────────────────────────────────────────
  const handleSubmit = async (
    e: React.FormEvent,
    identityData?: Record<string, unknown>
  ) => {
    e.preventDefault();

    const check = checkSection(currentSection);
    setErrors(check.errors);
    setWarnings(check.warnings);
    setIssues(check.issueList);
    if (check.issueList.length > 0) {
      showIssuesToast(check.issueList);
      scrollToFirstIssue(check.issueList);
      return;
    }

    setIsSubmitting(true);
    try {
      // Strip questionnaire prefix from answer keys before sending
      const strippedAnswers: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(answers)) {
        const rawKey = key.includes(QID_SEP) ? key.split(QID_SEP)[1] : key;
        // Strip prefix from checkbox array values too
        const rawValue = Array.isArray(value)
          ? value.map((v) => (typeof v === "string" && v.includes(QID_SEP) ? v.split(QID_SEP)[1] : v))
          : value;
        // Don't overwrite a filled answer with an empty one (handles duplicate question_codes across questionnaires)
        const isEmpty = rawValue === undefined || rawValue === null || rawValue === "" || (Array.isArray(rawValue) && rawValue.length === 0);
        if (!isEmpty || !(rawKey in strippedAnswers)) {
          strippedAnswers[rawKey] = rawValue;
        }
      }

      // Gabungkan jawaban kuesioner + identity data (identity wins for overlapping keys)
      const payload = {
        ...strippedAnswers,
        ...identityData,
        questionnaire_ids: sections.map((s) => Number(s.id)),
      };

      // Token alumni disematkan eksplisit: endpoint ini memakai guard
      // 'alumni', dan token staff yang mungkin ada di localStorage akan
      // ditolak 401 di sana.
      const studentToken = getStudentToken();
      await api.post("/tracer-study/submit", payload, {
        headers: studentToken
          ? { Authorization: `Bearer ${studentToken}` }
          : undefined,
      });

      setSubmitted(true);

      // Draf dibuang begitu data aman di server. Isinya memuat data pribadi
      // (NIK, NPWP, pendapatan), jadi tidak dibiarkan tertinggal di peramban
      // lebih lama dari yang diperlukan.
      if (nim) clearDraft(nim);
      setRestoredDraft(null);

      toast({
        title: "Berhasil!",
        description: "Kuesioner telah berhasil dikirim",
      });
    } catch (err: any) {
      const serverErrors = err.response?.data?.errors;

      if (serverErrors) {
        // PENTING: server membalas error berkunci KODE mentah ("f505"),
        // sedangkan jawaban di sini berkunci id berawalan ("1___f505").
        // Sebelumnya keduanya tidak pernah cocok, sehingga galat dari backend
        // tidak pernah muncul di bawah field — pengguna hanya melihat pesan
        // umum tanpa tahu bagian mana yang salah. Di sini kodenya dipetakan
        // balik ke id pertanyaan.
        const allQuestions = sections.flatMap((s) => s.questions);
        const newErrors: Record<string, string> = {};
        const issueList: FormIssue[] = [];

        for (const [code, messages] of Object.entries(serverErrors)) {
          const message = Array.isArray(messages) ? String(messages[0]) : String(messages);
          const q = allQuestions.find(
            (x) => (x.code ?? x.id.split(QID_SEP).pop()) === code,
          );
          const key = q?.id ?? code;
          newErrors[key] = message;
          issueList.push({ id: key, question: q?.question ?? code, message });
        }

        setErrors(newErrors);
        setIssues(issueList);
        showIssuesToast(issueList);
        scrollToFirstIssue(issueList);
        return;
      }

      toast({
        title: "Gagal mengirim kuesioner",
        description:
          err.response?.data?.message ||
          "Terjadi kesalahan saat menghubungi server. Periksa koneksi Anda lalu coba lagi.",
        variant: "destructive",
        duration: 9000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  /**
   * Keadaan "kosong" bukan berarti benar-benar hampa: identitas yang sudah
   * diketahui sistem tetap terisi, sama seperti saat borang pertama dibuka.
   * Mengosongkannya hanya memaksa alumni mengetik ulang data yang sudah ada.
   */
  const blankAnswers = () => applyIdentityPrefill(sections, {}, identityRef.current);

  const handleReset = () => {
    setSubmitted(false);
    setAnswers(blankAnswers());
    setCurrentSection(0);
    setErrors({});
    setWarnings({});
    setIssues([]);
    setRestoredDraft(null);
    if (nim) clearDraft(nim);
  };

  /**
   * Buang isian tersimpan dan mulai dari kosong ("Mulai ulang").
   *
   * WAJIB menghapus DUA tempat: draf lokal dan draf server. Kalau hanya satu
   * yang dibuang, sisanya akan mengisi ulang saat halaman dimuat lagi dan
   * formulirnya terlihat "tidak mau bersih".
   *
   * Dulu keluar-lalu-masuk berfungsi sebagai mulai ulang karena logout
   * menghapus localStorage. Sejak draf ikut akun, jalan itu tidak lagi
   * membuang apa pun — jadi tombol ini satu-satunya cara.
   */
  const discardDraft = async () => {
    if (nim) clearDraft(nim);
    serverDraftDirty.current = false;

    try {
      await api.delete("/tracer-study/draft", draftAuth());
    } catch (e) {
      console.warn("[useTracerForm] draf server gagal dihapus:", e);
      toast({
        title: "Sebagian draf mungkin masih tersimpan",
        description:
          "Isian di perangkat ini sudah dikosongkan, tapi draf di server gagal dihapus. Coba lagi setelah koneksi membaik.",
        variant: "destructive",
      });
    }

    setAnswers(blankAnswers());
    setCurrentSection(0);
    setErrors({});
    setWarnings({});
    setIssues([]);
    setRestoredDraft(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Penomoran mengikuti bagian yang benar-benar dilalui alumni, bukan seluruh
  // bagian kuesioner — kalau tidak, "Bagian 3 dari 11" bisa melompat ke
  // "Bagian 5 dari 11" begitu dua bagian bersyarat dilewati.
  const sectionPosition = Math.max(visibleSectionIdx.indexOf(currentSection), 0) + 1;
  const sectionCount = visibleSectionIdx.length;

  const progressPercent = sectionCount > 0 ? (sectionPosition / sectionCount) * 100 : 0;
  const section = sections[currentSection];
  const isLastSection = visibleSectionIdx.every((i) => i <= currentSection);

  return {
    sections,
    answers,
    submitted,
    currentSection,
    errors,
    warnings,
    issues,
    validateQuestion,
    restoredDraft,
    discardDraft,
    section,
    isLastSection,
    sectionPosition,
    sectionCount,
    progressPercent,
    isLoadingForms,
    isSubmitting,
    hasResponded,
    setAnswer,
    setCheckboxAnswer,
    handleNext,
    handleBack,
    handleSubmit,
    handleReset,
  };
};
