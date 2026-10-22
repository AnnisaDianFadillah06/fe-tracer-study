import api from "@/lib/api";

/**
 * Impor jawaban tracer study berformat PDDikti ("Data Kementerian").
 * BE: /api/pddikti-imports — validasi dan impor berjalan di queue worker,
 * statusnya dipoll lewat getPddiktiImport() untuk progress bar.
 */

export type PddiktiImportStatus =
  | "validating"
  | "validated"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled"
  | "rolled_back";

export type PddiktiIssueLevel = "error" | "warning" | "skipped";

export interface PddiktiIssue {
  row: number;
  nim: string | null;
  level: PddiktiIssueLevel;
  column: string;
  message: string;
}

export interface PddiktiCohort {
  year: number;
  questionnaire: string | null;
  valid: number;
  skipped: number;
  error: number;
}

export interface PddiktiImport {
  id: number;
  status: PddiktiImportStatus;
  original_name: string;
  total_rows: number;
  processed_rows: number;
  progress: number;
  valid_rows: number;
  error_rows: number;
  skipped_rows: number;
  warning_count: number;
  imported_rows: number;
  cohorts: PddiktiCohort[];
  issues: PddiktiIssue[];
  issues_total: number;
  issues_page: number;
  issues_per_page: number;
  error_message: string | null;
}

/** Status yang masih berjalan di queue — selama ini FE terus mempoll. */
export const isRunning = (status: PddiktiImportStatus | undefined) =>
  status === "validating" || status === "importing";

const BASE = "/pddikti-imports";

export async function uploadPddiktiImport(file: File): Promise<PddiktiImport> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(BASE, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
  });
  return res.data.data;
}

export async function getPddiktiImport(
  id: number,
  params: { issues_page?: number; level?: PddiktiIssueLevel } = {},
): Promise<PddiktiImport> {
  const res = await api.get(`${BASE}/${id}`, { params });
  return res.data.data;
}

export async function confirmPddiktiImport(id: number): Promise<PddiktiImport> {
  const res = await api.post(`${BASE}/${id}/confirm`);
  return res.data.data;
}

/** Sebelum impor: menutup pratinjau. Sesudah impor: menghapus seluruh data yang dibawanya. */
export async function cancelPddiktiImport(id: number): Promise<PddiktiImport> {
  const res = await api.post(`${BASE}/${id}/cancel`);
  return res.data.data;
}

export async function downloadPddiktiTemplate(): Promise<void> {
  await download(`${BASE}/template`, "templat-impor-pddikti.xlsx");
}

export async function downloadPddiktiErrors(id: number): Promise<void> {
  await download(`${BASE}/${id}/errors`, `galat-impor-${id}.xlsx`);
}

async function download(url: string, filename: string): Promise<void> {
  const res = await api.get(url, { responseType: "blob", timeout: 120000 });
  const href = URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

/** Pesan galat dari BE (validasi Laravel atau BusinessException), atau pesan umum. */
export function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  const firstFieldError = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined;
  return firstFieldError ?? data?.message ?? fallback;
}
