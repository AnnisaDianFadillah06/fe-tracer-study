import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

/**
 * Ringkasan pekerjaan yang menunggu tindakan pengguna yang sedang login.
 *
 * Angkanya dihitung ulang oleh peladen dari antrean aslinya, bukan disimpan
 * sebagai daftar notifikasi. Konsekuensinya disengaja: tidak ada status
 * "sudah dibaca" — lonceng padam sendiri begitu antreannya kosong, dan tidak
 * pernah menyala untuk sesuatu yang sudah diproses lewat halamannya.
 *
 * Cakupan per peran ditentukan peladen (lihat NotificationController), jadi
 * berkas ini tidak perlu tahu siapa boleh melihat apa; peran yang tidak
 * berkepentingan cukup menerima nol.
 */

export interface NotificationSummary {
  approvals_pending: number;
  data_subject_requests_pending: number;
  total: number;
}

const EMPTY: NotificationSummary = {
  approvals_pending: 0,
  data_subject_requests_pending: 0,
  total: 0,
};

/** Selang penyegaran. Antrean persetujuan bergerak dalam hitungan menit, bukan detik. */
const REFETCH_INTERVAL_MS = 60_000;

export function useNotifications() {
  const query = useQuery({
    queryKey: ["notifications-summary"],
    queryFn: async () => {
      const { data } = await api.get("/notifications/summary");
      return (data?.data ?? EMPTY) as NotificationSummary;
    },
    refetchInterval: REFETCH_INTERVAL_MS,
    // Menyegarkan saat tab kembali dibuka: kasus paling lazim adalah petugas
    // meninggalkan dasbor terbuka lalu kembali, dan angka basi di lonceng
    // lebih menyesatkan daripada tidak ada lonceng sama sekali.
    refetchOnWindowFocus: true,
    // Kegagalannya tidak layak mengganggu siapa pun: lonceng hanyalah jalan
    // pintas, halamannya tetap bisa dibuka lewat menu.
    retry: 1,
  });

  return {
    summary: query.data ?? EMPTY,
    isLoading: query.isLoading,
  };
}
