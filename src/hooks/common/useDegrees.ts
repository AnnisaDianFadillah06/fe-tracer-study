import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { DEGREES } from "@/config/academic";

export interface Degree {
  id: number;
  /** Kode yang tersimpan di `programs.degree` dan mengalir ke gudang data. */
  code: string;
  /** Label tampilan. Tidak pernah sampai ke gudang data, bebas diubah kampus. */
  label: string;
  sort_order: number;
  /** Baris bawaan: kode terkunci, tidak boleh dihapus. */
  is_seeded: boolean;
  is_active: boolean;
  /** Jumlah program studi yang memakai jenjang ini. */
  program_count: number;
}

/**
 * Daftar jenjang dari master data.
 *
 * Menggantikan tetapan `DEGREES` sebagai sumber dropdown. Yang tersisa dari
 * tetapan itu perannya jadi cadangan saat permintaan gagal, supaya form
 * pembuatan prodi tidak berubah jadi dropdown kosong hanya karena jaringan
 * sedang putus.
 *
 * Ini BUKAN sumber untuk penyaring dasbor — penyaring memakai `filter-meta`,
 * yang hanya memuat jenjang yang benar-benar punya data. Daftar ini menjawab
 * "jenjang apa saja yang boleh ada", bukan "yang ada datanya".
 */
export const DEGREES_QUERY_KEY = ["degrees"] as const;

export function useDegrees() {
  const query = useQuery<Degree[]>({
    queryKey: DEGREES_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get("/degrees");
      return data.data ?? [];
    },
  });

  const degrees = query.data ?? [];

  return {
    degrees,
    /** Kode jenjang aktif saja — yang boleh dipilih saat membuat prodi. */
    activeCodes: query.isSuccess
      ? degrees.filter((d) => d.is_active).map((d) => d.code)
      : [...DEGREES],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
