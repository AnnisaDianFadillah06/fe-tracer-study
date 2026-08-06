import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Check, Contact, Copy, Download, Loader2, Mail, Search, Users } from "lucide-react";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import { useRingkasanTahun } from "@/hooks/useRingkasanTahun";
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

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [graduationYear, setGraduationYear] = useState<number | null>(null);
  const [alumniStatus, setAlumniStatus] = useState<string | null>(null);
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

  const activeFilters = { search, graduationYear, alumniStatus, contactType, programCode };
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
   * Unduhan mengikuti penyaring yang sedang aktif — parameternya persis sama
   * dengan yang dipakai tabel, sehingga isi berkas selalu sama dengan yang
   * terlihat di layar.
   */
  const download = async (format: "xlsx" | "csv") => {
    setDownloading(true);
    try {
      const response = await api.get("/stakeholder-contacts/export", {
        params: { ...stakeholderQueryParams(activeFilters), format },
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kontak_penilai_${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: "Gagal mengunduh",
        description: "Coba lagi, atau pastikan Anda masih masuk sebagai Tim Tracer.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const duplicates = Math.max(stats.total - stats.unique_emails, 0);

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold">Kontak Penilai</h1>
            <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
              Atasan, senior, dan rekan kerja yang dituliskan alumni pada bagian akhir kuesioner.
              Dipakai untuk mengirim survei penilaian kompetensi alumni.
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 shrink-0" disabled={downloading || stats.total === 0}>
                {downloading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                {downloading ? "Mengunduh..." : "Unduh"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuItem onClick={() => download("xlsx")} className="flex-col items-start gap-0.5">
                <span className="font-medium">Excel (2 lembar)</span>
                <span className="text-xs text-muted-foreground">
                  Lembar "Kontak" untuk surel yang dipersonalisasi, lembar "Email Unik" tanpa alamat kembar.
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => download("csv")} className="flex-col items-start gap-0.5">
                <span className="font-medium">CSV (1 lembar)</span>
                <span className="text-xs text-muted-foreground">
                  Daftar datar, untuk ditempel ke perkakas lain.
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              value={graduationYear === null ? ALL : String(graduationYear)}
              onValueChange={resetPage((v: string) => setGraduationYear(v === ALL ? null : Number(v)))}
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
              value={programCode ?? ALL}
              onValueChange={resetPage((v: string) => setProgramCode(v === ALL ? null : v))}
            >
              <SelectTrigger className="w-full lg:w-[220px]"><SelectValue placeholder="Program Studi" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Semua Prodi</SelectItem>
                {programs.map((p) => (
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
    </DashboardLayout>
  );
};

export default StakeholderContactsPage;
