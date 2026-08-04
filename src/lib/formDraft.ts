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
const VERSI = 1;
/** Draf lebih tua dari ini dianggap basi dan diabaikan. */
const KEDALUWARSA_HARI = 30;

export interface DraftPengisian {
  versi: number;
  /** Milidetik epoch saat draf terakhir disimpan. */
  disimpanPada: number;
  /** Menjaga draf tidak dipulihkan ke susunan kuesioner yang sudah berubah. */
  sidikKuesioner: string;
  jawaban: Record<string, unknown>;
  bagianAktif: number;
}

function kunci(nim: string): string {
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
export function sidikKuesioner(idPertanyaan: string[]): string {
  return `${idPertanyaan.length}:${[...idPertanyaan].sort().join(",")}`;
}

/** Simpan draf. Gagal menyimpan tidak boleh mengganggu pengisian. */
export function simpanDraft(
  nim: string,
  jawaban: Record<string, unknown>,
  bagianAktif: number,
  sidik: string,
): void {
  if (!nim) return;

  try {
    const isi: DraftPengisian = {
      versi: VERSI,
      disimpanPada: Date.now(),
      sidikKuesioner: sidik,
      jawaban,
      bagianAktif,
    };
    localStorage.setItem(kunci(nim), JSON.stringify(isi));
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
export function bacaDraft(nim: string, sidik: string): DraftPengisian | null {
  if (!nim) return null;

  try {
    const mentah = localStorage.getItem(kunci(nim));
    if (!mentah) return null;

    const draft = JSON.parse(mentah) as DraftPengisian;

    if (draft?.versi !== VERSI) return null;
    if (!draft.jawaban || typeof draft.jawaban !== "object") return null;

    const umurHari = (Date.now() - (draft.disimpanPada ?? 0)) / 86_400_000;
    if (umurHari > KEDALUWARSA_HARI) {
      hapusDraft(nim);
      return null;
    }

    if (draft.sidikKuesioner !== sidik) {
      // Kuesionernya sudah berubah sejak draf dibuat. Lebih aman mengulang
      // daripada memasangkan jawaban ke pertanyaan yang salah.
      hapusDraft(nim);
      return null;
    }

    return draft;
  } catch {
    hapusDraft(nim);
    return null;
  }
}

export function hapusDraft(nim: string): void {
  if (!nim) return;
  try {
    localStorage.removeItem(kunci(nim));
  } catch {
    /* diabaikan */
  }
}

/** Hapus seluruh draf milik siapa pun — dipakai saat alumni keluar sesi. */
export function hapusSemuaDraft(): void {
  try {
    const kunciTerhapus: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${PREFIX}:`)) kunciTerhapus.push(k);
    }
    kunciTerhapus.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* diabaikan */
  }
}

/** Berapa banyak pertanyaan yang sudah terisi pada draf. */
export function jumlahTerisi(jawaban: Record<string, unknown>): number {
  return Object.values(jawaban).filter((v) => {
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
}

/** Keterangan waktu yang enak dibaca, mis. "3 jam lalu". */
export function waktuRelatif(epochMs: number): string {
  const detik = Math.max(0, Math.floor((Date.now() - epochMs) / 1000));
  if (detik < 60) return "beberapa detik lalu";

  const menit = Math.floor(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;

  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;

  const hari = Math.floor(jam / 24);
  return hari === 1 ? "kemarin" : `${hari} hari lalu`;
}
