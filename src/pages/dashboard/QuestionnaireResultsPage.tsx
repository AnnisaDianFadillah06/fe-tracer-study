import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useRole } from "@/contexts/RoleContext";
import api from "@/lib/api";
import {
  ArrowLeft, CheckCircle2, Loader2, Search, Users,
} from "lucide-react";
import PilihTahun from "@/components/common/PilihTahun";

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

const QuestionnaireResultsPage = () => {
  const { selectedProdi, selectedJurusan, currentRole } = useRole();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [forms, setForms] = useState<QForm[]>([]);
  const [programMap, setProgramMap] = useState<Record<number, string>>({});
  const [programDegreeMap, setProgramDegreeMap] = useState<Record<number, string>>({});
  const [programJurusanMap, setProgramJurusanMap] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [alumniTotal, setAlumniTotal] = useState(0);
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
  const backToYearCards = () => {
    setSearch("");
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
            if (data.success) setAlumniTotal(data.data?.total ?? 0);
          } else {
            setAlumniTotal(statsRes.data.data?.total ?? 0);
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
      if (data.success) setAlumniTotal(data.data?.total ?? 0);
    }).catch(() => {});
  }, [graduationYear, ready]);

  const scopedForms = useMemo(() => {
    let result = forms;
    if (currentRole === "kaprodi") {
      result = result.filter((f) => f.is_global || (selectedProdi && programMap[f.program_id!] === selectedProdi));
    } else if (currentRole === "kajur" && selectedJurusan) {
      result = result.filter((f) => f.is_global || programJurusanMap[f.program_id!] === selectedJurusan);
    }
    if (graduationYear) {
      result = result.filter((f) => !f.target_graduation_years?.length || f.target_graduation_years.includes(graduationYear));
    }
    return result;
  }, [forms, currentRole, selectedProdi, selectedJurusan, programMap, programJurusanMap, graduationYear]);

  const filtered = useMemo(() => {
    if (!search) return scopedForms;
    const q = search.toLowerCase();
    return scopedForms.filter((f) => f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q));
  }, [scopedForms, search]);

  const stats = useMemo(() => ({
    total: scopedForms.length,
    totalResponden: scopedForms.reduce((acc, f) => acc + (f.response_count ?? 0), 0),
  }), [scopedForms]);

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
                {" — "}{graduationYear === null ? "Semua Angkatan" : `Lulusan ${graduationYear}`}
              </span>
            </h2>
            <p className="text-muted-foreground text-sm">Daftar kuesioner dan ringkasan responden</p>
          </div>
          <Button variant="outline" size="sm" onClick={backToYearCards} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
            Pilih Angkatan
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-xs text-muted-foreground">Kuesioner Aktif</p><p className="text-2xl font-bold">{stats.total}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
            <div><p className="text-xs text-muted-foreground">Total Mahasiswa</p><p className="text-2xl font-bold">{alumniTotal}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-xs text-muted-foreground">Total Responden</p><p className="text-2xl font-bold">{stats.totalResponden}</p></div>
          </div></CardContent></Card>
          <Card><CardContent className="pt-4 pb-4"><div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-xs text-muted-foreground">Response Rate</p><p className="text-2xl font-bold">{alumniTotal > 0 ? ((stats.totalResponden / alumniTotal) * 100).toFixed(1) : 0}%</p></div>
          </div></CardContent></Card>
        </div>

        {/* Search + Filter */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Cari kuesioner berdasarkan judul atau kode..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
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

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base">Daftar Kuesioner ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead>Program Studi</TableHead>
                    <TableHead>Sasaran</TableHead>
                    <TableHead>Responden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground"><div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Memuat kuesioner…</div></TableCell></TableRow>
                  ) : isError ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-destructive">Gagal memuat kuesioner.</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{search ? "Tidak ada kuesioner yang cocok." : "Belum ada kuesioner."}</TableCell></TableRow>
                  ) : filtered.map((form, index) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium leading-snug">{form.title}</p>
                          <p className="text-xs text-muted-foreground">{form.code} • {(form.sections ?? []).length} bagian</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {form.is_global
                          ? <Badge variant="secondary" className="text-xs">Semua Prodi</Badge>
                          : <Badge variant="outline" className="text-xs">{programMap[form.program_id!] ?? `Prodi #${form.program_id}`}{programDegreeMap[form.program_id!] ? ` (${programDegreeMap[form.program_id!]})` : ""}</Badge>
                        }
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {form.target_graduation_years?.length
                            ? `Lulusan ${form.target_graduation_years.join(", ")}`
                            : form.target || `Lulusan ${form.period_year}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="link" className="p-0 h-auto font-medium" onClick={() => navigate(`/dashboard/questionnaire-results/${form.id}`)}>
                          <Users className="mr-1 h-4 w-4" />{form.response_count ?? 0} responden
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default QuestionnaireResultsPage;
