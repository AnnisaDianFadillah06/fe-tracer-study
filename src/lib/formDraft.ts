/**
 * Penyimpanan sementara pengisian kuesioner alumni di localStorage.
 *
 * Kuesioner tracer study panjang dan harus diselesaikan dalam satu sesi —
 * belum ada status draf di sisi server (responses.status seluruhnya bernilai
 * "submitted"). Kalau alumni tidak sengaja menutup tab, kehabisan baterai,
 * atau sesinya terputus, seluruh isian hilang dan harus diulang dari nol.
 *
 * Modul ini menahan isian di peramban sampai kuesioner benar-benar terkirim.
 * Ini BUKAN pengganti fitur draf di server: datanya hanya ada di perangkat
 * itu, tidak berpindah antar-peramban, dan hilang bila cache dibersihkan.
 *
 * PERTIMBANGAN PRIVASI
 * --------------------
 * Jawaban memuat data pribadi (NIK, NPWP, pendapatan). Karena itu:
 *   - Kunci penyimpanan disertai NIM, sehingga isian alumni lain di komputer
 *     bersama tidak saling terbaca.
 *   - Draf dihapus segera setelah pengiriman berhasil.
 *   - Draf kedaluwarsa otomatis setelah 30 hari.
 *   - Draf juga dihapus saat alumni keluar dari sesinya.
 */

const PREFIX = "tracer_form_draft";
const VERSION = 1;
/** Draf lebih tua dari ini dianggap basi dan diabaikan. */
const EXPIRY_DAYS = 30;

export interface FormDraft {
  version: number;
  /** Milidetik epoch saat draf terakhir disimpan. */
  savedAt: number;
  /** Menjaga draf tidak dipulihkan ke susunan kuesioner yang sudah berubah. */
  fingerprint: string;
  answers: Record<string, unknown>;
  currentSection: number;
}

function storageKey(nim: string): string {
  return `${PREFIX}:${nim}`;
}

/**
 * Sidik jari susunan kuesioner yang sedang diisi.
 *
 * Bila Tim Tracer mengubah kuesioner (menambah, menghapus, atau mengganti
 * pertanyaan) selagi ada draf tersimpan, memulihkan jawaban lama bisa
 * memasangkan jawaban ke pertanyaan yang keliru. Sidik ini membuat draf
 * lama diabaikan begitu susunannya berbeda.
 */
export function questionnaireFingerprint(questionIds: string[]): string {
  return `${questionIds.length}:${[...questionIds].sort((a, b) => a.localeCompare(b)).join(",")}`;
}

/** Simpan draf. Gagal menyimpan tidak boleh mengganggu pengisian. */
export function saveDraft(
  nim: string,
  answers: Record<string, unknown>,
  currentSection: number,
  fingerprint: string,
): void {
  if (!nim) return;

  try {
    const payload: FormDraft = {
      version: VERSION,
      savedAt: Date.now(),
      fingerprint,
      answers,
      currentSection,
    };
    localStorage.setItem(storageKey(nim), JSON.stringify(payload));
  } catch (e) {
    // Kuota penuh atau localStorage diblokir (mode privat pada sebagian
    // peramban). Diabaikan diam-diam — kehilangan draf jauh lebih ringan
    // daripada menggagalkan pengisian yang sedang berjalan.
    console.warn("[formDraft] gagal menyimpan draf:", e);
  }
}

/**
 * Baca draf yang masih berlaku.
 *
 * Mengembalikan null bila tidak ada, rusak, versinya beda, sudah lewat masa
 * berlaku, atau susunan kuesionernya sudah berubah.
 */
export function readDraft(nim: string, fingerprint: string): FormDraft | null {
  if (!nim) return null;

  try {
    const raw = localStorage.getItem(storageKey(nim));
    if (!raw) return null;

    const draft = JSON.parse(raw) as FormDraft;

    if (draft?.version !== VERSION) return null;
    if (!draft.answers || typeof draft.answers !== "object") return null;

    const ageInDays = (Date.now() - (draft.savedAt ?? 0)) / 86_400_000;
    if (ageInDays > EXPIRY_DAYS) {
      clearDraft(nim);
      return null;
    }

    if (draft.fingerprint !== fingerprint) {
      // Kuesionernya sudah berubah sejak draf dibuat. Lebih aman mengulang
      // daripada memasangkan jawaban ke pertanyaan yang salah.
      clearDraft(nim);
      return null;
    }

    return draft;
  } catch {
    clearDraft(nim);
    return null;
  }
}

export function clearDraft(nim: string): void {
  if (!nim) return;
  try {
    localStorage.removeItem(storageKey(nim));
  } catch {
    /* diabaikan */
  }
}

/** Hapus seluruh draf milik siapa pun — dipakai saat alumni keluar sesi. */
export function clearAllDrafts(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${PREFIX}:`)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* diabaikan */
  }
}

/** Berapa banyak pertanyaan yang sudah terisi pada draf. */
export function countAnswered(answers: Record<string, unknown>): number {
  return Object.values(answers).filter((v) => {
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
}

/** Keterangan waktu yang enak dibaca, mis. "3 jam lalu". */
export function relativeTime(epochMs: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - epochMs) / 1000));
  if (seconds < 60) return "beberapa detik lalu";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "kemarin" : `${days} hari lalu`;
}
