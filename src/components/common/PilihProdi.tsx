import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle, ArrowRight, GraduationCap, Layers, RefreshCw, Search,
} from "lucide-react";
import { useStatsPerProdi, type ProdiSummary } from "@/hooks/dashboard/useStatsPerProdi";

/**
 * Layar antara berupa kartu per PROGRAM STUDI, dipakai setelah tahun lulus
 * dipilih dan sebelum tabel alumni ditampilkan.
 *
 * Sebelumnya halaman langsung menyajikan satu tabel berisi seluruh prodi --
 * 1.800 baris bagi peran yang cakupannya seluruh institusi. Daftar sepanjang
 * itu tidak menjawab pertanyaan yang sebenarnya dibawa pengelola ke halaman
 * ini, yaitu prodi mana yang tertinggal pengisiannya.
 *
 * Prodi terpilih ditaruh di query string `?prodi=`, mengikuti pola `?year=`
 * pada PilihTahun, supaya tombol kembali, muat ulang, dan berbagi tautan
 * tetap bekerja tanpa route baru.
 */

interface Props {
  /** Tahun lulus terpilih; `null` berarti lintas tahun. */
  graduationYear: number | null;
  /** Dipanggil saat kartu ditekan. `null` berarti "Semua Prodi". */
  onSelect: (programId: number | null) => void;
}

const nf = new Intl.NumberFormat("id-ID");

const prodiLabel = (p: ProdiSummary) =>
  p.program_degree ? `${p.program_name} (${p.program_degree})` : p.program_name;

const ProdiCard = ({ data, onSelect }: { data: ProdiSummary; onSelect: (id: number) => void }) => {
  // Prodi tanpa alumni pada tahun lulus ini tidak ada isinya untuk dibuka.
  // Kartunya tetap ditampilkan, bukan disembunyikan, supaya pengelola tahu
  // prodinya ada dan memang kosong -- bukan mengira daftarnya tidak lengkap.
  const disabled = data.total === 0;

  return (
    <Card
      role={disabled ? undefined : "button"}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && onSelect(data.program_id)}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(data.program_id); }
      }}
      className={
        disabled
          ? "opacity-55 cursor-not-allowed border-dashed"
          : "cursor-pointer transition-all hover:border-primary/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      }
    >
      <CardContent className="pt-5 pb-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-tight">{prodiLabel(data)}</h3>
            {data.jurusan_name && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.jurusan_name}</p>
            )}
          </div>
          {disabled ? (
            <Badge variant="outline" className="shrink-0">Kosong</Badge>
          ) : (
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
          )}
        </div>

        {disabled ? (
          <p className="text-sm text-muted-foreground">Belum ada alumni pada lulusan ini.</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tabular-nums">{nf.format(data.total)}</span>
              <span className="text-sm text-muted-foreground">alumni</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" aria-hidden />
                  {nf.format(data.answered)} sudah mengisi
                </span>
                <span>{nf.format(data.unanswered)} belum</span>
              </div>

              {/* Bilah tingkat respons -- inilah yang membuat prodi tertinggal
                  terlihat tanpa perlu membuka satu per satu. */}
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

              <span className="text-xs font-medium tabular-nums">{data.response_rate}%</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const PilihProdi = ({ graduationYear, onSelect }: Props) => {
  const { prodi, isLoading, isError, refetch } = useStatsPerProdi(graduationYear);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return prodi;
    return prodi.filter(
      (p) =>
        p.program_name.toLowerCase().includes(q) ||
        (p.jurusan_name ?? "").toLowerCase().includes(q) ||
        (p.program_code ?? "").toLowerCase().includes(q),
    );
  }, [prodi, query]);

  const total = useMemo(
    () => prodi.reduce(
      (acc, p) => ({ alumni: acc.alumni + p.total, answered: acc.answered + p.answered }),
      { alumni: 0, answered: 0 },
    ),
    [prodi],
  );

  if (isError) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <AlertCircle className="h-8 w-8 mx-auto text-destructive" aria-hidden />
          <p className="text-sm text-destructive">Gagal memuat ringkasan per program studi.</p>
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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari program studi atau jurusan..."
          className="pl-9"
          aria-label="Cari program studi atau jurusan"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5 pb-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-1.5 w-full" />
              <Skeleton className="h-3 w-20" />
            </CardContent></Card>
          ))
        ) : (
          <>
            {/* Kartu lintas prodi -- dibutuhkan saat staf mencari satu alumni
                tanpa tahu prodinya, sekaligus menjaga tabel gabungan yang
                selama ini jadi tampilan awal tetap terjangkau. */}
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
                    <h3 className="text-base font-semibold leading-tight">Semua Prodi</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Lintas program studi</p>
                  </div>
                  <Layers className="h-4 w-4 text-muted-foreground shrink-0 mt-1" aria-hidden />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums">{nf.format(total.alumni)}</span>
                  <span className="text-sm text-muted-foreground">alumni</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {nf.format(total.answered)} dari {nf.format(total.alumni)} alumni sudah mengisi
                </p>
              </CardContent>
            </Card>

            {filtered.map((p) => (
              <ProdiCard key={p.program_id} data={p} onSelect={onSelect} />
            ))}
          </>
        )}
      </div>

      {!isLoading && prodi.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Belum ada program studi dengan data alumni.
        </CardContent></Card>
      )}

      {!isLoading && prodi.length > 0 && filtered.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Tidak ada program studi yang cocok.
        </CardContent></Card>
      )}
    </div>
  );
};

export default PilihProdi;
