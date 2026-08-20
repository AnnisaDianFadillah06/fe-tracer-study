import api from "@/lib/api";
import { getStudentToken } from "@/hooks/auth/useStudentAuth";

/**
 * Perlindungan Data Pribadi (UU No. 27 Tahun 2022) — sisi klien.
 *
 * Seluruh pemanggilan di sini memakai token guard 'alumni' secara eksplisit.
 * Tanpa itu, interceptor di `src/lib/api.ts` mendahulukan token staf di
 * localStorage — sehingga staf yang membuka halaman kuesioner di peramban
 * yang sama akan mengirim persetujuan atas nama dirinya sendiri ke endpoint
 * yang menolaknya, dan pesan galatnya tidak akan menjelaskan apa pun.
 */

const alumniAuth = () => {
  const token = getStudentToken();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
};

// ─────────────────────────────────────────────────────────────
//  Persetujuan
// ─────────────────────────────────────────────────────────────

export interface ConsentState {
  granted: boolean;
  granted_at: string | null;
  granted_version: string | null;
  current_version: string;
  /** true = pernah menyetujui, tapi versi pemberitahuannya sudah berubah. */
  needs_renewal: boolean;
  retention_years: number;
}

export const fetchConsentState = async (): Promise<ConsentState> => {
  const { data } = await api.get("/alumni/me/consent", alumniAuth());
  return data.data;
};

export const grantConsent = async (): Promise<void> => {
  await api.post("/alumni/me/consent", null, alumniAuth());
};

export const withdrawConsent = async (): Promise<string> => {
  const { data } = await api.delete("/alumni/me/consent", alumniAuth());
  return data.message;
};

/**
 * Apakah sebuah galat berarti "persetujuan belum ada", bukan "Anda tidak
 * berhak".
 *
 * Diperiksa lewat kode mesin dari server, bukan lewat pencocokan kalimat.
 * Mencocokkan kalimat membuat setiap perbaikan ejaan di sisi server
 * diam-diam mematahkan sisi klien.
 */
export const isConsentRequiredError = (err: unknown): boolean => {
  const response = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
  return response?.status === 451 || response?.data?.error === "consent_required";
};

// ─────────────────────────────────────────────────────────────
//  Portal "Data Saya"
// ─────────────────────────────────────────────────────────────

export interface MyDataProfile {
  nim: string;
  name: string;
  email: string | null;
  phone: string | null;
  nik: string | null;
  npwp: string | null;
  program_name: string | null;
  program_degree: string | null;
  jurusan: string | null;
  entry_year: number | null;
  graduation_year: number | null;
}

export interface MyDataRetention {
  years: number;
  until_year: number | null;
  legal_basis: string[];
}

export interface MyDataResponse {
  id: number;
  status: string;
  created_at: string;
  questionnaire_title: string | null;
}

export interface MyDataActivity {
  action: string;
  actor: string;
  actor_type: string;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface MyData {
  profile: MyDataProfile;
  consent: ConsentState;
  retention: MyDataRetention;
  responses: MyDataResponse[];
  activity: MyDataActivity[];
}

export const fetchMyData = async (): Promise<MyData> => {
  const { data } = await api.get("/alumni/me", alumniAuth());
  return data.data;
};

// ─────────────────────────────────────────────────────────────
//  Permintaan hak subjek data
// ─────────────────────────────────────────────────────────────

export type DataRequestType = "correction" | "erasure" | "objection";

export interface DataRequest {
  id: number;
  type: DataRequestType;
  message: string;
  status: "pending" | "in_review" | "fulfilled" | "rejected";
  response: string | null;
  handled_at: string | null;
  created_at: string;
}

export const DATA_REQUEST_LABELS: Record<DataRequestType, string> = {
  correction: "Perbaikan data",
  erasure: "Penghapusan data",
  objection: "Keberatan atas pemrosesan",
};

export const DATA_REQUEST_STATUS_LABELS: Record<DataRequest["status"], string> = {
  pending: "Menunggu ditinjau",
  in_review: "Sedang ditinjau",
  fulfilled: "Dikabulkan",
  rejected: "Ditolak",
};

export const fetchMyRequests = async (): Promise<DataRequest[]> => {
  const { data } = await api.get("/alumni/me/requests", alumniAuth());
  return data.data;
};

export const submitDataRequest = async (
  type: DataRequestType,
  message: string,
): Promise<void> => {
  await api.post("/alumni/me/requests", { type, message }, alumniAuth());
};

/**
 * Label perbuatan pada jejak audit.
 *
 * Dipetakan ke bahasa yang dimengerti alumni, bukan ke nama teknisnya.
 * "alumni.self_viewed" tidak berarti apa pun bagi pemilik datanya; yang ia
 * perlu tahu adalah bahwa dirinya sendiri yang membuka halaman itu.
 */
export const ACTIVITY_LABELS: Record<string, string> = {
  "consent.granted": "Anda memberikan persetujuan",
  "consent.withdrawn": "Anda menarik persetujuan",
  "alumni.created": "Data Anda ditambahkan petugas",
  "alumni.updated": "Data Anda diubah petugas",
  "alumni.deleted": "Data Anda dihapus petugas",
  "alumni.self_viewed": "Anda membuka halaman Data Saya",
  "alumni.credentials_issued": "Kata sandi Anda diterbitkan ulang",
  "auth.alumni_login": "Anda masuk ke sistem",
  "auth.alumni_login_failed": "Percobaan masuk gagal pada akun Anda",
  "export.ministry": "Data Anda ikut terekspor untuk pelaporan",
  "dsr.submitted": "Anda mengajukan permintaan",
  "dsr.fulfilled": "Permintaan Anda dikabulkan",
  "dsr.rejected": "Permintaan Anda ditolak",
  "dsr.in_review": "Permintaan Anda mulai ditinjau",
};

export const describeActivity = (action: string): string =>
  ACTIVITY_LABELS[action] ?? action;
