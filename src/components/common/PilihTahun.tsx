import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GraduationCap, FileText, Search, AlertCircle, ArrowRight, Layers, RefreshCw,
} from "lucide-react";
import { useRingkasanTahun, RingkasanTahun } from "@/hooks/useRingkasanTahun";

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

export type ModeTahun = "alumni" | "kuesioner";

interface Props {
  /** "alumni" menyoroti jumlah alumni; "kuesioner" menyoroti jumlah kuesioner. */
  mode: ModeTahun;
  /** Dipanggil saat kartu ditekan. `null` berarti "Semua Tahun". */
  onPilih: (tahun: number | null) => void;
  /** Dipanggil saat pengguna menekan Enter di kotak pencarian. */
  onCari?: (kata: string) => void;
  placeholderCari?: string;
  /** Tombol aksi global (import, unduh templat, tambah) — tetap terlihat di layar kartu. */
  aksi?: React.ReactNode;
}

const nf = new Intl.NumberFormat("id-ID");

/** Kartu satu tahun. Diredupkan bila tidak ada yang bisa dibuka pada mode ini. */
const KartuTahun = ({
  data, mode, onPilih,
}: { data: RingkasanTahun; mode: ModeTahun; onPilih: (t: number) => void }) => {
  // Pada mode kuesioner, angkatan yang belum disasar kuesioner apa pun tidak
  // ada isinya untuk dibuka. Kartunya tetap ditampilkan (bukan disembunyikan)
  // supaya pengguna sadar angkatan itu ada tapi belum digarap.
  const kosong = mode === "kuesioner" && data.kuesioner === 0;

  return (
    <Card
      role={kosong ? undefined : "button"}
      tabIndex={kosong ? -1 : 0}
      aria-disabled={kosong}
      onClick={() => !kosong && onPilih(data.tahun)}
      onKeyDown={(e) => {
        if (kosong) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPilih(data.tahun); }
      }}
      className={
        kosong
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
          {kosong ? (
            <Badge variant="outline" className="shrink-0">Belum digarap</Badge>
          ) : (
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
          )}
        </div>

        {kosong ? (
          <p className="text-sm text-muted-foreground">
            Belum ada kuesioner yang menyasar angkatan ini.
          </p>
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">
              {nf.format(mode === "kuesioner" ? data.kuesioner : data.alumni)}
            </span>
            <span className="text-sm text-muted-foreground">
              {mode === "kuesioner" ? "kuesioner" : "alumni"}
            </span>
          </div>
        )}

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
      </CardContent>
    </Card>
  );
};

export const PilihTahun = ({
  mode, onPilih, onCari, placeholderCari = "Cari NIM atau nama alumni...", aksi,
}: Props) => {
  const { daftar, isLoading, isError, error, refetch, total } = useRingkasanTahun();
  const [kata, setKata] = useState("");

  const kirimCari = () => {
    const q = kata.trim();
    if (!q || !onCari) return;
    onCari(q);
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
      {(onCari || aksi) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {onCari && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                value={kata}
                onChange={(e) => setKata(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && kirimCari()}
                placeholder={placeholderCari}
                className="pl-9"
                aria-label={placeholderCari}
              />
            </div>
          )}
          {aksi && <div className="flex gap-2 shrink-0">{aksi}</div>}
        </div>
      )}

      {onCari && (
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
              onClick={() => onPilih(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPilih(null); }
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
                    {nf.format(mode === "kuesioner" ? total.kuesioner : total.alumni)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {mode === "kuesioner" ? "kuesioner" : "alumni"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {nf.format(total.sudahMengisi)} dari {nf.format(total.alumni)} alumni sudah mengisi
                </p>
              </CardContent>
            </Card>

            {daftar.map((r) => (
              <KartuTahun key={r.tahun} data={r} mode={mode} onPilih={onPilih} />
            ))}
          </>
        )}
      </div>

      {!isLoading && daftar.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Belum ada data tahun lulusan.
        </CardContent></Card>
      )}
    </div>
  );
};

export default PilihTahun;
