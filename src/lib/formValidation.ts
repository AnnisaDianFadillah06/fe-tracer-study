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
export interface HasilValidasi {
  error?: string;
  warning?: string;
}

/** Ambang kewajaran per kode pertanyaan — untuk menangkap salah ketik nol. */
const AMBANG_WAJAR: Record<string, { min?: number; max?: number; pesanMin?: string; pesanMax?: string }> = {
  // UMP terendah di Indonesia ada di kisaran 2 juta; di bawah 1 juta hampir
  // pasti nol-nya kurang. Di atas 200 juta/bulan sangat jarang untuk lulusan baru.
  f505: {
    min: 1_000_000,
    max: 200_000_000,
    pesanMin: "Nilainya jauh di bawah UMP mana pun. Pastikan tidak ada angka nol yang terlewat.",
    pesanMax: "Nilainya tidak lazim untuk pendapatan per bulan. Pastikan tidak ada kelebihan angka nol.",
  },
  f502: { max: 120, pesanMax: "Lebih dari 10 tahun. Pastikan yang Anda isi adalah jumlah BULAN, bukan tahun." },
  f302: { max: 60, pesanMax: "Lebih dari 5 tahun sebelum lulus. Pastikan satuannya bulan." },
  f303: { max: 120, pesanMax: "Lebih dari 10 tahun setelah lulus. Pastikan satuannya bulan." },
  f6:   { max: 500, pesanMax: "Jumlahnya tidak lazim. Pastikan angkanya benar." },
  f7:   { max: 500, pesanMax: "Jumlahnya tidak lazim. Pastikan angkanya benar." },
  f7a:  { max: 500, pesanMax: "Jumlahnya tidak lazim. Pastikan angkanya benar." },
};

/** Kode pertanyaan yang nilainya uang — dipakai untuk pratinjau terformat. */
export const KODE_UANG = new Set(["f505"]);

/**
 * Bersihkan input angka dari pemisah ribuan yang biasa diketik pengguna.
 *
 * Alumni terbiasa mengetik "5.000.000" atau "5,000,000". Menolak mentah-mentah
 * hanya membuat mereka bingung, padahal maksudnya sudah jelas. Titik dan koma
 * dibuang, spasi dan "Rp" ikut dibersihkan.
 */
export function bersihkanAngka(nilai: string): string {
  return nilai.replace(/[.,\s]/g, "").replace(/rp/gi, "");
}

/** Format angka jadi rupiah untuk pratinjau di bawah input. */
export function formatRupiah(angka: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(angka);
}

/** Format angka biasa dengan pemisah ribuan. */
export function formatAngka(angka: number): string {
  return new Intl.NumberFormat("id-ID").format(angka);
}

/**
 * Petunjuk pengisian per pertanyaan.
 *
 * Dua lapis: metadata.hint dari basis data menang bila ada (bisa disunting
 * Tim Tracer lewat form builder tanpa deploy), selebihnya diturunkan otomatis
 * dari tipe supaya seluruh isian angka langsung punya petunjuk sejak awal.
 */
