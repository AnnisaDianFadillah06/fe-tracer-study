import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import DrillDownModal, { type DrillDownData } from "@/components/dashboard/DrillDownModal";
import api from "@/lib/api";
import {
  canTotal,
  formatMeasure,
  type CatalogMeasure,
  type ExplorerFilter,
} from "@/lib/olapExplorer";

/** Satu angka yang diklik pengguna. */
export interface DrillRequest {
  cube: string;
  measure: CatalogMeasure;
  /** Saringan pengguna + nilai titik yang diklik (lihat drillFilters). */
  filters: ExplorerFilter[];
  /** "Jurusan Akuntansi · Tahun lulus 2022" */
  pointLabel: string;
  /** Angka di sel/batang yang diklik. */
  value: number | null;
}

interface DrillResponse {
  data: Array<Record<string, string | number | null>>;
  pagination: DrillDownData["pagination"];
}

interface Props {
  request: DrillRequest | null;
  onClose: () => void;
}

const PER_PAGE = 15;

/**
 * Daftar alumni di balik satu angka Insight, memakai DrillDownModal yang sama
 * dengan dashboard lain.
 *
 * Untuk cacah, jumlah baris daftar sama dengan angka yang diklik (peladen
 * menyaring alumni yang ikut terhitung), jadi angka itu dipakai sebagai total.
 * Untuk rata-rata/gaji, kolom tambahannya berisi nilai tiap alumni.
 */
const ExplorerDrillDown = ({ request, onClose }: Props) => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isFetching, error } = useQuery({
    queryKey: ["explorer", "drill-down", request, page, search],
    queryFn: async (): Promise<DrillResponse> => {
      const { data } = await api.post<{ data: DrillResponse }>("/dashboard/explorer/drill-down", {
        cube: request!.cube,
        measure: request!.measure.key,
        filters: request!.filters,
        search: search || null,
        page,
        per_page: PER_PAGE,
      });
      return data.data;
    },
    enabled: request !== null,
    placeholderData: keepPreviousData,
    retry: false,
  });

  if (!request) return null;

  const { measure } = request;
  const isCount = canTotal(measure.format);

  const modalData: DrillDownData | null = data
    ? {
        data: data.data.map((row) => ({
          ...row,
          nilai: formatMeasure(row.nilai === null ? null : Number(row.nilai), measure.format),
        })),
        pagination: {
          ...data.pagination,
          // Tanpa pencarian, daftar untuk cacah persis sebanyak angka di sel.
          total: isCount && !search && request.value !== null ? request.value : undefined,
        },
      }
    : null;

  // Jumlahnya hanya diketahui bila yang diklik adalah cacah itu sendiri —
  // bukan persennya, bukan hasil rumus.
  const title =
    isCount && request.value !== null
      ? `${request.value} alumni · ${measure.label} — ${request.pointLabel}`
      : `Alumni · ${measure.label} — ${request.pointLabel}`;

  return (
    <DrillDownModal
      isOpen
      onClose={() => {
        setPage(1);
        setSearch("");
        onClose();
      }}
      title={title}
      data={modalData}
      loading={isFetching && !data}
      error={
        error
          ? isAxiosError(error) && typeof error.response?.data?.message === "string"
            ? error.response.data.message
            : "Daftar alumni gagal dimuat."
          : null
      }
      contextColumn={
        isCount ? { key: "status", label: "Status" } : { key: "nilai", label: measure.label }
      }
      onPageChange={(p, q) => {
        setPage(p);
        setSearch(q ?? "");
      }}
    />
  );
};

export default ExplorerDrillDown;
