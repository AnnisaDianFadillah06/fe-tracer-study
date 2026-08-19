/**
 * Identitas institusi pemakai SmartTracer.
 *
 * SmartTracer dipasang satu kali untuk satu perguruan tinggi. Seluruh nama,
 * alamat, dan kontak yang tampil di antarmuka dibaca dari sini, bukan
 * ditulis langsung di komponen — supaya pemasangan di PT mana pun cukup
 * mengubah berkas `.env`, tanpa menyentuh kode.
 *
 * Kenapa variabel lingkungan, bukan endpoint API: halaman muka, halaman
 * login, dan halaman publik harus tampil benar SEBELUM ada permintaan API
 * mana pun, dan nilainya tidak berubah selama satu pemasangan berjalan.
 *
 * Bawaannya sengaja netral. POLBAN adalah contoh isian di `.env.example`,
 * bukan nilai bawaan.
 */

/** Ambil VITE_* kalau ada isinya; kalau kosong atau tidak diset, pakai cadangan. */
const env = (key: string, fallback: string): string => {
  const raw = import.meta.env[key as keyof ImportMetaEnv] as string | undefined;
  const value = raw?.trim();
  return value ? value : fallback;
};

export const institution = {
  /** Nama resmi lengkap. Dipakai di hak cipta dan deskripsi halaman publik. */
  name: env("VITE_INSTITUTION_NAME", "Perguruan Tinggi"),
  /** Akronim untuk ruang sempit: bawah logo, badge, sidebar. */
  shortName: env("VITE_INSTITUTION_SHORT_NAME", "SmartTracer"),
  /** Domain surel institusi. Dipakai merakit contoh alamat di placeholder input. */
  domain: env("VITE_INSTITUTION_DOMAIN", "kampus.ac.id"),
  /** Subdomain tempat sistem ini dipasang. Hanya tampil sebagai ilustrasi di hero. */
  appDomain: env("VITE_INSTITUTION_APP_DOMAIN", "tracer-study.kampus.ac.id"),
  /** Surel pengelola tracer study yang dipublikasikan ke alumni. */
  email: env("VITE_INSTITUTION_EMAIL", "tracerstudy@kampus.ac.id"),
  /** Telepon pengelola. Kosongkan di .env untuk menyembunyikan barisnya. */
  phone: env("VITE_INSTITUTION_PHONE", ""),
  /** Alamat surat. Kosongkan di .env untuk menyembunyikan barisnya. */
  address: env("VITE_INSTITUTION_ADDRESS", ""),
  /** Unit yang bertanggung jawab. Nama jabatannya beda-beda antar bentuk PT. */
  unit: env("VITE_INSTITUTION_UNIT", "Unit Penjaminan Mutu"),
} as const;

/** Contoh alamat surel staf, mis. "nama@kampus.ac.id". */
export const staffEmailPlaceholder = `nama@${institution.domain}`;

/** Contoh alamat surel alumni, mis. "nim@student.kampus.ac.id". */
export const studentEmailPlaceholder = `nim@student.${institution.domain}`;

/**
 * Nama pemilik metadata berkas Excel yang diunduh pengguna.
 * Ikut tertanam di properti dokumen, jadi jangan biarkan menyebut PT tertentu
 * kalau konfigurasinya belum diisi.
 */
export const workbookCreator = `Tracer Study ${institution.shortName}`;
