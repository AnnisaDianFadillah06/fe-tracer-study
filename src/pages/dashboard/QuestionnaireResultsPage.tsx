import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useRole } from "@/contexts/RoleContext";
import api from "@/lib/api";
import {
  CheckCircle2, Clock, Loader2, Search, Users, XCircle,
} from "lucide-react";

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

  const [forms, setForms] = useState<QForm[]>([]);
  const [programMap, setProgramMap] = useState<Record<number, string>>({});
  const [programJurusanMap, setProgramJurusanMap] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [alumniTotal, setAlumniTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get("/questionnaires");
        if (data.success && data.data) {
          setForms(data.data.filter((f: QForm) => f.status === "published"));
        }
      } catch {
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    api.get("/programs").then(({ data }) => {
      const programs = data.data ?? data;
      if (Array.isArray(programs)) {
        const nameMap: Record<number, string> = {};
        const jurMap: Record<number, string> = {};
        programs.forEach((p: any) => { nameMap[p.id] = p.name; jurMap[p.id] = p.jurusan ?? ""; });
        setProgramMap(nameMap);
        setProgramJurusanMap(jurMap);
      }
    }).catch(() => {});
    api.get("/alumni/stats").then(({ data }) => {
      if (data.success) setAlumniTotal(data.data?.total ?? 0);
    }).catch(() => {});
  }, []);

  // Filter by role scope: kaprodi only sees own prodi + global, kajur sees own jurusan + global
  const scopedForms = useMemo(() => {
    if (currentRole === "kaprodi") {
      return forms.filter((f) => f.is_global || (selectedProdi && programMap[f.program_id!] === selectedProdi));
    }
    if (currentRole === "kajur" && selectedJurusan) {
      return forms.filter((f) => f.is_global || programJurusanMap[f.program_id!] === selectedJurusan);
    }
    return forms; // wadir sees all
  }, [forms, currentRole, selectedProdi, selectedJurusan, programMap, programJurusanMap]);

  const filtered = useMemo(() => {
    if (!search) return scopedForms;
    const q = search.toLowerCase();
    return scopedForms.filter((f) => f.title.toLowerCase().includes(q) || f.code.toLowerCase().includes(q));
  }, [scopedForms, search]);

  const stats = useMemo(() => ({
    total: scopedForms.length,
    totalResponden: scopedForms.reduce((acc, f) => acc + (f.response_count ?? 0), 0),
  }), [scopedForms]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold">Hasil Kuesioner</h2>
          <p className="text-muted-foreground text-sm">
            Daftar kuesioner dan ringkasan responden {selectedProdi ?? ""}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kuesioner Aktif</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Responden</p>
                  <p className="text-2xl font-bold">{stats.totalResponden}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{alumniTotal > 0 ? ((stats.totalResponden / alumniTotal) * 100).toFixed(1) : 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Cari kuesioner berdasarkan judul atau kode..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Memuat kuesioner…</div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && isError && (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-destructive">Gagal memuat kuesioner.</TableCell></TableRow>
                  )}
                  {!isLoading && !isError && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">{search ? "Tidak ada kuesioner yang cocok." : "Belum ada kuesioner."}</TableCell></TableRow>
                  )}
                  {!isLoading && !isError && filtered.map((form, index) => (
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
                          : <Badge variant="outline" className="text-xs">{programMap[form.program_id!] ?? `Prodi #${form.program_id}`}</Badge>
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
