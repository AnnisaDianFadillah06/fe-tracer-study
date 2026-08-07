import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Check, Contact, Copy, Download, Loader2, Mail, Search, Users } from "lucide-react";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import { useRingkasanTahun } from "@/hooks/useRingkasanTahun";
import { useJurusan } from "@/hooks/common/useJurusan";
import PilihTahun from "@/components/common/PilihTahun";
import {
  useProgramOptions,
  useStakeholderContacts,
  stakeholderQueryParams,
} from "@/hooks/dashboard/useStakeholderContacts";

/** Nilai contact_type di basis data → label dan warna badge-nya. */
const CONTACT_TYPES: Record<string, { label: string; className: string }> = {
  atasan: { label: "Atasan", className: "bg-primary/10 text-primary border-primary/20" },
  senior: { label: "Senior", className: "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20" },
  rekan:  { label: "Rekan/HRD", className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
};

/** Nilai alumni_status di basis data → label yang terbaca. */
const ALUMNI_STATUSES: Record<string, string> = {
  bekerja:     "Bekerja",
  wiraswasta:  "Wiraswasta",
  lanjut_studi: "Lanjut Studi",
};

const ALL = "all";

const StakeholderContactsPage = () => {
  const { toast } = useToast();
  const { years } = useRingkasanTahun();
  const programs = useProgramOptions();

  const { jurusanNames } = useJurusan();

  /**
   * Angkatan yang sedang dibuka. Tiga keadaan, dan bedanya penting:
   *   ""     — belum memilih, layar kartu angkatan yang tampil
   *   "all"  — sengaja memilih lintas angkatan
   *   "2024" — satu angkatan
   *
   * Pola ini menyamai Kelola Mahasiswa dan Kelola Kuesioner, supaya ketiga
   * halaman pengelolaan dimasuki dengan cara yang sama.
   */
  const [yearSelection, setYearSelection] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const graduationYear = yearSelection && yearSelection !== ALL ? Number(yearSelection) : null;
  const [alumniStatus, setAlumniStatus] = useState<string | null>(null);
  const [jurusan, setJurusan] = useState<string | null>(null);
  const [contactType, setContactType] = useState<string | null>(null);
  const [programCode, setProgramCode] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Pencarian ditunda 400 ms setelah ketikan terakhir — tanpa jeda, setiap
  // huruf memicu satu permintaan ke server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const activeFilters = { search, graduationYear, alumniStatus, contactType, jurusan, programCode };
  const { contacts, stats, pagination, isLoading, isError } = useStakeholderContacts({
    ...activeFilters,
    page,
  });

  const resetPage = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(email);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast({ title: "Gagal menyalin surel", variant: "destructive" });
    }
  };

  /**
   * Unduhan berdialog, dengan penyaringnya sendiri.
   *
   * Lingkupnya TIDAK lagi mengikuti penyaring tabel. Kiriman survei penilaian
   * dilakukan per angkatan atau per jurusan, dan itu belum tentu sama dengan
   * yang sedang dilihat petugas di layar — memaksa keduanya sama berarti
   * petugas harus mengubah tampilan tabelnya dulu hanya untuk mengunduh.
   * Nilai awal dialog tetap diambil dari penyaring tabel supaya jalur yang
   * biasa tetap satu klik.
   */
  const [isDownloadOpen, setDownloadOpen] = useState(false);
  const [dlYear, setDlYear] = useState<string>(ALL);
  const [dlJurusan, setDlJurusan] = useState<string>(ALL);
  const [dlProdi, setDlProdi] = useState<string>(ALL);
  const [dlProgress, setDlProgress] = useState<number | null>(null);

  const openDownload = () => {
    setDlYear(yearSelection || ALL);
    setDlJurusan(jurusan ?? ALL);
    setDlProdi(programCode ?? ALL);
    setDlProgress(null);
    setDownloadOpen(true);
  };

  /** Prodi menyempit begitu jurusan dipilih; kombinasi silang selalu kosong. */
  const dlProdiOptions = dlJurusan === ALL
    ? programs
    : programs.filter((p) => p.jurusan === dlJurusan);

  const download = async (format: "xlsx" | "csv") => {
    setDownloading(true);
    setDlProgress(0);
    try {
      const params: Record<string, string> = { format };
      if (dlYear !== ALL) params.graduation_year = dlYear;
      if (dlJurusan !== ALL) params.jurusan = dlJurusan;
      if (dlProdi !== ALL) params.program_code = dlProdi;

      const response = await api.get("/stakeholder-contacts/export", {
        params,
        responseType: "blob",
        // Kemajuan dihitung dari bita, bukan baris — satu permintaan tidak
        // dapat melaporkan sudah sampai baris ke berapa. Persentasenya baru
        // ada bila server mengirim panjang isi; untuk CSV panjangnya disetel
        // eksplisit di StakeholderContactController. Bila tidak ada, yang
        // ditampilkan hanya penanda berjalan.
        onDownloadProgress: (e) => {
          if (e.total) setDlProgress(Math.round((e.loaded / e.total) * 100));
        },
      });

      const blob = new Blob([response.data], {
        // Kepala balasan bertipe longgar di axios; dipaksa untai supaya
        // tidak lagi menjadi galat jenis yang sudah lama menempel di sini.
        type: String(response.headers["content-type"] ?? "") || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kontak_penilai_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      setDownloadOpen(false);
      toast({ title: "Berhasil", description: "Berkas kontak penilai terunduh." });
    } catch {
      toast({
        title: "Gagal mengunduh",
        description: "Coba lagi, atau pastikan Anda masih masuk sebagai Tim Tracer.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
      setDlProgress(null);
    }
  };

  const duplicates = Math.max(stats.total - stats.unique_emails, 0);

  /** Dialog unduhan — dipasang di kedua layar, sama seperti Kelola Mahasiswa. */
  const downloadDialog = (
    <Dialog open={isDownloadOpen} onOpenChange={(open) => !open && !downloading && setDownloadOpen(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unduh Kontak Penilai</DialogTitle>
          <DialogDescription>
            Lingkup unduhan diatur di sini, terpisah dari penyaring tabel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="dl-year">Lulusan</Label>
            <Select value={dlYear} onValueChange={setDlYear}>
              <SelectTrigger id="dl-year"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua angkatan</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y.tahun} value={String(y.tahun)}>Lulusan {y.tahun}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dl-jurusan">Jurusan</Label>
              <Select
                value={dlJurusan}
                onValueChange={(v) => {
                  setDlJurusan(v);
                  // Prodi dilepas bila tidak bernaung di jurusan yang baru;
                  // kombinasi silang selalu menghasilkan berkas kosong.
                  setDlProdi((prev) => {
                    if (prev === ALL || v === ALL) return prev;
                    const p = programs.find((x) => x.code === prev);
                    return p && p.jurusan === v ? prev : ALL;
                  });
                }}
              >
                <SelectTrigger id="dl-jurusan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Semua jurusan</SelectItem>
                  {jurusanNames.map((j) => (
                    <SelectItem key={j} value={j}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dl-prodi">Program studi</Label>
              <Select value={dlProdi} onValueChange={setDlProdi}>
                <SelectTrigger id="dl-prodi"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>
                    {dlJurusan === ALL ? "Semua prodi" : "Semua prodi jurusan ini"}
                  </SelectItem>
                  {dlProdiOptions.map((p) => (
                    <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {downloading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Menyiapkan berkas…</span>
                {dlProgress !== null && <span className="text-muted-foreground">{dlProgress}%</span>}
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${dlProgress ?? 10}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={() => download("csv")} disabled={downloading}>
            CSV (1 lembar)
          </Button>
          <Button onClick={() => download("xlsx")} disabled={downloading}>
            {downloading
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Download className="mr-2 h-4 w-4" />}
            Excel (2 lembar)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // ── Layar kartu angkatan ──────────────────────────────────────────────
  // Halaman ini dimasuki dengan cara yang sama seperti Kelola Mahasiswa dan
  // Kelola Kuesioner: pilih angkatan dulu, baru daftarnya terbuka. Kartunya
  // bertambah sendiri seiring angkatan baru masuk, karena daftar tahunnya
  // datang dari ringkasan tahun, bukan ditulis tetap di dalam kode.
  if (yearSelection === "") {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-bold">Kontak Penilai</h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Atasan, senior, dan rekan kerja yang dituliskan alumni pada bagian akhir kuesioner.
              Pilih angkatan untuk melihat daftarnya.
            </p>
          </div>

          <PilihTahun
            mode="kontak"
            onSelect={(t) => { setYearSelection(t === null ? ALL : String(t)); setPage(1); }}
            onSearch={(q) => { setSearchInput(q); setYearSelection(ALL); setPage(1); }}
            searchPlaceholder="Cari nama kontak, surel, NIM, atau nama alumni..."
            actions={
              <Button className="gap-2 shrink-0" onClick={openDownload} disabled={downloading}>
                {downloading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                {downloading ? "Mengunduh..." : "Unduh"}
              </Button>
            }
          />
        </div>

        {downloadDialog}
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">
              Kontak Penilai
              {yearSelection !== ALL && ` — Lulusan ${yearSelection}`}
            </h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Atasan, senior, dan rekan kerja yang dituliskan alumni pada bagian akhir kuesioner.
              Dipakai untuk mengirim survei penilaian kompetensi alumni.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => { setYearSelection(""); setSearchInput(""); setPage(1); }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              Pilih Angkatan
            </Button>
          </div>

          <Button className="gap-2 shrink-0" onClick={openDownload} disabled={downloading}>
            {downloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Download className="h-4 w-4" />}
            {downloading ? "Mengunduh..." : "Unduh"}
          </Button>
        </div>

        {/* Ringkasan */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="glass-card"><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Contact className="h-8 w-8 text-primary shrink-0" aria-hidden />
              <div>
                <p className="text-2xl font-bold leading-none">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Total kontak</p>
              </div>
            </div>
          </CardContent></Card>

          <Card className="glass-card"><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Mail className="h-8 w-8 text-sky-500 shrink-0" aria-hidden />
              <div>
                <p className="text-2xl font-bold leading-none">{stats.unique_emails}</p>
                {/* Selisihnya adalah orang yang disebut lebih dari satu
                    alumni — persis yang akan menerima surel berkali-kali
                    kalau lembar "Kontak" dipakai mentah-mentah. */}
                <p className="text-xs text-muted-foreground mt-1">
                  Email unik{duplicates > 0 && ` — ${duplicates} alamat kembar`}
                </p>
              </div>
            </div>
          </CardContent></Card>

          <Card className="glass-card"><CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-amber-500 shrink-0" aria-hidden />
              <div>
                <p className="text-2xl font-bold leading-none">{stats.alumni_count}</p>
                <p className="text-xs text-muted-foreground mt-1">Alumni yang mengisi</p>
              </div>
            </div>
          </CardContent></Card>
        </div>

        {/* Penyaring */}
        <Card className="glass-card"><CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                className="pl-9"
                placeholder="Cari nama kontak, surel, NIM, atau nama alumni..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <Select
              value={yearSelection || ALL}
              onValueChange={resetPage((v: string) => setYearSelection(v))}
            >
              <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Tahun Lulus" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Lulusan</SelectItem>
                {years.map((y) => (
                  <SelectItem key={y.tahun} value={String(y.tahun)}>Lulusan {y.tahun}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={jurusan ?? ALL}
              onValueChange={resetPage((v: string) => {
                const next = v === ALL ? null : v;
                setJurusan(next);
                // Prodi yang tidak bernaung di jurusan baru dilepas, supaya
                // kombinasinya tidak menghasilkan daftar kosong tanpa sebab
                // yang terlihat.
                setProgramCode((prev) => {
                  if (!prev || !next) return prev;
                  const p = programs.find((x) => x.code === prev);
                  return p && p.jurusan === next ? prev : null;
                });
              })}
            >
              <SelectTrigger className="w-full lg:w-[190px]"><SelectValue placeholder="Jurusan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Jurusan</SelectItem>
                {jurusanNames.map((j) => (
                  <SelectItem key={j} value={j}>{j}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={programCode ?? ALL}
              onValueChange={resetPage((v: string) => setProgramCode(v === ALL ? null : v))}
            >
              <SelectTrigger className="w-full lg:w-[220px]"><SelectValue placeholder="Program Studi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Prodi</SelectItem>
                {(jurusan ? programs.filter((p) => p.jurusan === jurusan) : programs).map((p) => (
                  <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={alumniStatus ?? ALL}
              onValueChange={resetPage((v: string) => setAlumniStatus(v === ALL ? null : v))}
            >
              <SelectTrigger className="w-full lg:w-[160px]"><SelectValue placeholder="Status Alumni" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Status</SelectItem>
                {Object.entries(ALUMNI_STATUSES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={contactType ?? ALL}
              onValueChange={resetPage((v: string) => setContactType(v === ALL ? null : v))}
            >
              <SelectTrigger className="w-full lg:w-[150px]"><SelectValue placeholder="Tipe Kontak" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Tipe</SelectItem>
                {Object.entries(CONTACT_TYPES).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent></Card>

        {/* Tabel */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">Daftar Kontak ({pagination.total})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Memuat kontak...
              </div>
            ) : isError ? (
              <p className="py-16 text-center text-sm text-destructive">
                Gagal memuat kontak penilai. Muat ulang halaman untuk mencoba lagi.
              </p>
            ) : contacts.length === 0 ? (
              <div className="py-16 text-center">
                <Contact className="mx-auto h-10 w-10 text-muted-foreground/50" aria-hidden />
                <p className="mt-3 text-sm font-medium">Belum ada kontak penilai</p>
                <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
                  Kontak terkumpul sendiri begitu alumni mengisi bagian "Kontak Penilai" di akhir kuesioner.
                  Bagian itu hanya tampil bagi alumni yang bekerja, berwiraswasta, atau melanjutkan pendidikan.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[1080px]">
                  <TableHeader><TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>NIM</TableHead>
                    <TableHead>Nama Alumni</TableHead>
                    <TableHead>Lulus</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Nama Kontak</TableHead>
                    <TableHead>Email Kontak</TableHead>
                    <TableHead>Status Alumni</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {contacts.map((c, i) => {
                      const type = CONTACT_TYPES[c.contact_type] ?? {
                        label: c.contact_type,
                        className: "",
                      };

                      return (
                        <TableRow key={c.id}>
                          <TableCell className="text-muted-foreground">
                            {(pagination.currentPage - 1) * 50 + i + 1}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{c.nim}</TableCell>
                          <TableCell>{c.alumni_name}</TableCell>
                          <TableCell>{c.graduation_year ?? "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.program_name ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={type.className}>{type.label}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{c.contact_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{c.contact_email}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0"
                                onClick={() => copyEmail(c.contact_email)}
                                aria-label={`Salin surel ${c.contact_email}`}
                              >
                                {copied === c.contact_email
                                  ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                                  : <Copy className="h-3.5 w-3.5" aria-hidden />}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.alumni_status ? ALUMNI_STATUSES[c.alumni_status] ?? c.alumni_status : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {pagination.lastPage > 1 && (
              <div className="flex items-center justify-between px-4 pt-4 pb-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Halaman {pagination.currentPage} dari {pagination.lastPage} ({pagination.total} kontak)
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</Button>
                  {Array.from({ length: Math.min(5, pagination.lastPage) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, pagination.lastPage - 4));
                    const p = start + i;
                    if (p > pagination.lastPage) return null;
                    return (
                      <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </Button>
                    );
                  })}
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pagination.lastPage} onClick={() => setPage(page + 1)}>›</Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pagination.lastPage} onClick={() => setPage(pagination.lastPage)}>»</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {downloadDialog}
    </DashboardLayout>
  );
};

export default StakeholderContactsPage;
