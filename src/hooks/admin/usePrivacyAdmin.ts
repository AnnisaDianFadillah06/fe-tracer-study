import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

/**
 * Sisi staf dari fitur perlindungan data pribadi.
 *
 * Dua sumber data, keduanya di balik `role:head_tracer` pada peladen:
 * antrean permintaan hak subjek data, dan jejak audit.
 *
 * Berbeda dari `src/lib/privacy.ts` yang memakai token guard alumni, berkas
 * ini memakai token staf biasa — jadi tidak perlu menyematkan header sendiri
 * dan cukup mengandalkan pencegat bawaan pada `src/lib/api.ts`.
 */

// ═══════════════════════════════════════════════════════════
//  Permintaan hak subjek data
// ═══════════════════════════════════════════════════════════

export type DataRequestType = "correction" | "erasure" | "objection";
export type DataRequestStatus = "pending" | "in_review" | "fulfilled" | "rejected";

export interface DataSubjectRequest {
  id: number;
  alumni_id: number;
  alumni_nim: string | null;
  alumni_name: string | null;
  type: DataRequestType;
  message: string;
  status: DataRequestStatus;
  response: string | null;
  handled_by: number | null;
  handled_by_label: string | null;
  handled_at: string | null;
  created_at: string;
  updated_at: string;
}

export const REQUEST_TYPE_LABELS: Record<DataRequestType, string> = {
  correction: "Perbaikan data",
  erasure: "Penghapusan data",
  objection: "Keberatan atas pemrosesan",
};

export const REQUEST_STATUS_LABELS: Record<DataRequestStatus, string> = {
  pending: "Menunggu ditinjau",
  in_review: "Sedang ditinjau",
  fulfilled: "Dikabulkan",
  rejected: "Ditolak",
};

/**
 * Keterangan yang ditampilkan pada dialog jawaban.
 *
 * Ditulis di sini, bukan di komponen, supaya kalimat yang menerangkan akibat
 * sebuah keputusan hidup berdampingan dengan daftar keputusannya — kalau
 * terpisah, salah satunya akan tertinggal saat yang lain berubah.
 */
export const REQUEST_TYPE_HINTS: Record<DataRequestType, string> = {
  correction:
    "Perbaikan data akademik menggeser angka penyerapan lulusan program studi terkait. Pastikan perubahannya benar sebelum dikabulkan.",
  erasure:
    "Sebagian data alumni disimpan atas dasar kewajiban pelaporan, bukan atas dasar persetujuan — bagian itu tidak dapat dihapus meski diminta. Timbang mana yang boleh hilang sebelum memutuskan.",
  objection:
    "Keberatan tidak selalu berarti penghapusan. Pertimbangkan pembatasan pemrosesan sebagai jalan tengah, dan jelaskan hasilnya pada jawaban.",
};

export const useDataSubjectRequests = (status?: DataRequestStatus | "all") => {
  const result = useQuery({
    queryKey: ["data-subject-requests", status ?? "all"],
    queryFn: async () => {
      const { data } = await api.get("/admin/data-subject-requests", {
        params: status && status !== "all" ? { status } : undefined,
      });
      return (data.data ?? []) as DataSubjectRequest[];
    },
  });

  return {
    requests: result.data ?? [],
    loading: result.isLoading,
    // Dibedakan dari `loading` dengan sengaja. `isLoading` hanya benar saat
    // belum ada data sama sekali; begitu ada data lama yang masih tampil,
    // pengambilan berikutnya TIDAK menyalakannya. Tanpa `fetching`, mengganti
    // saringan terasa seperti tidak terjadi apa-apa.
    fetching: result.isFetching,
    error: result.error,
    refetch: result.refetch,
  };
};

