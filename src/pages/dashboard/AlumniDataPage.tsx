import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, GraduationCap, Loader2, Search, XCircle } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useKaprodiAlumni } from "@/hooks/dashboard/kaprodi/useKaprodiAlumni";
import PilihTahun from "@/components/common/PilihTahun";

const AlumniDataPage = () => {
  const { selectedProdi } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();

  const yearParam = searchParams.get("year");
  const pageParam = searchParams.get("page");

  // graduationYear DITURUNKAN dari URL, bukan disimpan sebagai state
  // terpisah. Menyimpannya ganda membuat tombol Back peramban mengubah URL
  // tanpa mengubah tampilan.
  //   undefined = belum dipilih (tampilkan kartu tahun)
  //   null      = semua angkatan
  //   number    = satu angkatan
  const graduationYear: number | null | undefined =
    yearParam === "all" ? null : yearParam ? Number(yearParam) : undefined;

  const [page, setPageState] = useState(pageParam ? Number(pageParam) : 1);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  // Kembali ke layar kartu tahun: cukup buang parameternya dari URL.
  const backToYearCards = () => {
    setSearch("");
    setPageState(1);
    setSearchParams(new URLSearchParams(), { replace: false });
  };

  const setGraduationYear = (y: number | null) => {
    setPageState(1);
    const params = new URLSearchParams(searchParams);
    params.set("year", y === null ? "all" : String(y));
    params.set("page", "1");
    setSearchParams(params, { replace: true });
  };

  const setPage = (p: number) => {
    setPageState(p);
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    setSearchParams(params, { replace: true });
  };

  // Tahun belum dipilih -> hook menahan seluruh permintaannya sendiri
  // (lihat isReady di useKaprodiAlumni), jadi tidak ada API yang dipanggil.
  const noYearSelected = graduationYear === undefined;

  const { stats, alumni, pagination, isLoading, isError, graduationYears } = useKaprodiAlumni({
    search, page, graduationYear,
  });

  // Reset page on search change
  useEffect(() => { setPageState(1); }, [search]);

  // ── Layar kartu tahun ────────────────────────────────────────────────
  // Sebelumnya di sini ada useEffect yang otomatis memilih angkatan terbaru,
  // sehingga halaman langsung menarik data begitu dibuka. Sekarang pengguna
  // memilih dulu lewat kartu.
  if (noYearSelected) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-heading font-bold">Data Alumni Prodi</h2>
            <p className="text-muted-foreground text-sm">
              Pilih angkatan untuk melihat data alumni {selectedProdi ?? "program studi Anda"}
            </p>
          </div>
          <PilihTahun
            mode="alumni"
            onSelect={setGraduationYear}
            onSearch={(q) => {
              setSearch(q);
              setPageState(1);
              const params = new URLSearchParams();
              params.set("year", "all");
              params.set("page", "1");
              params.set("q", q);
              setSearchParams(params, { replace: false });
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-bold">
              Data Alumni Prodi
              <span className="text-muted-foreground font-normal">
                {" — "}{graduationYear === null ? "Semua Lulusan" : `Lulusan ${graduationYear}`}
              </span>
            </h2>
            <p className="text-muted-foreground text-sm">Data alumni {selectedProdi ?? "program studi Anda"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={backToYearCards} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
            Pilih Angkatan
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card"><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Total Alumni</p><p className="text-2xl font-bold">{isLoading ? "…" : stats?.total ?? 0}</p></div>
          </div></CardContent></Card>
          <Card className="glass-card"><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Sudah Mengisi</p><p className="text-2xl font-bold text-emerald-600">{isLoading ? "…" : stats?.answered ?? 0}</p></div>
          </div></CardContent></Card>
          <Card className="glass-card"><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center"><XCircle className="w-5 h-5 text-orange-500" /></div>
            <div><p className="text-xs text-muted-foreground">Belum Mengisi</p><p className="text-2xl font-bold text-orange-500">{isLoading ? "…" : stats?.unanswered ?? 0}</p></div>
          </div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card className="glass-card"><CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari NIM atau nama alumni..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={graduationYear === undefined ? "" : graduationYear === null ? "all" : String(graduationYear)} onValueChange={(v) => setGraduationYear(v === "all" ? null : Number(v))}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tahun Lulus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Lulusan</SelectItem>
                {graduationYears.map((y) => <SelectItem key={y} value={String(y)}>Lulusan {y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent></Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">Daftar Alumni ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader><TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>NIM</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Program Studi</TableHead>
                  <TableHead>Jurusan</TableHead>
                  <TableHead>Tahun Lulusan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground"><div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Memuat data alumni…</div></TableCell></TableRow>
                  ) : isError ? (
                    <TableRow><TableCell colSpan={8} className="py-10 text-center text-destructive">Gagal memuat data alumni.</TableCell></TableRow>
                  ) : alumni.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">{search ? "Tidak ada alumni yang cocok." : "Belum ada data alumni."}</TableCell></TableRow>
                  ) : alumni.map((a, index) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{(page - 1) * 100 + index + 1}</TableCell>
                      <TableCell className="font-mono font-medium">{a.nim}</TableCell>
                      <TableCell>{a.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{a.email ?? "—"}</TableCell>
                      <TableCell className="text-sm">{a.program_name ? `${a.program_name}${a.program_degree ? ` (${a.program_degree})` : ""}` : "—"}</TableCell>
                      <TableCell className="text-sm">{a.jurusan_name ?? "—"}</TableCell>
                      <TableCell>{a.graduation_year ?? "—"}</TableCell>
                      <TableCell>
                        {a.response_status === "finished" ? (
                          <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700"><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Finished</Badge>
                        ) : a.response_status === "ongoing" ? (
                          <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700"><Loader2 className="mr-1 h-3.5 w-3.5" />Ongoing</Badge>
                        ) : (
                          <Badge variant="outline" className="border-orange-500/20 bg-orange-500/10 text-orange-700"><XCircle className="mr-1 h-3.5 w-3.5" />Not Started</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pagination.lastPage > 1 && (
              <div className="flex items-center justify-between px-4 pt-4 pb-4 border-t">
                <p className="text-sm text-muted-foreground">Halaman {pagination.currentPage} dari {pagination.lastPage} ({pagination.total} data)</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</Button>
                  {Array.from({ length: Math.min(5, pagination.lastPage) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, pagination.lastPage - 4));
                    const p = start + i;
                    if (p > pagination.lastPage) return null;
                    return <Button key={p} variant={p === page ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>{p}</Button>;
                  })}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pagination.lastPage} onClick={() => setPage(page + 1)}>›</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pagination.lastPage} onClick={() => setPage(pagination.lastPage)}>»</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AlumniDataPage;
