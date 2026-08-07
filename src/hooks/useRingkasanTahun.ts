import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export interface YearSummary {
  tahun: number;
  alumni: number;
  sudah_mengisi: number;
  belum_mengisi: number;
  response_rate: number;
  kuesioner: number;
  /** Jumlah kontak penilai milik angkatan ini. Dipakai kartu di Kontak Penilai. */
  kontak: number;
  /** Tahun pelaksanaan tracer yang menyasar angkatan ini. Kosong bila belum ada. */
  periode: number[];
}

/**
 * Ringkasan agregat per tahun lulusan untuk halaman kartu tahun.
 *
 * Payload-nya kecil (~700 byte untuk 6 tahun) dan cakupannya sudah dibatasi
 * server sesuai jabatan pengguna, jadi aman dipanggil di keempat halaman
 * yang memakai kartu tahun tanpa perlu penyaringan tambahan di sini.
 *
 * staleTime sengaja panjang: jumlah alumni per angkatan hampir tidak pernah
 * berubah dalam satu sesi kerja.
 */
export function useRingkasanTahun() {
  const query = useQuery<YearSummary[]>({
    queryKey: ["ringkasan-tahun"],
    queryFn: async () => {
      const { data } = await api.get("/meta/ringkasan-tahun");
      return data.data ?? [];
    },
    staleTime: 15 * 60 * 1000,
  });

  const years = query.data ?? [];

  return {
    years,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as { response?: { data?: { message?: string } } } | null,
    refetch: query.refetch,
    total: {
      alumni: years.reduce((a, r) => a + r.alumni, 0),
      responded: years.reduce((a, r) => a + r.sudah_mengisi, 0),
      questionnaires: years.reduce((a, r) => a + r.kuesioner, 0),
      kontak: years.reduce((a, r) => a + r.kontak, 0),
    },
  };
}
