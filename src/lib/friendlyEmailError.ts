/**
 * Menerjemahkan pesan gagal-kirim email dari backend (istilah teknis DNS/SMTP,
 * mis. "tidak ada MX/A record") menjadi kalimat yang bisa dipahami staf
 * non-teknis, tanpa membuang pesan aslinya -- dipakai di
 * EmailBulkActionPanel dan tooltip "Email Terakhir" pada EmailManagementPage.
 *
 * Pencocokan pola, bukan kode error terstruktur, karena backend saat ini
 * mengembalikan `error_message` sebagai string bebas (lihat FailedEmailItem).
 */

interface FriendlyEmailError {
  friendly: string;
  /** Pesan asli dari backend -- null kalau memang tidak ada. */
  raw: string | null;
}

const PATTERNS: Array<{ test: RegExp; friendly: string }> = [
  {
    test: /mx\s*\/?\s*a record/i,
    friendly: "Alamat email ini sepertinya salah ketik atau sudah tidak aktif.",
  },
  {
    test: /mailbox.*(full|penuh)|552/i,
    friendly: "Kotak masuk penerima sudah penuh, email tidak bisa masuk.",
  },
  {
    test: /(invalid|tidak valid|unknown user|user unknown|tidak ditemukan|550|does not exist|tidak ada)/i,
    friendly: "Alamat email tidak ditemukan atau salah ketik.",
  },
  {
    test: /(timeout|connection refused|could not connect|gagal terhubung|tidak dapat terhubung)/i,
    friendly: "Gagal terhubung ke penyedia email penerima. Coba kirim ulang beberapa saat lagi.",
  },
  {
    test: /(blocked|blacklist|spam|ditolak)/i,
    friendly: "Email ditolak oleh sistem penerima (kemungkinan terdeteksi sebagai spam).",
  },
];

export function getFriendlyEmailError(raw: string | null | undefined): FriendlyEmailError {
  const trimmed = raw?.trim() || null;
  if (!trimmed) return { friendly: "Email gagal terkirim.", raw: null };

  const matched = PATTERNS.find((p) => p.test.test(trimmed));
  return {
    friendly: matched?.friendly ?? "Email gagal terkirim ke alamat ini.",
    raw: trimmed,
  };
}
