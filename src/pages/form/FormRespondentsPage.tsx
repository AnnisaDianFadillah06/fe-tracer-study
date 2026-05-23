import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import api from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";

interface QuestionnaireDetail {
  id: number;
  code: string;
  title: string;
  description: string | null;
  period_year: number;
  target: string | null;
  response_count: number;
  program_id: number | null;
  is_global: boolean;
}

interface RespondentItem {
  id: number;
  nim: string;
  name: string;
  email: string | null;
  program_id: number | null;
  program_name: string | null;
  jurusan_name: string | null;
  graduation_year: number | null;
  response_id: number | null;
  response_status: string;
  response_submitted_at: string | null;
  response_created_at: string | null;
  response_updated_at: string | null;
}

interface RespondentPaginator {
  data: RespondentItem[];
  total: number;
}

interface Program {
  id: number;
  name: string;
  jurusan: string | null;
}

type StatusFilter = "all" | "ongoing" | "finished";

const formatDateTime = (value: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

const FormRespondentsPage = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [jurusanFilter, setJurusanFilter] = useState("");
  const [prodiFilter, setProdiFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [resetTarget, setResetTarget] = useState<RespondentItem | null>(null);

  const canReset = user?.role === "head_tracer" || user?.role === "tracer_team";

  const questionnaireQuery = useQuery({
    queryKey: ["questionnaire-detail", formId],
    queryFn: async () => {
      const { data } = await api.get(`/questionnaires/${formId}`);
      return data.data as QuestionnaireDetail;
    },
    enabled: !!formId,
  });

  const respondentsQuery = useQuery({
    queryKey: ["questionnaire-respondents", formId, search],
    queryFn: async () => {
      const { data } = await api.get("/alumni", {
        params: { questionnaire_id: formId, search, per_page: 500 },
      });
      return data.data as RespondentPaginator;
    },
    enabled: !!formId,
  });

  const resetMutation = useMutation({
    mutationFn: async (alumniId: number) => {
      await api.post(`/alumni/${alumniId}/reset-response`, {
        questionnaire_id: Number(formId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questionnaire-respondents", formId] });
      setResetTarget(null);
    },
  });

  const programsQuery = useQuery<Program[]>({
    queryKey: ["programs-list"],
    queryFn: async () => {
      const { data } = await api.get("/programs");
      return data.data ?? data;
    },
  });

  const programs = programsQuery.data ?? [];
  const jurusanList = [...new Set(programs.map((p) => p.jurusan).filter(Boolean))] as string[];

  const respondents = useMemo(() => {
    const rows = respondentsQuery.data?.data ?? [];
    return rows.filter((item) => {
      if (statusFilter !== "all" && item.response_status !== statusFilter) return false;
      if (jurusanFilter && jurusanFilter !== "all" && item.jurusan_name !== jurusanFilter) return false;
      if (prodiFilter && prodiFilter !== "all" && String(item.program_id) !== prodiFilter) return false;
      if (yearFilter && yearFilter !== "all" && String(item.graduation_year) !== yearFilter) return false;
      return true;
    });
  }, [respondentsQuery.data?.data, statusFilter, jurusanFilter, prodiFilter, yearFilter]);

  const stats = useMemo(() => {
    const rows = respondentsQuery.data?.data ?? [];
    const finished = rows.filter((r) => r.response_status === "finished").length;
    const ongoing = rows.length - finished;
    return { finished, ongoing };
  }, [respondentsQuery.data?.data]);

  const yearList = useMemo(() => {
    const rows = respondentsQuery.data?.data ?? [];
    return [...new Set(rows.map((r) => r.graduation_year).filter(Boolean))].sort((a, b) => b! - a!) as number[];
  }, [respondentsQuery.data?.data]);

  const isLoading = questionnaireQuery.isLoading || respondentsQuery.isLoading;
  const isError = questionnaireQuery.isError || respondentsQuery.isError;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back button */}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h2 className="font-heading text-2xl font-bold">
            {questionnaireQuery.data?.title ?? "Daftar Responden"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {questionnaireQuery.data?.code
              ? `${questionnaireQuery.data.code} • Tahun ${questionnaireQuery.data.period_year}`
              : "Ringkasan responden kuesioner."}
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ongoing</p>
                  <p className="text-2xl font-bold">{isLoading ? "…" : stats.ongoing}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Finished</p>
                  <p className="text-2xl font-bold">{isLoading ? "…" : stats.finished}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Response Rate</p>
                  <p className="text-2xl font-bold">{isLoading ? "…" : `${stats.ongoing + stats.finished > 0 ? ((stats.finished / (stats.ongoing + stats.finished)) * 100).toFixed(1) : 0}%`}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Cari nama atau NIM..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={jurusanFilter} onValueChange={setJurusanFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Semua Jurusan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jurusan</SelectItem>
                  {jurusanList.map((j) => (
                    <SelectItem key={j} value={j}>{j}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={prodiFilter} onValueChange={setProdiFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Semua Prodi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Prodi</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tahun Lulus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun</SelectItem>
                  {yearList.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Daftar Responden ({respondents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[1000px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>NIM</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Prodi</TableHead>
                    <TableHead>Tahun Lulus</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu Submit</TableHead>
                    {canReset && <TableHead className="w-20">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={canReset ? 9 : 8} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Memuat responden...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && isError && (
                    <TableRow>
                      <TableCell colSpan={canReset ? 9 : 8} className="py-10 text-center text-destructive">
                        Gagal memuat responden.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && !isError && respondents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canReset ? 9 : 8} className="py-10 text-center text-muted-foreground">
                        Tidak ada responden yang cocok dengan filter.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    !isError &&
                    respondents.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell className="font-mono text-sm">{item.nim}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium leading-snug">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.email ?? "-"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.jurusan_name ?? "-"}</TableCell>
                        <TableCell className="text-sm">{item.program_name ?? "-"}</TableCell>
                        <TableCell>{item.graduation_year ?? "-"}</TableCell>
                        <TableCell>
                          {item.response_status === "finished" ? (
                            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Finished
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300">
                              <Clock className="mr-1 h-3.5 w-3.5" />
                              Ongoing
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDateTime(item.response_submitted_at)}</TableCell>
                        {canReset && (
                          <TableCell>
                            {item.response_status === "finished" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setResetTarget(item)}
                              >
                                <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                Reset
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Status Responden</AlertDialogTitle>
            <AlertDialogDescription>
              Anda akan mereset status <strong>{resetTarget?.name}</strong> ({resetTarget?.nim}) dari{" "}
              <strong>Finished</strong> ke <strong>Ongoing</strong>. Jawaban yang sudah disubmit akan dihapus dan alumni
              harus mengisi ulang kuesioner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={resetMutation.isPending}
              onClick={() => resetTarget && resetMutation.mutate(resetTarget.id)}
            >
              {resetMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default FormRespondentsPage;
