import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRole } from "@/contexts/RoleContext";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import { exportQuestionnaire, type ExportFormat, type ExportProgress } from "@/lib/exportQuestionnaire";
import ExportProgressDialog from "@/components/common/ExportProgressDialog";
import {
  ArrowLeft, CheckCircle2, FileSpreadsheet, Search, Users,
} from "lucide-react";
import PilihTahun from "@/components/common/PilihTahun";
import TablePagination from "@/components/common/TablePagination";

/** Kartu per halaman pada tiap kelompok kuesioner. */
const PER_PAGE = 100;

interface QForm {
  id: number;
  title: string;
  code: string;
  status: string;
  period_year: number;
  target?: string;
  target_graduation_years?: number[];
  program_id: number | null;
  is_global: boolean;
  response_count: number;
  sections?: any[];
}

interface SectionProps {
  title: string;
  description: string;
  forms: QForm[];
  emptyText: string;
  isLoading: boolean;
  isError: boolean;
  programMap: Record<number, string>;
  programDegreeMap: Record<number, string>;
  exportingId: number | null;
  onExport: (form: QForm, format?: ExportFormat) => void;
  onOpenRespondents: (id: number) => void;
}

/**
 * Satu kelompok kuesioner beserta pencarian dan paginasinya sendiri.
 *
 * Keduanya dipisah per bagian, bukan dibagi satu untuk seluruh halaman:
 * jumlah kuesioner tambahan prodi bisa mencapai ratusan sementara yang
 * berlaku untuk semua prodi hanya segelintir. Satu kotak pencarian bersama
 * akan ikut menyaring kelompok yang tidak sedang dicari, dan satu penomoran
 * bersama mendorong kelompok kecil ke halaman belakang.
 */
