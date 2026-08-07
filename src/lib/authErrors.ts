/**
 * Penerjemah galat masuk — satu tempat untuk dua jalur.
 *
 * Halaman masuk mencoba rute staf lebih dulu, lalu jatuh ke rute alumni.
 * Keduanya melempar galat dari lapisan yang berbeda (AuthContext dan
 * useStudentAuth), dan tanpa satu penerjemah bersama keduanya akan
 * menampilkan pesan yang berbeda untuk keadaan yang sama.
 *
 * Status ikut dibawa keluar karena pemanggil perlu MEMBEDAKAN, bukan sekadar
 * menampilkan: galat 429 pada rute staf tidak boleh diteruskan ke percobaan
 * rute alumni — lihat Login.tsx.
 */

export interface LoginError extends Error {
  /** Status HTTP dari server; tidak ada bila permintaannya sendiri gagal. */
  status?: number;
  /** Sisa detik sebelum boleh mencoba lagi (hanya pada 429). */
  retryAfter?: number;
}

/**
 * Bentuk galat masuk yang seragam dari galat axios apa pun.
 *
 * Sisa waktu 429 dibaca dari BADAN balasan (`retry_after`), bukan dari header
 * `Retry-After`. Header itu tidak termasuk daftar aman CORS dan tidak
 * diekspos server, sehingga peramban tidak bisa membacanya sama sekali —
 * lewat curl kelihatan, lewat aplikasi tidak.
 */
export function toLoginError(err: any, fallback: string): LoginError {
  const status = err?.response?.status as number | undefined;
  const body = err?.response?.data;

  if (status === 429) {
    const retryAfter = Number(body?.retry_after) || 60;
    const error = new Error(
      body?.message ??
        `Terlalu banyak percobaan masuk. Silakan coba lagi dalam ${retryAfter} detik.`,
    ) as LoginError;
    error.status = status;
    error.retryAfter = retryAfter;
    return error;
  }

  const message =
    body?.errors?.email?.[0] ??
    body?.message ??
    fallback;

  const error = new Error(message) as LoginError;
  error.status = status;
  return error;
}

/** Benar bila galatnya berasal dari pembatas laju. */
export function isRateLimited(err: any): boolean {
  return err?.status === 429 || err?.response?.status === 429;
}
