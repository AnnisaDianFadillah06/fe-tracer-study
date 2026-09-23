/**
 * useExplorer
 *
 * Tiga sumber data halaman Insight: katalog (apa yang boleh dipilih), nilai
 * satu dimensi (isi dropdown filter), dan hasil query yang disusun pengguna.
 *
 * Katalog dan nilai dimensi jarang berubah, jadi ditahan lama di cache.
 * Hasil query di-key oleh isi permintaannya sendiri, sehingga kembali ke
 * kombinasi yang barusan dilihat tidak memanggil Cube.js lagi.
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  ExplorerCatalog,
  ExplorerQueryInput,
  ExplorerResult,
} from "@/lib/olapExplorer";
import { isRunnable, toRequestBody } from "@/lib/olapExplorer";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export function useExplorerCatalog() {
  return useQuery({
    queryKey: ["explorer", "catalog"],
    queryFn: async (): Promise<ExplorerCatalog> => {
      const { data } = await api.get<ApiEnvelope<ExplorerCatalog>>(
        "/dashboard/explorer/catalog",
      );
      return data.data;
    },
    staleTime: Infinity,
  });
}

/**
 * `cube` ikut dikirim: dimensi yang sama (mis. Jurusan) ada di beberapa
 * sumber data, dan nilainya diambil dari sumber yang sedang dipakai.
 */
export function useDimensionValues(dimension: string | null, cube?: string) {
  return useQuery({
    queryKey: ["explorer", "dimension-values", cube ?? null, dimension],
    queryFn: async (): Promise<string[]> => {
      const { data } = await api.get<ApiEnvelope<{ dimension: string; values: string[] }>>(
        "/dashboard/explorer/dimension-values",
        { params: { dimension, cube } },
      );
      return data.data.values;
    },
    enabled: dimension !== null,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExplorerQuery(input: ExplorerQueryInput) {
  const body = toRequestBody(input);

  return useQuery({
    // Badan permintaan itu sendiri yang jadi identitas hasil — tidak ada
    // keadaan lain yang memengaruhinya di sisi ini (scope role ditentukan
    // peladen dari token, bukan dari sesuatu yang bisa berubah di halaman).
    queryKey: ["explorer", "query", body],
    queryFn: async (): Promise<ExplorerResult> => {
      const { data } = await api.post<ApiEnvelope<ExplorerResult>>(
        "/dashboard/explorer/query",
        body,
      );
      return data.data;
    },
    enabled: isRunnable(input),

    // Kombinasi yang ditolak katalog (422) tidak akan berubah kalau diulang;
    // mencoba lagi hanya menunda pesan galatnya sampai ke pengguna.
    retry: false,
  });
}
