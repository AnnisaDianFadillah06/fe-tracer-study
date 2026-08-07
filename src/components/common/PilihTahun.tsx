import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap, FileText, Search, AlertCircle, ArrowRight, Layers, RefreshCw,
} from "lucide-react";
import { useRingkasanTahun, YearSummary } from "@/hooks/useRingkasanTahun";

/**
 * Layar antara berupa kartu per TAHUN LULUSAN.
 *
 * Dipakai empat halaman: alumni-data, student-management,
 * questionnaire-results, dan form-management. Sebelumnya keempatnya
 * langsung menarik data begitu dibuka -- daftar kuesioner saja ~279 KB --
 * padahal pengguna hampir selalu bekerja pada satu angkatan saja.
 *
 * Halaman pemanggil menentukan tahun terpilih lewat query string `?year=`:
 *   - `?year=` tidak ada  -> komponen ini yang tampil
 *   - `?year=2024`        -> halaman menampilkan tabelnya sendiri
 *   - `?year=all`         -> lintas angkatan
 *
 * Dengan begitu tombol kembali, muat ulang, dan berbagi tautan tetap
 * bekerja tanpa perlu menambah route baru.
 */

/**
 * Angka apa yang ditonjolkan kartu, dan apa yang pantas ikut ditampilkan.
 *
 * "kontak" sengaja TIDAK menampilkan bilah maupun persentase tingkat respons:
 * halaman Kontak Penilai tidak berurusan dengan progres pengisian sama
 * sekali, dan menampilkannya di sana menjawab pertanyaan yang tidak sedang
 * ditanyakan siapa pun. Yang berguna di sana adalah berapa kontak yang akan
 * dikerjakan pada angkatan itu.
 */
export type YearMode = "alumni" | "kuesioner" | "kontak";

interface Props {
  /** "alumni" menyoroti jumlah alumni; "kuesioner" menyoroti jumlah kuesioner. */
  mode: YearMode;
  /** Dipanggil saat kartu ditekan. `null` berarti "Semua Tahun". */
  onSelect: (year: number | null) => void;
  /** Dipanggil saat pengguna menekan Enter di kotak pencarian. */
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  /** Tombol aksi global (import, unduh templat, tambah) — tetap terlihat di layar kartu. */
  actions?: React.ReactNode;
}

const nf = new Intl.NumberFormat("id-ID");

/** Kartu satu tahun. Diredupkan bila tidak ada yang bisa dibuka pada mode ini. */
const YearCard = ({
  data, mode, onSelect,
}: { data: YearSummary; mode: YearMode; onSelect: (year: number) => void }) => {
  // Pada mode kuesioner, angkatan yang belum disasar kuesioner apa pun tidak
  // ada isinya untuk dibuka. Kartunya tetap ditampilkan (bukan disembunyikan)
  // supaya pengguna sadar angkatan itu ada tapi belum digarap.
  const disabled = mode === "kuesioner" && data.kuesioner === 0;

  return (
    <Card
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && onSelect(data.tahun)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(data.tahun); }
      }}
      className={
        disabled
          ? "opacity-55 cursor-not-allowed border-dashed"
          : "cursor-pointer transition-all hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      }
    >
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold leading-tight">Lulusan {data.tahun}</h3>
            {data.periode.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Pelaksanaan {data.periode.join("–")}
              </p>
            )}
          </div>
          {disabled ? (
            <Badge variant="outline" className="shrink-0">Belum digarap</Badge>
          ) : (
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
          )}
        </div>

        {disabled ? (
          <p className="text-sm text-muted-foreground">
            Belum ada kuesioner yang menyasar angkatan ini.
          </p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              {nf.format(
                mode === "kuesioner" ? data.kuesioner
                  : mode === "kontak" ? data.kontak
                  : data.alumni,
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {mode === "kuesioner" ? "kuesioner" : mode === "kontak" ? "kontak" : "alumni"}
            </span>
          </div>
        )}

        {mode === "kontak" ? (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" aria-hidden />
              {nf.format(data.alumni)} alumni
            </span>
            <span>{nf.format(data.sudah_mengisi)} mengisi kuesioner</span>
          </div>
        ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3 w-3" aria-hidden />
              {nf.format(data.alumni)} alumni
            </span>
            <span>{nf.format(data.sudah_mengisi)} sudah mengisi</span>
          </div>

          {/* Bilah tingkat respons — memberi gambaran cepat angkatan mana
              yang paling perlu ditindaklanjuti. */}
          <div
            className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
            role="img"
            aria-label={`Tingkat respons ${data.response_rate} persen`}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(data.response_rate, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-medium tabular-nums">{data.response_rate}%</span>
            {mode === "alumni" && data.kuesioner > 0 && (
              <span className="text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" aria-hidden />
                {nf.format(data.kuesioner)} kuesioner
              </span>
            )}
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
};

export const PilihTahun = ({
  mode, onSelect, onSearch, searchPlaceholder = "Cari NIM atau nama alumni...", actions,
}: Props) => {
  const { years, isLoading, isError, error, refetch, total } = useRingkasanTahun();
  const [query, setQuery] = useState("");

  const submitSearch = () => {
    const q = query.trim();
    if (!q || !onSearch) return;
    onSearch(q);
  };

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive" aria-hidden />
          <p className="text-sm text-destructive">
            {error?.response?.data?.message ?? "Gagal memuat ringkasan tahun."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden />
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {(onSearch || actions) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {onSearch && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                placeholder={searchPlaceholder}
                className="pl-9"
                aria-label={searchPlaceholder}
              />
            </div>
          )}
          {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {onSearch && (
        <p className="text-xs text-muted-foreground -mt-1">
          Tekan Enter untuk mencari lintas seluruh angkatan.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5 pb-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-3 w-20" />
            </CardContent></Card>
          ))
        ) : (
          <>
            {/* Kartu lintas angkatan — dibutuhkan saat staf mencari satu
                alumni tanpa tahu angkatannya. */}
            <Card
              role="button"
              tabIndex={0}
              onClick={() => onSelect(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(null); }
              }}
              className="cursor-pointer transition-all border-primary/40 bg-primary/[0.03] hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold leading-tight">Semua Tahun</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Lintas angkatan</p>
                  </div>
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">
                    {nf.format(
                      mode === "kuesioner" ? total.questionnaires
                        : mode === "kontak" ? total.kontak
                        : total.alumni,
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {mode === "kuesioner" ? "kuesioner" : mode === "kontak" ? "kontak" : "alumni"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {mode === "kontak"
                    ? `Dari ${nf.format(total.alumni)} alumni lintas angkatan`
                    : `${nf.format(total.responded)} dari ${nf.format(total.alumni)} alumni sudah mengisi`}
                </p>
              </CardContent>
            </Card>

            {years.map((r) => (
              <YearCard key={r.tahun} data={r} mode={mode} onSelect={onSelect} />
            ))}
          </>
        )}
      </div>

      {!isLoading && years.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Belum ada data tahun lulusan.
        </CardContent></Card>
      )}
    </div>
  );
};

export default PilihTahun;
