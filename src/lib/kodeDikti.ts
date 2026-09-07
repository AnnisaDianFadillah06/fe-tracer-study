/**
 * Kode ladang resmi Kemdikbud pada kuesioner tracer study.
 *
 * Kementerian memberi setiap pertanyaan sebuah kode — `f8` untuk status
 * bekerja, `f505` untuk pendapatan, `f1761` untuk kompetensi etika saat lulus.
 * Kode itulah bahasa yang dipakai berkas ekspor DIKTI dan seluruh korespondensi
 * dengan kementerian, jadi menampilkannya di layar memungkinkan penyusun
 * kuesioner mencocokkan pertanyaan di aplikasi ini dengan lembar acuan
 * kementerian tanpa menghitung nomor urut satu per satu.
 *
 * Kodenya TIDAK perlu disimpan di tempat baru: `questionnaire_questions.code`
 * sudah memuatnya, dan di lapisan penyunting kode itu menjadi `id` pertanyaan
 * (lihat catatan pada toRendererQuestion di FormPreviewPage). Modul ini hanya
 * memutuskan mana `id` yang benar-benar kode kementerian dan mana yang sekadar
 * id lokal.
 */

/**
 * Ladang identitas — kode kementerian yang bukan berpola `f<angka>`.
 *
 * Nama-nama ini warisan format PDDIKTI lama (msmh = mahasiswa), jadi tidak ada
 * pola yang bisa dicocokkan; harus didaftar satu per satu.
 */
const KODE_IDENTITAS = new Set([
  "nimhsmsmh",
  "kdptimsmh",
  "kdpstmsmh",
  "nmmhsmsmh",
  "telpomsmh",
  "emailmsmh",
  "tahun_lulus",
  "nik",
  "npwp",
]);

/**
 * Pola kode kuesioner: huruf f diikuti angka, boleh disisipi satu huruf.
 *
 * Menangkap keempat bentuk yang dipakai kementerian: `f8`, `f502`, `f7a`
 * (varian), dan `f5a1` (sub-ladang berpasangan provinsi/kota).
 */
const POLA_KODE_LADANG = /^f\d+[a-z]?\d*$/i;

/**
 * Kembalikan kode kementerian bila `id` memang salah satunya, selain itu null.
 *
 * Pertanyaan yang dirakit sendiri lewat penyusun memakai id acak berawalan
 * `q-`, dan menampilkannya sebagai "kode" justru menyesatkan: pembacanya akan
 * mengira ada padanan di lembar kementerian padahal tidak ada. Karena itu yang
 * tidak cocok dikembalikan sebagai null, bukan apa adanya.
 */
export const kodeDikti = (id: string | undefined | null): string | null => {
  if (!id) return null;

  const kode = id.trim().toLowerCase();
  if (KODE_IDENTITAS.has(kode)) return kode;

  return POLA_KODE_LADANG.test(kode) ? kode : null;
};

export default kodeDikti;