export const useResolveDataSubjectRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: number;
      status: Exclude<DataRequestStatus, "pending">;
      response?: string | null;
    }) => {
      const { data } = await api.patch(`/admin/data-subject-requests/${payload.id}`, {
        status: payload.status,
        response: payload.response ?? null,
      });
      return data;
    },
    onSuccess: () => {
      // Seluruh varian saringan ikut disegarkan, bukan hanya yang sedang
      // dibuka: menjawab satu permintaan memindahkannya ANTAR saringan, jadi
      // daftar "Menunggu ditinjau" yang tidak ikut disegarkan akan tetap
      // menampilkan baris yang sudah tidak lagi menunggu.
      queryClient.invalidateQueries({ queryKey: ["data-subject-requests"] });
    },
  });
};

// ═══════════════════════════════════════════════════════════
//  Jejak audit
// ═══════════════════════════════════════════════════════════

export type AuditActorType = "user" | "alumni" | "system";

export interface AuditLogEntry {
  id: number;
  actor_type: AuditActorType;
  actor_id: number | null;
  actor_label: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  subject_alumni_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  actor_type?: AuditActorType;
  subject_alumni_id?: number;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
}

export const ACTOR_TYPE_LABELS: Record<AuditActorType, string> = {
  user: "Staf",
  alumni: "Alumni",
  system: "Sistem",
};

/**
 * Perbuatan yang dikenal, untuk mengisi penyaring.
 *
 * Awalan sebelum titik dipakai sebagai nilai saringan karena peladen
 * mencocokkannya sebagai awalan — memilih "consent" menangkap pemberian
 * sekaligus penarikan persetujuan, yang memang selalu ditelusuri bersama.
 */
export const AUDIT_ACTION_GROUPS: { value: string; label: string }[] = [
  { value: "consent", label: "Persetujuan" },
  { value: "alumni", label: "Data alumni" },
  { value: "auth", label: "Masuk & percobaan masuk" },
  { value: "export", label: "Ekspor data" },
  { value: "dsr", label: "Permintaan hak subjek data" },
];

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "consent.granted": "Persetujuan diberikan",
  "consent.withdrawn": "Persetujuan ditarik",
  "alumni.created": "Data alumni ditambahkan",
  "alumni.updated": "Data alumni diubah",
  "alumni.deleted": "Data alumni dihapus",
  "alumni.imported": "Impor massal alumni",
  "alumni.self_viewed": "Alumni membuka Data Saya",
  "alumni.credentials_issued": "Kredensial alumni diterbitkan",
  "auth.login": "Staf masuk",
  "auth.login_failed": "Percobaan masuk staf gagal",
  "auth.alumni_login": "Alumni masuk",
  "auth.alumni_login_failed": "Percobaan masuk alumni gagal",
  "export.ministry": "Ekspor berformat kementerian",
  "dsr.submitted": "Permintaan diajukan",
  "dsr.in_review": "Permintaan mulai ditinjau",
  "dsr.fulfilled": "Permintaan dikabulkan",
  "dsr.rejected": "Permintaan ditolak",
};

/** Perbuatan tak dikenal ditampilkan apa adanya, bukan disembunyikan. */
export const describeAuditAction = (action: string): string =>
  AUDIT_ACTION_LABELS[action] ?? action;

export const useAuditLogs = (filters: AuditLogFilters) => {
  const result = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const { data } = await api.get("/admin/audit-logs", { params: filters });
      const page = data.data;
      return {
        entries: (page?.data ?? []) as AuditLogEntry[],
        total: page?.total ?? 0,
        currentPage: page?.current_page ?? 1,
        lastPage: page?.last_page ?? 1,
      };
    },
    // Halaman sebelumnya tetap tampil selama halaman berikutnya diambil,
    // supaya tabel tidak berkedip kosong tiap kali penyaring digeser.
    placeholderData: (prev) => prev,
  });

  return {
    entries: result.data?.entries ?? [],
    total: result.data?.total ?? 0,
    currentPage: result.data?.currentPage ?? 1,
    lastPage: result.data?.lastPage ?? 1,
    loading: result.isLoading,
    // Justru di halaman ini `fetching` paling penting: placeholderData di atas
    // menahan hasil lama tetap tampil selama yang baru diambil, sehingga tanpa
    // penanda ini pengguna melihat tabel yang tidak berubah dan menyimpulkan
    // saringannya tidak berfungsi.
    fetching: result.isFetching,
    error: result.error,
  };
};
