/**
 * Model seleksi hybrid untuk halaman "Manajemen Email" — ala Gmail: pilih
 * per-baris di halaman yang sedang tampil, ATAU "pilih semua N sesuai
 * filter" (lintas seluruh halaman) dengan pengecualian manual per-baris.
 *
 * State UI (di sini) SENGAJA berbeda dari payload yang dikirim ke backend
 * (EmailSelectionPayload) — dikonversi saat submit lewat
 * useEmailManagement::selectionPayload. Backend (AlumniSelectionResolver)
 * hanya kenal dua bentuk: daftar NIM eksplisit, atau filter+pengecualian.
 */
export type EmailSelectionState =
  | { mode: "page"; selected: Set<string> }
  | { mode: "all-filtered"; excluded: Set<string> };

export type EmailSelectionPayload =
  | { nims: string[] }
  | {
      graduation_year?: number;
      jurusan?: string;
      program_id?: number;
      excluded_nims?: string[];
    };

export type FailedEmailItem = {
  nim: string;
  name: string;
  email: string;
  error_message: string;
};

export type EmailBulkActionKind = "account" | "reminder";

export type EmailBulkProgress = { done: number; remaining: number };

export type EmailBatchStatus = {
  total: number;
  sent: number;
  failed: number;
  canceled: number;
  pending: number;
};

export type EmailBulkResult = {
  sent: number;
  failed: number;
  canceled: number;
  failedItems: FailedEmailItem[];
};
