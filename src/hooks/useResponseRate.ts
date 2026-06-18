import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

export interface ResponseRateBarItem {
  prodi: string;
  jenjang: string;
  responded: number;
  notResponded: number;
  total: number;
  breakdown: {
    selesai: number;
    on_going: number;
    belum_mengisi: number;
  };
}

export interface ResponseRateBarResponse {
  filters: Record<string, string>;
  sort: string;
  data: ResponseRateBarItem[];
}

function buildParams(
  degree: string,
  prodi: string,
  tahunLulus: string,
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree && degree !== "__all__") p.jenjang = degree;
  if (prodi && prodi !== "__all__") p.nama_prodi = prodi;
  if (tahunLulus && tahunLulus !== "all") p.graduation_year = tahunLulus;
  return p;
}

export function useResponseRateBar() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus]
  );

  const result = useQuery<ResponseRateBarResponse>({
    queryKey: ["response-rate", "bar", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/response-rate/bar", { params, signal })
        .then((res) => res?.data ?? res),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}