export function petunjukUntuk(q: Question): string | null {
  const meta = (q.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.hint === "string" && meta.hint.trim()) return meta.hint.trim();

  const kode = q.code ?? q.id;

  if (KODE_UANG.has(kode)) {
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

  if (kode === "telpomsmh") return "Contoh: 081234567890";
  if (kode === "emailmsmh") return "Contoh: nama@email.com";
  if (kode === "nik") return "16 digit, angka saja tanpa spasi.";
  if (kode === "npwp") return "15 atau 16 digit, angka saja. Kosongkan bila belum punya.";

  return null;
}

/** Apakah jawaban dianggap kosong. */
export function kosong(nilai: unknown): boolean {
  return (
    nilai === undefined ||
    nilai === null ||
    nilai === "" ||
    (Array.isArray(nilai) && nilai.length === 0)
  );
}

/**
 * Validasi satu jawaban. Mengembalikan error (memblokir) dan/atau warning
 * (tidak memblokir, hanya minta konfirmasi ulang).
 */
export function validasiJawaban(q: Question, nilai: unknown): HasilValidasi {
  const kode = q.code ?? q.id;

  if (kosong(nilai)) {
    return q.required ? { error: "Pertanyaan ini wajib diisi." } : {};
  }

  const teks = typeof nilai === "string" ? nilai.trim() : String(nilai);

  switch (q.backendType) {
    case "number": {
      const bersih = bersihkanAngka(teks);

      if (!/^-?\d+([.]\d+)?$/.test(bersih)) {
        return {
          error: KODE_UANG.has(kode)
            ? "Harus berupa angka. Tulis tanpa titik, koma, atau huruf. Contoh: 5000000"
            : "Harus berupa angka. Contoh: 6",
        };
      }

      const angka = Number(bersih);
      if (Number.isNaN(angka)) return { error: "Harus berupa angka." };
      if (angka < 0) return { error: "Tidak boleh bernilai negatif." };

      // Pertanyaan berskala: batas keras, sama seperti aturan `between` di BE.
      const meta = (q.metadata ?? {}) as Record<string, unknown>;
      const min = meta.scale_min as number | undefined;
      const max = meta.scale_max as number | undefined;
      if (min != null && max != null && (angka < min || angka > max)) {
        return { error: `Nilai harus antara ${min} sampai ${max}.` };
      }

      // Batas kewajaran: peringatan saja, pengisian tetap boleh dilanjutkan.
      const ambang = AMBANG_WAJAR[kode];
      if (ambang) {
        if (ambang.min != null && angka < ambang.min) return { warning: ambang.pesanMin };
        if (ambang.max != null && angka > ambang.max) return { warning: ambang.pesanMax };
      }
      return {};
    }

    case "date": {
      const d = new Date(teks);
      if (Number.isNaN(d.getTime())) return { error: "Format tanggal tidak valid. Gunakan dd/mm/yyyy." };
      if (d.getFullYear() < 1950 || d.getFullYear() > new Date().getFullYear() + 10) {
        return { warning: "Tahunnya di luar rentang wajar. Mohon diperiksa kembali." };
      }
      return {};
    }

    case "short_text":
      if (teks.length > 500) return { error: "Maksimal 500 karakter." };
      if (kode === "emailmsmh" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teks)) {
        return { error: "Format email tidak valid. Contoh: nama@email.com" };
      }
      if (kode === "telpomsmh") {
        const digit = teks.replace(/[^\d]/g, "");
        if (digit.length < 9 || digit.length > 15) {
          return { error: "Nomor telepon harus 9–15 digit. Contoh: 081234567890" };
        }
      }
      if (kode === "nik" && teks.replace(/\D/g, "").length !== 16) {
        return { error: "NIK harus tepat 16 digit." };
      }
      if (kode === "npwp") {
        const digit = teks.replace(/\D/g, "");
        if (digit.length !== 15 && digit.length !== 16) {
          return { error: "NPWP harus 15 atau 16 digit." };
        }
      }
      return {};

    case "long_text":
      return teks.length > 5000 ? { error: "Maksimal 5000 karakter." } : {};

    default:
      return {};
  }
}

/**
 * Validasi silang antar-pertanyaan — cerminan withValidator() di
 * SubmitTracerStudyRequest. Corong pencarian kerja harus mengecil:
 * jumlah lamaran >= yang merespons >= yang mengundang wawancara.
 *
 * @param nilaiPerKode jawaban yang sudah dilepas awalan id kuesionernya
 * @returns error per KODE pertanyaan (bukan per id)
 */
export function validasiSilang(nilaiPerKode: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};

  const angka = (kode: string): number | null => {
    const v = nilaiPerKode[kode];
    if (kosong(v)) return null;
    const bersih = bersihkanAngka(String(v));
    return /^\d+$/.test(bersih) ? Number(bersih) : null;
  };

  const dilamar = angka("f6");
  const merespons = angka("f7");
  const wawancara = angka("f7a");

  if (dilamar !== null && merespons !== null && merespons > dilamar) {
    errors.f7 = `Tidak boleh lebih banyak daripada jumlah lamaran yang dikirim (${formatAngka(dilamar)}).`;
  }
  if (merespons !== null && wawancara !== null && wawancara > merespons) {
    errors.f7a = `Tidak boleh lebih banyak daripada jumlah perusahaan yang merespons (${formatAngka(merespons)}).`;
  }
  if (merespons === null && dilamar !== null && wawancara !== null && wawancara > dilamar) {
    errors.f7a = `Tidak boleh lebih banyak daripada jumlah lamaran yang dikirim (${formatAngka(dilamar)}).`;
  }

  return errors;
}
