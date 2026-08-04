import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import type { FormSection, Question, Option } from "@/hooks/form/useQuestionManagement";
import { validasiJawaban, validasiSilang } from "@/lib/formValidation";
import {
  simpanDraft, bacaDraft, hapusDraft, sidikKuesioner, jumlahTerisi, waktuRelatif,
} from "@/lib/formDraft";

/** Satu masalah pengisian, dipakai untuk isi toast dan penggulir otomatis. */
export interface MasalahForm {
  /** id pertanyaan (berawalan id kuesioner) — dipakai untuk scroll & fokus. */
  id: string;
  pertanyaan: string;
  pesan: string;
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
  };
}

/** Separator used to namespace question IDs per questionnaire. */
const QID_SEP = "___";

/** Pangkas teks panjang agar isi toast tetap terbaca. */
function potong(teks: string, maks: number): string {
  const bersih = (teks ?? "").trim();
  return bersih.length <= maks ? bersih : `${bersih.slice(0, maks - 1)}…`;
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
export const useTracerForm = (kodeProdi?: string, graduationYear?: number, nim?: string) => {
  const { toast } = useToast();
  const [sections, setSections] = useState<FormSection[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Peringatan lunak — nilainya sah, tapi patut dikonfirmasi ulang. */
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  /** Ringkasan masalah untuk toast + penanda field mana yang harus digulir. */
  const [masalah, setMasalah] = useState<MasalahForm[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);

  /** Info draf yang dipulihkan, untuk diberitahukan ke pengguna sekali saja. */
  const [draftDipulihkan, setDraftDipulihkan] = useState<{
    jumlah: number; waktu: string;
  } | null>(null);
  /**
   * Penanda bahwa pemulihan draf sudah dicoba. Penyimpanan otomatis baru
   * boleh berjalan setelah ini, supaya state awal yang masih kosong tidak
   * keburu menimpa draf yang tersimpan.
   */
  const siapSimpanDraft = useRef(false);

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

          // Pulihkan isian yang tertinggal, kecuali kuesionernya sudah pernah
          // dikirim. Dilakukan setelah sections siap karena sidik kuesioner
          // dihitung dari daftar pertanyaannya.
          if (nim && !data.has_responded) {
            const sidik = sidikKuesioner(mapped.flatMap((s) => s.questions.map((q) => q.id)));
            const draft = bacaDraft(nim, sidik);

            if (draft && jumlahTerisi(draft.jawaban) > 0) {
              setAnswers(draft.jawaban);
              setCurrentSection(Math.min(draft.bagianAktif, mapped.length - 1));
              setDraftDipulihkan({
                jumlah: jumlahTerisi(draft.jawaban),
                waktu: waktuRelatif(draft.disimpanPada),
              });
            }
          }
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
        siapSimpanDraft.current = true;
      }
    };

    fetchForms();
  }, [kodeProdi, graduationYear]);

  // ── Penyimpanan draf otomatis ─────────────────────────────────────────────
  //
  // Ditunda 800 ms setelah ketikan terakhir. Tanpa jeda, setiap huruf yang
  // diketik memicu penulisan localStorage dan serialisasi seluruh jawaban --
  // pemborosan yang terasa pada kuesioner sepanjang ini.
  useEffect(() => {
    if (!nim || !siapSimpanDraft.current || submitted || hasResponded) return;
    if (sections.length === 0) return;
    if (jumlahTerisi(answers) === 0) return;

    const sidik = sidikKuesioner(sections.flatMap((s) => s.questions.map((q) => q.id)));
    const timer = setTimeout(() => {
      simpanDraft(nim, answers, currentSection, sidik);
    }, 800);

    return () => clearTimeout(timer);
  }, [answers, currentSection, nim, sections, submitted, hasResponded]);

  // ── Answer management ─────────────────────────────────────────────────────
  const setAnswer = (questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
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
  const periksaSection = (sectionIdx: number) => {
    const sec = sections[sectionIdx];
    if (!sec) return { errors: {}, warnings: {}, daftar: [] as MasalahForm[] };

    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};
    const daftar: MasalahForm[] = [];

    // Kumpulkan jawaban per KODE (tanpa awalan id kuesioner) untuk
    // validasi silang antar-pertanyaan.
    const perKode: Record<string, unknown> = {};

    sec.questions.forEach((q) => {
      if (q.showIf && !isQuestionVisible(q, answers, sec.questions)) return;
      const kode = q.code ?? (q.id.includes(QID_SEP) ? q.id.split(QID_SEP)[1] : q.id);
      perKode[kode] = answers[q.id];

      const hasil = validasiJawaban(q, answers[q.id]);
      if (hasil.error) {
        errors[q.id] = hasil.error;
        daftar.push({ id: q.id, pertanyaan: q.question, pesan: hasil.error });
      } else if (hasil.warning) {
        warnings[q.id] = hasil.warning;
      }
    });

    // Validasi silang f6 >= f7 >= f7a — hasilnya berkunci kode, perlu
    // dipetakan balik ke id pertanyaan supaya tampil di bawah field.
    const silang = validasiSilang(perKode);
    for (const [kode, pesan] of Object.entries(silang)) {
      const q = sec.questions.find(
        (x) => (x.code ?? x.id.split(QID_SEP).pop()) === kode,
      );
      if (!q || errors[q.id]) continue;
      errors[q.id] = pesan;
      daftar.push({ id: q.id, pertanyaan: q.question, pesan });
    }

    return { errors, warnings, daftar };
  };

  const validateSection = (sectionIdx: number): boolean => {
    const { errors, warnings, daftar } = periksaSection(sectionIdx);
    setErrors(errors);
    setWarnings(warnings);
    setMasalah(daftar);
    return daftar.length === 0;
  };

  /** Validasi satu pertanyaan saja — dipakai saat pengguna meninggalkan field. */
  const validateQuestion = (q: Question) => {
    const hasil = validasiJawaban(q, answers[q.id]);
    setErrors((prev) => {
      const next = { ...prev };
      if (hasil.error) next[q.id] = hasil.error; else delete next[q.id];
      return next;
    });
    setWarnings((prev) => {
      const next = { ...prev };
      if (hasil.warning) next[q.id] = hasil.warning; else delete next[q.id];
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
  const tampilkanToastMasalah = (daftar: MasalahForm[]) => {
    if (daftar.length === 0) return;

    const ditampilkan = daftar.slice(0, 3);
    const sisa = daftar.length - ditampilkan.length;

    const rincian = ditampilkan
      .map((m) => `• ${potong(m.pertanyaan, 60)} — ${m.pesan}`)
      .join("\n");

    toast({
      title: daftar.length === 1
        ? "1 pertanyaan belum benar"
        : `${daftar.length} pertanyaan belum benar`,
      description: sisa > 0 ? `${rincian}\n…dan ${sisa} pertanyaan lainnya.` : rincian,
      variant: "destructive",
      duration: 9000,
    });
  };

  /** Gulir ke pertanyaan bermasalah pertama lalu fokuskan isiannya. */
  const gulirKeMasalah = (daftar: MasalahForm[]) => {
    const pertama = daftar[0];
    if (!pertama) return;
    // Ditunda satu frame supaya penanda error sudah tergambar lebih dulu.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-question-id="${CSS.escape(pertama.id)}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector<HTMLElement>("input, textarea, select, [role='radiogroup']")?.focus({ preventScroll: true });
    });
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNext = () => {
    const { errors, warnings, daftar } = periksaSection(currentSection);
    setErrors(errors);
    setWarnings(warnings);
    setMasalah(daftar);

    if (daftar.length > 0) {
      tampilkanToastMasalah(daftar);
      gulirKeMasalah(daftar);
      return;
    }

    setCurrentSection((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setCurrentSection((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ke backend ─────────────────────────────────────────────────────
  const handleSubmit = async (
    e: React.FormEvent,
    identityData?: Record<string, unknown>
  ) => {
    e.preventDefault();

    const periksa = periksaSection(currentSection);
    setErrors(periksa.errors);
    setWarnings(periksa.warnings);
    setMasalah(periksa.daftar);
    if (periksa.daftar.length > 0) {
      tampilkanToastMasalah(periksa.daftar);
      gulirKeMasalah(periksa.daftar);
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

      await api.post("/tracer-study/submit", payload);

      setSubmitted(true);

      // Draf dibuang begitu data aman di server. Isinya memuat data pribadi
      // (NIK, NPWP, pendapatan), jadi tidak dibiarkan tertinggal di peramban
      // lebih lama dari yang diperlukan.
      if (nim) hapusDraft(nim);
      setDraftDipulihkan(null);

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
        const semuaPertanyaan = sections.flatMap((s) => s.questions);
        const newErrors: Record<string, string> = {};
        const daftar: MasalahForm[] = [];

        for (const [kode, messages] of Object.entries(serverErrors)) {
          const pesan = Array.isArray(messages) ? String(messages[0]) : String(messages);
          const q = semuaPertanyaan.find(
            (x) => (x.code ?? x.id.split(QID_SEP).pop()) === kode,
          );
          const kunci = q?.id ?? kode;
          newErrors[kunci] = pesan;
          daftar.push({ id: kunci, pertanyaan: q?.question ?? kode, pesan });
        }

        setErrors(newErrors);
        setMasalah(daftar);
        tampilkanToastMasalah(daftar);
        gulirKeMasalah(daftar);
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
  const handleReset = () => {
    setSubmitted(false);
    setAnswers({});
    setCurrentSection(0);
    setErrors({});
    setWarnings({});
    setMasalah([]);
    setDraftDipulihkan(null);
    if (nim) hapusDraft(nim);
  };

  /**
   * Buang isian yang dipulihkan dan mulai dari kosong.
   *
   * Dibutuhkan bila draf ternyata milik pengisian yang tidak diinginkan —
   * misalnya alumni salah memulai, atau komputernya dipakai bergantian.
   */
  const buangDraft = () => {
    if (nim) hapusDraft(nim);
    setAnswers({});
    setCurrentSection(0);
    setErrors({});
    setWarnings({});
    setMasalah([]);
    setDraftDipulihkan(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progressPercent =
    sections.length > 0
      ? ((currentSection + 1) / sections.length) * 100
      : 0;
  const section = sections[currentSection];
  const isLastSection = currentSection === sections.length - 1;

  return {
    sections,
    answers,
    submitted,
    currentSection,
    errors,
    warnings,
    masalah,
    validateQuestion,
    draftDipulihkan,
    buangDraft,
    section,
    isLastSection,
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
