/**
 * Kosakata akademik dan pelabelan jenjang.
 *
 * PERAN BERKAS INI SUDAH TURUN. Sejak jenjang jadi master data, daftarnya
 * diambil dari endpoint `/degrees` lewat `useDegrees()`. Yang tersisa di sini
 * dua hal:
 *
 *   1. `DEGREES` — daftar bawaan, dipakai sebagai cadangan saat permintaan ke
 *      peladen gagal, supaya form pembuatan prodi tidak berubah jadi dropdown
 *      kosong hanya karena jaringan sedang putus. Jangan dipakai sebagai
 *      sumber utama di layar mana pun.
 *   2. `degreeLabel` dan `degreeColor` — pelabelan dan pewarnaan, murni
 *      tampilan.
 *
 * Kenapa daftar jenjang tidak diambil dari endpoint `filter-meta`: endpoint
 * itu hanya mengembalikan jenjang yang SUDAH punya data di data warehouse.
 * Dropdown untuk MEMBUAT prodi butuh semua jenjang yang BOLEH ada, kalau
 * tidak prodi S3 pertama tak akan pernah bisa dibuat karena jenjangnya belum
 * muncul di data. Dua kebutuhan yang berbeda, dua sumber yang berbeda —
 * `filter-meta` untuk menyaring, `/degrees` untuk membuat.
 */

/**
 * Daftar bawaan jenjang, urut dari terendah. Selaras dengan PDDIKTI dan
 * dengan `config/academic.php` di peladen, yang jadi isi awal tabel `degrees`.
 */
export const DEGREES = [
  "D1",
  "D2",
  "D3",
  "D4",
  "S1",
  "Profesi",
  "Spesialis",
  "S2",
  "S2 Terapan",
  "S3",
  "S3 Terapan",
] as const;

export type Degree = (typeof DEGREES)[number];

/**
 * Label panjang untuk sumbu grafik dan legenda, tempat "D-III" lebih terbaca
 * daripada "D3". Jenjang yang tidak terdaftar memakai kodenya apa adanya.
 */
const LONG_LABELS: Partial<Record<Degree, string>> = {
  D1: "D-I",
  D2: "D-II",
  D3: "D-III",
  D4: "D-IV",
  S1: "S-1",
  S2: "S-2",
  S3: "S-3",
};

export const degreeLabel = (code: string): string =>
  LONG_LABELS[code as Degree] ?? code;

/**
 * Warna per jenjang untuk grafik multi-garis. Diambil berurutan supaya
 * jenjang yang sama selalu berwarna sama di seluruh dashboard.
 */
export const degreeColor = (code: string): string => {
  const palette = [
    "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
    "#14b8a6", "#6366f1", "#ef4444", "#84cc16", "#a855f7", "#06b6d4",
  ];
  const i = DEGREES.indexOf(code as Degree);
  return palette[(i < 0 ? 0 : i) % palette.length];
};
