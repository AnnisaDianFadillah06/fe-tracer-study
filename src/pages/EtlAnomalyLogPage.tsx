import { useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
  FilterX,
} from "lucide-react";
import { useEtlAnomalyLog, useSemanticRoles } from "@/hooks/useQuestionMappingManagement";

// ---------- Reusable column filter (mirrors QuestionMappingPage's ColFilter) ----------
function ColFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua {label}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const EtlAnomalyLogPage = () => {
  const [etlRunId, setEtlRunId] = useState("");
  const [semanticRole, setSemanticRole] = useState("all");
  const [nim, setNim] = useState("");
  const [page, setPage] = useState(1);

  const { roles } = useSemanticRoles();
  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.role_key, label: r.role_key })),
    [roles],
  );

  const params = useMemo(
    () => ({
      etl_run_id: etlRunId.trim() || undefined,
      semantic_role: semanticRole !== "all" ? semanticRole : undefined,
      nim: nim.trim() || undefined,
      page,
    }),
    [etlRunId, semanticRole, nim, page],
  );

  const { entries, total, currentPage, lastPage, loading, error } = useEtlAnomalyLog(params);

  const anyFilter = !!etlRunId || semanticRole !== "all" || !!nim;
  const resetFilters = () => {
    setEtlRunId("");
    setSemanticRole("all");
    setNim("");
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-primary" />
              Log Anomali ETL
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Jawaban alumni yang gagal dinormalisasi saat ETL berjalan — mis. jawaban teks pada
              role yang mengharapkan angka, atau nilai di luar rentang <code>value_min</code>–
              <code>value_max</code> yang terdaftar. Bersifat informatif/reaktif per run ETL.
            </p>
          </div>
        </div>

        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Daftar Anomali
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Filter berdasarkan run ETL, peran data (semantic role), atau NIM alumni. Semua
              filter opsional &amp; bisa dikombinasikan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-[26px] text-muted-foreground" />
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                  NIM Alumni
                </label>
                <Input
                  value={nim}
                  onChange={(e) => { setNim(e.target.value); setPage(1); }}
                  placeholder="Cari NIM…"
                  className="pl-9 h-8 text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide block mb-1">
                  ETL Run ID
                </label>
                <Input
                  value={etlRunId}
                  onChange={(e) => { setEtlRunId(e.target.value); setPage(1); }}
                  placeholder="Cari run ID…"
                  className="h-8 text-xs"
                />
              </div>
              <ColFilter
                label="Peran Data"
                value={semanticRole}
                options={roleOptions}
                onChange={(v) => { setSemanticRole(v); setPage(1); }}
              />
            </div>

            {anyFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="gap-1.5 text-xs w-fit mt-1"
              >
                <FilterX className="w-3.5 h-3.5" />
                Reset semua filter
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ETL Run</TableHead>
                    <TableHead>NIM</TableHead>
                    <TableHead>Kode Pertanyaan</TableHead>
                    <TableHead>Peran Data</TableHead>
                    <TableHead>Jawaban Mentah</TableHead>
                    <TableHead>Tipe Diharapkan</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                        Memuat data…
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && error && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-destructive py-6">
                        Gagal memuat data: {error}
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && !error && entries.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <code className="text-[11px] font-mono text-muted-foreground">
                          {r.etl_run_id}
                        </code>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.alumni_nim}</TableCell>
                      <TableCell className="font-mono text-xs">{r.question_code}</TableCell>
                      <TableCell>
                        <code className="text-xs font-mono text-primary">{r.semantic_role}</code>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate" title={r.raw_answer ?? ""}>
                        {r.raw_answer ?? <span className="text-muted-foreground italic">kosong</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {r.expected_kind}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <div>{r.reason}</div>
                        {r.detail && (
                          <div className="text-xs text-muted-foreground mt-0.5">{r.detail}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.occurred_at}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && !error && entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                        Tidak ada anomali yang cocok
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Total <span className="font-medium text-foreground">{total}</span> baris anomali
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-xs px-2 tabular-nums">
                  Hal. <span className="font-medium text-foreground">{currentPage}</span> / {lastPage}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={currentPage >= lastPage}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EtlAnomalyLogPage;
