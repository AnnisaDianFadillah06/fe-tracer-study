import type { Question } from "@/hooks/form/useQuestionManagement";

/**
 * Validasi jawaban kuesioner di sisi frontend.
 *
 * ATURANNYA SENGAJA MENCERMINKAN BACKEND, bukan ditulis ulang secara
 * terpisah. Rujukannya: app/Http/Requests/Api/SubmitTracerStudyRequest.php,
 * yang membangun aturan secara dinamis dari question_type + metadata:
 *
 *   number       -> numeric, plus between:scale_min,scale_max bila berskala
 *   single_choice-> in:<option_code>
 *   short_text   -> max:500
 *   long_text    -> max:5000
 *   date         -> date
 *   boolean      -> in:0,1,true,false
 *
 * Karena keduanya membaca metadata yang sama, menambah pertanyaan baru lewat
 * form builder otomatis ikut tervalidasi di kedua sisi tanpa ubah kode.
 *
 * Tujuan validasi di sini bukan menggantikan backend — backend tetap penjaga
 * terakhir — melainkan memberi tahu alumni SEBELUM mereka menekan Kirim dan
 * menunggu satu putaran ke server hanya untuk ditolak.
 */

/** Peringatan lunak: nilainya sah, tapi patut dikonfirmasi ulang. */
export interface ValidationResult {
  error?: string;
  warning?: string;
}

/** Ambang kewajaran per kode pertanyaan — untuk menangkap salah ketik nol. */
const SANITY_RANGES: Record<string, { min?: number; max?: number; messageMin?: string; messageMax?: string }> = {
  // UMP terendah di Indonesia ada di kisaran 2 juta; di bawah 1 juta hampir
  // pasti nol-nya kurang. Di atas 200 juta/bulan sangat jarang untuk lulusan baru.
  f505: {
    min: 1_000_000,
    max: 200_000_000,
    messageMin: "Nilainya jauh di bawah UMP mana pun. Pastikan tidak ada angka nol yang terlewat.",
    messageMax: "Nilainya tidak lazim untuk pendapatan per bulan. Pastikan tidak ada kelebihan angka nol.",
  },
  f502: { max: 120, messageMax: "Lebih dari 10 tahun. Pastikan yang Anda isi adalah jumlah BULAN, bukan tahun." },
  f302: { max: 60, messageMax: "Lebih dari 5 tahun sebelum lulus. Pastikan satuannya bulan." },
  f303: { max: 120, messageMax: "Lebih dari 10 tahun setelah lulus. Pastikan satuannya bulan." },
  f6:   { max: 500, messageMax: "Jumlahnya tidak lazim. Pastikan angkanya benar." },
  f7:   { max: 500, messageMax: "Jumlahnya tidak lazim. Pastikan angkanya benar." },
  f7a:  { max: 500, messageMax: "Jumlahnya tidak lazim. Pastikan angkanya benar." },
};

/** Kode pertanyaan yang nilainya uang — dipakai untuk pratinjau terformat. */
export const CURRENCY_CODES = new Set(["f505"]);

/**
 * Bersihkan input value dari pemisah ribuan yang biasa diketik pengguna.
 *
 * Alumni terbiasa mengetik "5.000.000" atau "5,000,000". Menolak mentah-mentah
 * hanya membuat mereka bingung, padahal maksudnya sudah jelas. Titik dan koma
 * dibuang, spasi dan "Rp" ikut dibersihkan.
 */
export function parseNumericInput(value: string): string {
  return value.replace(/[.,\s]/g, "").replace(/rp/gi, "");
}

/** Format value jadi rupiah untuk pratinjau di bawah input. */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(value);
}

/** Format value biasa dengan pemisah ribuan. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

/**
 * Petunjuk pengisian per pertanyaan.
 *
 * Dua lapis: metadata.hint dari basis data menang bila ada (bisa disunting
 * Tim Tracer lewat form builder tanpa deploy), selebihnya diturunkan otomatis
 * dari tipe supaya seluruh isian value langsung punya petunjuk sejak awal.
 */
export function hintFor(q: Question): string | null {
  const meta = (q.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.hint === "string" && meta.hint.trim()) return meta.hint.trim();

  const code = q.code ?? q.id;

  if (CURRENCY_CODES.has(code)) {
    return "Isi angka saja, tanpa titik atau koma. Contoh: 5000000";
  }

  if (q.backendType === "number") {
    // Pertanyaan berskala sudah dirender sebagai widget skala, tidak diketik.
    if (meta.scale_min != null || meta.scale_max != null) return null;

    if (/berapa bulan|dalam berapa bulan/i.test(q.question ?? "")) {
      return "Isi dalam satuan bulan, angka saja. Contoh: 6";
    }
    return "Isi angka saja, tanpa titik atau koma.";
  }

  if (q.backendType === "date") return "Format tanggal: dd/mm/yyyy";

  if (code === "telpomsmh") return "Contoh: 081234567890";
  if (code === "emailmsmh") return "Contoh: nama@email.com";
  if (code === "nik") return "16 digit, angka saja tanpa spasi.";
  if (code === "npwp") return "15 atau 16 digit, angka saja. Kosongkan bila belum punya.";

  return null;
}