const KuesionerSection = ({
  title, description, forms, emptyText, isLoading, isError,
  programMap, programDegreeMap, exportingId, onExport, onOpenRespondents,
}: SectionProps) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search) return forms;
    const q = search.toLowerCase();
    return forms.filter((f) => f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q));
  }, [forms, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  // Daftarnya menyusut saat pencarian atau cakupan berubah; tanpa ini
  // halaman bisa tertinggal di luar rentang dan petaknya tampil kosong.
  useEffect(() => { setPage(1); }, [search, forms]);

  const pageForms = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  const prodiLabel = (form: QForm) => {
    const name = programMap[form.program_id!] ?? `Prodi #${form.program_id}`;
    const degree = programDegreeMap[form.program_id!];
    return degree ? `${name} (${degree})` : name;
  };

  const sasaranLabel = (form: QForm) =>
    form.target_graduation_years?.length
      ? `Lulusan ${form.target_graduation_years.join(", ")}`
      : form.target || `Lulusan ${form.period_year}`;

  return (
    <section className="space-y-3">
      <div className="space-y-3">
        <div>
          <h3 className="font-heading text-lg font-semibold">{title} ({forms.length})</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {forms.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari kuesioner berdasarkan judul atau kode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={`Cari di ${title}`}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5 pb-5 space-y-3">
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-full" />
            </CardContent></Card>
          ))}
        </div>
      ) : isError ? (
        <Card><CardContent className="py-10 text-center text-destructive">
          Gagal memuat kuesioner.
        </CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-10 text-center text-muted-foreground">
          {search ? "Tidak ada kuesioner yang cocok." : emptyText}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pageForms.map((form) => {
            const responden = form.response_count ?? 0;
            const tanpaResponden = responden === 0;

            return (
              <Card key={form.id} className="flex flex-col transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-1 flex-col gap-4 pt-5 pb-5">
                  <div className="space-y-1.5">
                    <h4 className="font-semibold leading-snug">{form.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{form.code}</span> • {(form.sections ?? []).length} bagian
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {form.is_global
                      ? <Badge variant="secondary" className="text-xs">Semua Prodi</Badge>
                      : <Badge variant="outline" className="text-xs">{prodiLabel(form)}</Badge>}
                    <span className="text-xs text-muted-foreground">{sasaranLabel(form)}</span>
                  </div>

                  {/* Jumlah responden ditaruh di kaki kartu sebagai angka yang
                      menonjol: inilah satu-satunya alasan halaman ini dibuka,
                      dan sekaligus tautan ke daftar respondennya. */}
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-border/60 pt-4">
                    <button
                      type="button"
                      onClick={() => onOpenRespondents(form.id)}
                      className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                    >
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tabular-nums group-hover:text-primary transition-colors">
                          {responden}
                        </span>
                        <span className="text-xs text-muted-foreground">responden</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Users className="h-3 w-3" aria-hidden />
                        Lihat daftar
                      </span>
                    </button>

                    {/* Backend membatasi isinya sendiri sesuai role: wadir dapat
                        seluruh prodi, kajur hanya jurusannya, kaprodi hanya
                        prodinya. Kuesioner yang berlaku untuk semua prodi
                        menawarkan dua format karena filenya juga dipakai untuk
                        unggah ke portal. */}
                    {form.is_global ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={exportingId === form.id || tanpaResponden}
                            title={tanpaResponden ? "Tidak ada responden untuk diekspor" : "Export ke Excel"}
                          >
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            {exportingId === form.id ? "Mengekspor…" : "Export"}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuItem onClick={() => onExport(form, "label")}>
                            Teks jawaban (untuk dibaca)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onExport(form, "code")}>
                            Kode mentah (untuk unggah DIKTI)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={exportingId === form.id || tanpaResponden}
                        title={tanpaResponden ? "Tidak ada responden untuk diekspor" : "Export ke Excel"}
                        onClick={() => onExport(form)}
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        {exportingId === form.id ? "Mengekspor…" : "Export"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filtered.length > PER_PAGE && (
        <Card><CardContent className="p-0">
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            perPage={PER_PAGE}
            itemLabel="kuesioner"
            onPageChange={setPage}
          />
        </CardContent></Card>
      )}
    </section>
  );
};

const QuestionnaireResultsPage = () => {
  const { selectedProdi, selectedProdiId, selectedJurusan, currentRole } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exportingId, setExportingId] = useState<number | null>(null);
  /**
   * Kemajuan ekspor yang sedang berjalan; null bila tidak ada. Judul dan
   * format disimpan terpisah supaya dialognya bisa menyebut berkas mana yang
   * sedang disusun — label tombol saja tidak cukup, dialognya menutupi tabel.
   */
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportLabel, setExportLabel] = useState("");
  const [exportRawCode, setExportRawCode] = useState(false);

  const [forms, setForms] = useState<QForm[]>([]);
  const [programMap, setProgramMap] = useState<Record<number, string>>({});
  const [programDegreeMap, setProgramDegreeMap] = useState<Record<number, string>>({});
  const [programJurusanMap, setProgramJurusanMap] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [alumniTotal, setAlumniTotal] = useState(0);
  /**
   * Jumlah ALUMNI yang sudah mengisi — bukan jumlah kiriman.
   *
   * Sebelumnya kartu ini menjumlahkan response_count tiap kuesioner. Satu
   * alumni yang mengisi kuesioner wajib DAN kuesioner prodi terhitung dua
   * kali, sehingga satu orang dari dua alumni tampil sebagai "2 responden,
   * 100%" padahal 1 orang, 50%. Angkanya kini diambil dari /alumni/stats
   * yang sudah menghitung alumni distinct, sumber yang sama dengan kartu
   * tahun dan halaman Data Alumni supaya ketiganya tidak saling bertentangan.
   */
  const [alumniAnswered, setAlumniAnswered] = useState(0);
  const [graduationYears, setGraduationYears] = useState<number[]>([]);
  const [ready, setReady] = useState(false);

  // Read graduation year from URL or null (will be set to default after fetch)
  const yearParam = searchParams.get("year");
  const graduationYear = yearParam === "all" ? null : yearParam ? Number(yearParam) : undefined; // undefined = not yet initialized

  const setGraduationYear = (y: number | null) => {
    const params = new URLSearchParams(searchParams);
    if (y === null) { params.set("year", "all"); } else { params.set("year", String(y)); }
    setSearchParams(params, { replace: true });
  };

  // Kembali ke layar kartu tahun: buang parameternya dari URL.
  //
  // Kotak pencarian tidak perlu dikosongkan di sini lagi: keduanya kini
  // milik masing-masing bagian, dan bagian itu ikut dilepas dari pohon
  // begitu layar kartu tahun kembali tampil.
  const backToYearCards = () => {
    setSearchParams(new URLSearchParams(), { replace: false });
  };

  // Fetch forms + programs + graduation_years — HANYA setelah angkatan
  // dipilih. Daftar kuesioner berukuran ~279 KB, jadi tidak ditarik selama
  // pengguna masih berada di layar kartu tahun.
  useEffect(() => {
    if (graduationYear === undefined) return;

    const init = async () => {
      setIsLoading(true);
      try {
        const [formsRes, progsRes, statsRes] = await Promise.all([
          api.get("/questionnaires"),
          api.get("/programs"),
          api.get("/alumni/stats"),
        ]);
        if (formsRes.data.success && formsRes.data.data) {
          setForms(formsRes.data.data.filter((f: QForm) => f.status === "published"));
        }
        const programs = progsRes.data.data ?? progsRes.data;
        if (Array.isArray(programs)) {
          const nameMap: Record<number, string> = {};
          const degMap: Record<number, string> = {};
          const jurMap: Record<number, string> = {};
          programs.forEach((p: any) => { nameMap[p.id] = p.name; degMap[p.id] = p.degree ?? ""; jurMap[p.id] = p.jurusan ?? ""; });
          setProgramMap(nameMap);
          setProgramDegreeMap(degMap);
          setProgramJurusanMap(jurMap);
        }
        if (statsRes.data.success) {
          setGraduationYears(statsRes.data.data?.graduation_years ?? []);

          // Total alumni pada angkatan terpilih, untuk kartu ringkasan.
          if (graduationYear !== null) {
            const { data } = await api.get("/alumni/stats", { params: { graduation_year: graduationYear } });
            if (data.success) {
              setAlumniTotal(data.data?.total ?? 0);
              setAlumniAnswered(data.data?.answered ?? 0);
            }
          } else {
            setAlumniTotal(statsRes.data.data?.total ?? 0);
            setAlumniAnswered(statsRes.data.data?.answered ?? 0);
          }
        }
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
        setReady(true);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graduationYear === undefined]);

  // Re-fetch alumni total when graduation year changes (after initial load)
  useEffect(() => {
    if (!ready || graduationYear === undefined) return;
    const params: Record<string, unknown> = {};
    if (graduationYear !== null) params.graduation_year = graduationYear;
    api.get("/alumni/stats", { params }).then(({ data }) => {
      if (data.success) {
        setAlumniTotal(data.data?.total ?? 0);
        setAlumniAnswered(data.data?.answered ?? 0);
      }
    }).catch(() => {});
  }, [graduationYear, ready]);

  const scopedForms = useMemo(() => {
    let result = forms;
    if (currentRole === "kaprodi") {
      // Dicocokkan dengan id prodi, bukan namanya. Tujuh nama prodi dipakai
      // dua jenjang sekaligus, sehingga pencocokan nama membuat kaprodi D3
      // ikut melihat kuesioner milik D4.
      result = result.filter((f) => f.is_global || (selectedProdiId !== null && f.program_id === selectedProdiId));
    } else if (currentRole === "kajur" && selectedJurusan) {
      result = result.filter((f) => f.is_global || programJurusanMap[f.program_id!] === selectedJurusan);
    }
    if (graduationYear) {
      result = result.filter((f) => !f.target_graduation_years?.length || f.target_graduation_years.includes(graduationYear));
    }
    return result;
  }, [forms, currentRole, selectedProdiId, selectedJurusan, programJurusanMap, graduationYear]);

  /**
   * Dua kelompok kuesioner, dipisah menurut `program_id` — persis pemisahan
   * yang dikehendaki KSN-01: kuesioner tanpa patokan prodi berlaku untuk
   * seluruh lulusan, kuesioner ber-`program_id` adalah tambahan milik satu
   * prodi.
   *
   * Namanya sengaja "Semua Prodi", bukan "Kementerian". Yang benar-benar
   * dicatat basis data hanyalah ada atau tidaknya patokan prodi; kuesioner
   * buatan sendiri yang disasarkan ke semua prodi juga masuk kelompok ini,
   * jadi menyebutnya kementerian akan mengklaim asal-usul yang tidak
   * dipegang datanya.
   */
  const formsSemuaProdi = useMemo(() => scopedForms.filter((f) => f.is_global), [scopedForms]);
  const formsTambahan = useMemo(() => scopedForms.filter((f) => !f.is_global), [scopedForms]);

  const handleExport = async (form: QForm, format: ExportFormat = "label") => {
    setExportingId(form.id);
    setExportLabel(form.title);
    setExportRawCode(format === "code");
    const result = await exportQuestionnaire(form, format, setExportProgress);
    setExportingId(null);
    setExportProgress(null);

    toast({
      title: result.ok ? "Export berhasil" : "Gagal",
      description: result.message,
      variant: result.ok ? undefined : "destructive",
    });
  };

  // ── Layar kartu tahun ────────────────────────────────────────────────
  if (graduationYear === undefined) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-heading font-bold">Hasil Kuesioner</h2>
            <p className="text-muted-foreground text-sm">
              Pilih angkatan untuk melihat kuesioner dan ringkasan respondennya
            </p>
          </div>
          <PilihTahun mode="kuesioner" onSelect={setGraduationYear} />
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
              Hasil Kuesioner
              <span className="text-muted-foreground font-normal">
                {" — "}{graduationYear === null ? "Semua Lulusan" : `Lulusan ${graduationYear}`}
              </span>
            </h2>
            <p className="text-muted-foreground text-sm">Daftar kuesioner dan ringkasan responden</p>
          </div>
          <Button variant="outline" size="sm" onClick={backToYearCards} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
            Pilih Tahun Lulusan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Kuesioner Semua Prodi</p><p className="text-2xl font-bold">{formsSemuaProdi.length}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center"><FileSpreadsheet className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-xs text-muted-foreground">Kuesioner Tambahan Prodi</p><p className="text-2xl font-bold">{formsTambahan.length}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Total Mahasiswa</p><p className="text-2xl font-bold">{alumniTotal}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Responden</p><p className="text-2xl font-bold">{alumniAnswered}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-xs text-muted-foreground">Response Rate</p><p className="text-2xl font-bold">{alumniTotal > 0 ? ((alumniAnswered / alumniTotal) * 100).toFixed(1) : 0}%</p></div>
          </div></CardContent></Card>
        </div>

        {/* Penyaring tahun lulus — berlaku untuk kedua kelompok di bawah,
            jadi tetap satu di atas. Pencarian TIDAK ikut di sini: masing-
            masing kelompok punya kotaknya sendiri. */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Kuesioner dipisah menurut cakupannya: yang berlaku bagi seluruh lulusan, dan tambahan milik satu program studi.
              </p>
              <Select value={graduationYear === undefined ? "" : graduationYear === null ? "all" : String(graduationYear)} onValueChange={(v) => setGraduationYear(v === "all" ? null : Number(v))}>
                <SelectTrigger className="w-[170px]"><SelectValue placeholder="Tahun Lulus" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Lulusan</SelectItem>
                  {graduationYears.map((y) => <SelectItem key={y} value={String(y)}>Lulusan {y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <KuesionerSection
          title="Kuesioner Semua Prodi"
          description="Berlaku bagi seluruh lulusan, tanpa patokan program studi — termasuk kuesioner standar tracer study nasional."
          forms={formsSemuaProdi}
          emptyText="Belum ada kuesioner yang berlaku untuk semua prodi."
          isLoading={isLoading}
          isError={isError}
          programMap={programMap}
          programDegreeMap={programDegreeMap}
          exportingId={exportingId}
          onExport={handleExport}
          onOpenRespondents={(id) => navigate(`/dashboard/questionnaire-results/${id}`)}
        />

        <KuesionerSection
          title="Kuesioner Tambahan Prodi"
          description="Disasarkan ke satu program studi tertentu, di luar pertanyaan yang berlaku untuk semua lulusan."
          forms={formsTambahan}
          emptyText="Belum ada kuesioner tambahan program studi."
          isLoading={isLoading}
          isError={isError}
          programMap={programMap}
          programDegreeMap={programDegreeMap}
          exportingId={exportingId}
          onExport={handleExport}
          onOpenRespondents={(id) => navigate(`/dashboard/questionnaire-results/${id}`)}
        />
      </div>
      <ExportProgressDialog
        progress={exportProgress}
        label={exportLabel}
        rawCode={exportRawCode}
      />
    </DashboardLayout>
  );
};

export default QuestionnaireResultsPage;
