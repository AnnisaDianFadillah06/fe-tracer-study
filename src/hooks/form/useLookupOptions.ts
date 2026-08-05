import { useEffect, useState } from "react";
import api from "@/lib/api";

/** Tabel referensi yang boleh dirujuk metadata `lookup` sebuah pertanyaan. */
export type LookupSource = "program" | "province" | "city";

/** Satu baris referensi setelah diseragamkan dari tiga bentuk respons. */
export interface LookupOption {
  /** Nilai yang benar-benar disimpan sebagai jawaban — id atau code. */
  value: string;
  /** Yang dibaca alumni. */
  label: string;
  /** Keterangan kecil di kanan (jenjang prodi, kode wilayah). */
  hint?: string;
  /** Hanya untuk provinsi: dipakai menyaring daftar kab/kota. */
  code?: string;
}

/**
 * Cache seumur tab. Daftar provinsi (35), prodi (36), dan kab/kota per
 * provinsi (10–40) hampir tidak pernah berubah selama satu sesi pengisian,
 * sementara satu borang bisa menampilkan isian yang sama berkali-kali lewat
 * beberapa kuesioner sekaligus. Tanpa cache, tiap pemasangan komponen memicu
 * permintaan ulang.
 */
const cache = new Map<string, LookupOption[]>();

/** Permintaan yang sedang berjalan, supaya dua komponen tidak memanggil dua kali. */
const inflight = new Map<string, Promise<LookupOption[]>>();

const cacheKey = (source: LookupSource, parentCode?: string) =>
  parentCode ? `${source}:${parentCode}` : source;

/** Buang prefiks "Prov." agar daftar terbaca ringkas — nilai simpannya tidak berubah. */
const tidyProvince = (name: string) => name.replace(/^Prov\.\s*/i, "");

async function fetchOptions(
  source: LookupSource,
  valueField: "id" | "code",
  parentCode?: string,
): Promise<LookupOption[]> {
  if (source === "program") {
    const { data } = await api.get("/programs");
    return (data?.data ?? []).map((p: Record<string, unknown>) => ({
      value: String(valueField === "code" ? p.code ?? "" : p.id ?? ""),
      label: String(p.name ?? ""),
      hint: [p.degree, p.code].filter(Boolean).join(" · ") || undefined,
    }));
  }

  if (source === "province") {
    const { data } = await api.get("/provinces");
    return (data?.data ?? []).map((p: Record<string, unknown>) => ({
      value: String(valueField === "code" ? p.code ?? "" : p.id ?? ""),
      label: tidyProvince(String(p.name ?? "")),
      hint: String(p.code ?? "") || undefined,
      code: String(p.code ?? ""),
    }));
  }

  // Kab/kota selalu diminta per provinsi. Tanpa induk, daftar 528 baris itu
  // tidak berguna bagi alumni — dan memang tidak pernah diminta, karena
  // komponen menonaktifkan dirinya sampai provinsi terpilih.
  if (!parentCode) return [];

  const { data } = await api.get("/cities", { params: { province_code: parentCode } });
  return (data?.data ?? []).map((c: Record<string, unknown>) => ({
    value: String(valueField === "code" ? c.code ?? "" : c.id ?? ""),
    label: String(c.name ?? ""),
    hint: String(c.code ?? "") || undefined,
  }));
}

/**
 * Ambil daftar pilihan sebuah isian referensi.
 *
 * `parentCode` hanya relevan untuk kab/kota: isinya provinces.code milik
 * provinsi yang sedang terpilih. Selama masih kosong, hook tidak memanggil
 * apa pun dan mengembalikan daftar kosong.
 */
export function useLookupOptions(
  source: LookupSource | undefined,
  valueField: "id" | "code" = "id",
  parentCode?: string,
) {
  const key = source ? cacheKey(source, parentCode) : "";
  const [options, setOptions] = useState<LookupOption[]>(() => cache.get(key) ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source) return;
    if (source === "city" && !parentCode) {
      setOptions([]);
      return;
    }

    const cached = cache.get(key);
    if (cached) {
      setOptions(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const request =
      inflight.get(key) ??
      fetchOptions(source, valueField, parentCode).then((result) => {
        cache.set(key, result);
        inflight.delete(key);
        return result;
      });
    inflight.set(key, request);

    request
      .then((result) => {
        if (!cancelled) setOptions(result);
      })
      .catch(() => {
        inflight.delete(key);
        if (!cancelled) setError("Daftar referensi gagal dimuat.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [source, valueField, parentCode, key]);

  return { options, isLoading, error };
}

/** Cari label sebuah nilai tersimpan, untuk ditampilkan di kotak tertutup. */
export function labelForValue(options: LookupOption[], value: string): string | undefined {
  return options.find((o) => o.value === value)?.label;
}