/** Apakah jawaban dianggap kosong. */
export function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * Validasi satu jawaban. Mengembalikan error (memblokir) dan/atau warning
 * (tidak memblokir, hanya minta konfirmasi ulang).
 */
export function validateAnswer(q: Question, answer: unknown): ValidationResult {
  const code = q.code ?? q.id;

  if (isEmpty(answer)) {
    return q.required ? { error: "Pertanyaan ini wajib diisi." } : {};
  }

  const text = typeof answer === "string" ? answer.trim() : String(answer);

  switch (q.backendType) {
    case "number": {
      const cleaned = parseNumericInput(text);

      if (!/^-?\d+([.]\d+)?$/.test(cleaned)) {
        return {
          error: CURRENCY_CODES.has(code)
            ? "Harus berupa angka. Tulis tanpa titik, koma, atau huruf. Contoh: 5000000"
            : "Harus berupa angka. Contoh: 6",
        };
      }

      const value = Number(cleaned);
      if (Number.isNaN(value)) return { error: "Harus berupa angka." };
      if (value < 0) return { error: "Tidak boleh bernilai negatif." };

      // Pertanyaan berskala: batas keras, sama seperti aturan `between` di BE.
      const meta = (q.metadata ?? {}) as Record<string, unknown>;
      const min = meta.scale_min as number | undefined;
      const max = meta.scale_max as number | undefined;
      if (min != null && max != null && (value < min || value > max)) {
        return { error: `Nilai harus antara ${min} sampai ${max}.` };
      }

      // Batas kewajaran: peringatan saja, pengisian tetap boleh dilanjutkan.
      const range = SANITY_RANGES[code];
      if (range) {
        if (range.min != null && value < range.min) return { warning: range.messageMin };
        if (range.max != null && value > range.max) return { warning: range.messageMax };
      }
      return {};
    }

    case "date": {
      const d = new Date(text);
      if (Number.isNaN(d.getTime())) return { error: "Format tanggal tidak valid. Gunakan dd/mm/yyyy." };
      if (d.getFullYear() < 1950 || d.getFullYear() > new Date().getFullYear() + 10) {
        return { warning: "Tahunnya di luar rentang wajar. Mohon diperiksa kembali." };
      }
      return {};
    }

    case "short_text":
      if (text.length > 500) return { error: "Maksimal 500 karakter." };
      if (code === "emailmsmh" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return { error: "Format email tidak valid. Contoh: nama@email.com" };
      }
      if (code === "telpomsmh") {
        const digits = text.replace(/[^\d]/g, "");
        if (digits.length < 9 || digits.length > 15) {
          return { error: "Nomor telepon harus 9–15 digit. Contoh: 081234567890" };
        }
      }
      if (code === "nik" && text.replace(/\D/g, "").length !== 16) {
        return { error: "NIK harus tepat 16 digit." };
      }
      if (code === "npwp") {
        const digits = text.replace(/\D/g, "");
        if (digits.length !== 15 && digits.length !== 16) {
          return { error: "NPWP harus 15 atau 16 digit." };
        }
      }
      return {};

    case "long_text":
      return text.length > 5000 ? { error: "Maksimal 5000 karakter." } : {};

    default:
      return {};
  }
}

/**
 * Validasi silang antar-pertanyaan — cerminan withValidator() di
 * SubmitTracerStudyRequest. Corong pencarian kerja harus mengecil:
 * jumlah lamaran >= yang responded >= yang mengundang interviewed.
 *
 * @param answersByCode jawaban yang sudah dilepas awalan id kuesionernya
 * @returns error per KODE pertanyaan (bukan per id)
 */
export function validateCrossField(answersByCode: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};

  const numeric = (code: string): number | null => {
    const v = answersByCode[code];
    if (isEmpty(v)) return null;
    const cleaned = parseNumericInput(String(v));
    return /^\d+$/.test(cleaned) ? Number(cleaned) : null;
  };

  const applied = numeric("f6");
  const responded = numeric("f7");
  const interviewed = numeric("f7a");

  if (applied !== null && responded !== null && responded > applied) {
    errors.f7 = `Tidak boleh lebih banyak daripada jumlah lamaran yang dikirim (${formatNumber(applied)}).`;
  }
  if (responded !== null && interviewed !== null && interviewed > responded) {
    errors.f7a = `Tidak boleh lebih banyak daripada jumlah perusahaan yang merespons (${formatNumber(responded)}).`;
  }
  if (responded === null && applied !== null && interviewed !== null && interviewed > applied) {
    errors.f7a = `Tidak boleh lebih banyak daripada jumlah lamaran yang dikirim (${formatNumber(applied)}).`;
  }

  return errors;
}
