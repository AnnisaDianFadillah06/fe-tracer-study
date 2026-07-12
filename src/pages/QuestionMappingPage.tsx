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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Eye,
  Check,
  Link2,
  ListChecks,
  Info,
  History,
  FileText,
  ArrowRight,
  CircleHelp,
  Search,
  ChevronLeft,
  ChevronRight,
  FilterX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ---------- Mock domain data ----------
type UnmappedCode = {
  code: string; // e.g. "f8_new"
  label: string;         // internal label (badge in the list)
  questionText: string;  // full question text as displayed to alumni
  sampleAnswers: string[];
  suggestedRole?: string;
};

const KUESIONER = [
  { id: "ts2026", name: "Tracer Study 2026" },
  { id: "ts2025", name: "Tracer Study 2025" },
  { id: "ts2024", name: "Tracer Study 2024" },
];

const SEMANTIC_ROLES = [
  { id: "status_pekerjaan", label: "status_pekerjaan", desc: "Status utama pekerjaan lulusan" },
  { id: "jenis_pekerjaan", label: "jenis_pekerjaan", desc: "Kategori/jenis pekerjaan" },
  { id: "masa_tunggu", label: "masa_tunggu", desc: "Waktu tunggu memperoleh pekerjaan" },
  { id: "pendapatan", label: "pendapatan", desc: "Besaran gaji/pendapatan bulanan" },
  { id: "relevansi_bidang", label: "relevansi_bidang", desc: "Kesesuaian pekerjaan dengan bidang studi" },
  { id: "lokasi_kerja", label: "lokasi_kerja", desc: "Provinsi / kota tempat bekerja" },
  { id: "sumber_biaya", label: "sumber_biaya", desc: "Sumber pembiayaan kuliah" },
];

const UNMAPPED: Record<string, UnmappedCode[]> = {
  ts2026: [
    {
      code: "f8_new",
      label: "f8 new — belum termapping",
      questionText:
        "Apa status Anda saat ini terkait pekerjaan? (Pilih salah satu yang paling menggambarkan kondisi Anda saat ini)",
      sampleAnswers: ["Bekerja penuh waktu", "Wiraswasta / usaha sendiri", "Sedang mencari kerja"],
      suggestedRole: "status_pekerjaan",
    },
    {
      code: "f12_v2",
      label: "f12 v2 — belum termapping",
      questionText:
        "Berapa lama waktu yang Anda butuhkan sejak lulus hingga mendapatkan pekerjaan pertama?",
      sampleAnswers: ["< 3 bulan", "3–6 bulan", "> 12 bulan"],
      suggestedRole: "masa_tunggu",
    },
    {
      code: "f21_new",
      label: "f21 new — belum termapping",
      questionText:
        "Seberapa sesuai pekerjaan Anda saat ini dengan bidang studi yang Anda ambil semasa kuliah?",
      sampleAnswers: ["Sangat sesuai", "Sesuai", "Tidak sesuai"],
      suggestedRole: "relevansi_bidang",
    },
  ],
  ts2025: [],
  ts2024: [],
};

// ---------- Panel 2: status → kategori KPI ----------
// Dynamic per semantic_role. Only roles that need bucketing into KPI categories
// appear in Panel 2. For roles yang bersifat numerik/ordinal murni (masa_tunggu,
// pendapatan) tidak perlu grouping — Panel 2 memberikan info khusus.
type Kategori = string;
type StatusRow = { label: string; kategori: Kategori; isNew?: boolean };

type RoleGrouping = {
  needsGrouping: boolean;
  kpiName?: string;
  categories?: { id: string; label: string; tone: "good" | "bad" | "neutral" }[];
  rows?: StatusRow[];
  hint?: string;
};

const ROLE_GROUPINGS: Record<string, RoleGrouping> = {
  status_pekerjaan: {
    needsGrouping: true,
    kpiName: "IKU 2 — Keterserapan Lulusan",
    categories: [
      { id: "terserap", label: "masuk terserap", tone: "good" },
      { id: "tidak", label: "tidak terserap", tone: "bad" },
      { id: "belum", label: "belum dikelompokkan", tone: "neutral" },
    ],
    rows: [
      { label: "Bekerja penuh waktu", kategori: "terserap" },
      { label: "Wiraswasta / usaha sendiri", kategori: "terserap" },
      { label: "Melanjutkan pendidikan", kategori: "terserap" },
      { label: "Freelance / kerja lepas", kategori: "belum", isNew: true },
      { label: "Sedang mencari kerja", kategori: "tidak" },
    ],
  },
  relevansi_bidang: {
    needsGrouping: true,
    kpiName: "Relevansi Bidang Kerja",
    categories: [
      { id: "sesuai", label: "relevan", tone: "good" },
      { id: "tidak", label: "tidak relevan", tone: "bad" },
      { id: "belum", label: "belum dikelompokkan", tone: "neutral" },
    ],
    rows: [
      { label: "Sangat sesuai", kategori: "sesuai" },
      { label: "Sesuai", kategori: "sesuai" },
      { label: "Kurang sesuai", kategori: "belum", isNew: true },
      { label: "Tidak sesuai", kategori: "tidak" },
    ],
  },
  masa_tunggu: {
    needsGrouping: false,
    hint:
      "Semantic role ini bersifat ordinal — nilai akan diproses langsung sebagai rentang waktu. Tidak perlu pengelompokan kategori.",
  },
  pendapatan: {
    needsGrouping: false,
    hint:
      "Semantic role ini bersifat numerik — nilai akan diagregasi langsung sebagai besaran pendapatan. Tidak perlu pengelompokan kategori.",
  },
  jenis_pekerjaan: {
    needsGrouping: true,
    kpiName: "Distribusi Jenis Pekerjaan",
    categories: [
      { id: "formal", label: "sektor formal", tone: "good" },
      { id: "informal", label: "sektor informal", tone: "neutral" },
      { id: "belum", label: "belum dikelompokkan", tone: "neutral" },
    ],
    rows: [
      { label: "Karyawan swasta", kategori: "formal" },
      { label: "PNS / ASN", kategori: "formal" },
      { label: "Buruh harian", kategori: "informal" },
      { label: "Content creator", kategori: "belum", isNew: true },
    ],
  },
  lokasi_kerja: {
    needsGrouping: false,
    hint:
      "Semantic role ini menggunakan referensi wilayah (Master Provinsi/Kota). Tidak perlu pengelompokan kategori manual.",
  },
  sumber_biaya: {
    needsGrouping: true,
    kpiName: "Distribusi Sumber Pembiayaan",
    categories: [
      { id: "mandiri", label: "mandiri", tone: "neutral" },
      { id: "beasiswa", label: "beasiswa", tone: "good" },
      { id: "belum", label: "belum dikelompokkan", tone: "neutral" },
    ],
    rows: [
      { label: "Biaya sendiri / keluarga", kategori: "mandiri" },
      { label: "Beasiswa KIP-K", kategori: "beasiswa" },
      { label: "Beasiswa perusahaan", kategori: "beasiswa" },
      { label: "Pinjaman pendidikan", kategori: "belum", isNew: true },
    ],
  },
};

const toneClass = (tone: "good" | "bad" | "neutral") => {
  const map = {
    terserap:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bad: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
    neutral: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  } as const;
  return map[tone];
};

const KategoriBadge = ({
  k,
  grouping,
}: {
  k: Kategori;
  grouping: RoleGrouping;
}) => {
  const cat = grouping.categories?.find((c) => c.id === k);
  if (!cat) return null;
  return (
    <Badge variant="outline" className={toneClass(cat.tone)}>
      {cat.label}
    </Badge>
  );
};

// ---------- Mock "already saved" data for Tab 2 ----------
type SavedCodeMapping = {
  kuesioner: string;
  code: string;
  questionText: string;
  semanticRole: string;
  tipeData: string;
  kolomOlap: string;
  lamVersion: string;
  activatedAt: string;
  status: "Aktif" | "Nonaktif";
  dipetakanOleh: string;
};
type SavedStatusMapping = {
  semanticRole: string;
  sumberKode: string;
  status: string;
  kategori: string;
  kpi: string;
  lamVersion: string;
  activatedAt: string;
  statusAktif: "Aktif" | "Nonaktif";
  dikelompokkanOleh: string;
};

const SAVED_CODES: SavedCodeMapping[] = [
  {
    kuesioner: "Tracer Study 2025",
    code: "f8",
    questionText: "Status Anda saat ini terkait pekerjaan?",
    semanticRole: "status_pekerjaan",
    tipeData: "kategorikal",
    kolomOlap: "fact_tracer_study.status_pekerjaan",
    lamVersion: "2025",
    activatedAt: "2025-01-14",
    status: "Aktif",
    dipetakanOleh: "Annisa (Pelaksana TS)",
  },
  {
    kuesioner: "Tracer Study 2025",
    code: "f12",
    questionText: "Berapa lama waktu tunggu Anda mendapatkan pekerjaan pertama?",
    semanticRole: "masa_tunggu",
    tipeData: "integer (bulan) · 0–60",
    kolomOlap: "fact_tracer_study.masa_tunggu_bekerjaan",
    lamVersion: "2025",
    activatedAt: "2025-01-14",
    status: "Aktif",
    dipetakanOleh: "Annisa (Pelaksana TS)",
  },
  {
    kuesioner: "Tracer Study 2025",
    code: "f18",
    questionText: "Berapa pendapatan bulanan Anda saat ini?",
    semanticRole: "pendapatan",
    tipeData: "numeric (IDR) · ≥ 0",
    kolomOlap: "fact_tracer_study.pendapatan_bulanan",
    lamVersion: "2025",
    activatedAt: "2025-01-14",
    status: "Aktif",
    dipetakanOleh: "Annisa (Pelaksana TS)",
  },
  {
    kuesioner: "Tracer Study 2024",
    code: "q7",
    questionText: "Apa jenis pekerjaan utama Anda?",
    semanticRole: "jenis_pekerjaan",
    tipeData: "kategorikal",
    kolomOlap: "fact_tracer_study.jenis_pekerjaan",
    lamVersion: "2024",
    activatedAt: "2024-02-03",
    status: "Aktif",
    dipetakanOleh: "Budi (Pelaksana TS)",
  },
  {
    kuesioner: "Tracer Study 2024",
    code: "q21",
    questionText: "Sumber pembiayaan kuliah Anda selama menempuh studi?",
    semanticRole: "sumber_biaya",
    tipeData: "kategorikal (multi-select)",
    kolomOlap: "fact_tracer_study.sumber_biaya",
    lamVersion: "2024",
    activatedAt: "2024-02-03",
    status: "Nonaktif",
    dipetakanOleh: "Budi (Pelaksana TS)",
  },
];

const SAVED_STATUS: SavedStatusMapping[] = [
  {
    semanticRole: "status_pekerjaan",
    sumberKode: "f8, f8_new",
    status: "Bekerja penuh waktu",
    kategori: "masuk terserap",
    kpi: "IKU 2 — Keterserapan",
    lamVersion: "2025",
    activatedAt: "2025-01-14",
    statusAktif: "Aktif",
    dikelompokkanOleh: "Pa Ade (Kaprodi)",
  },
  {
    semanticRole: "status_pekerjaan",
    sumberKode: "f8",
    status: "Wiraswasta",
    kategori: "masuk terserap",
    kpi: "IKU 2 — Keterserapan",
    lamVersion: "2025",
    activatedAt: "2025-01-14",
    statusAktif: "Aktif",
    dikelompokkanOleh: "Pa Ade (Kaprodi)",
  },
  {
    semanticRole: "status_pekerjaan",
    sumberKode: "f8",
    status: "Sedang mencari kerja",
    kategori: "tidak terserap",
    kpi: "IKU 2 — Keterserapan",
    lamVersion: "2025",
    activatedAt: "2025-01-14",
    statusAktif: "Aktif",
    dikelompokkanOleh: "Pa Ade (Kaprodi)",
  },
  {
    semanticRole: "sumber_biaya",
    sumberKode: "q21",
    status: "Beasiswa KIP-K",
    kategori: "beasiswa",
    kpi: "Distribusi Sumber Pembiayaan",
    lamVersion: "2024",
    activatedAt: "2024-02-03",
    statusAktif: "Aktif",
    dikelompokkanOleh: "Bu Sinta (P2MPP)",
  },
  {
    semanticRole: "jenis_pekerjaan",
    sumberKode: "q7",
    status: "PNS / ASN",
    kategori: "sektor formal",
    kpi: "Distribusi Jenis Pekerjaan",
    lamVersion: "2024",
    activatedAt: "2024-02-03",
    statusAktif: "Aktif",
    dikelompokkanOleh: "Bu Sinta (P2MPP)",
  },
];

const QuestionMappingPage = () => {
  const { toast } = useToast();

  // Panel 1 state
  const [kuesioner, setKuesioner] = useState<string>("ts2026");
  const unmapped = UNMAPPED[kuesioner] ?? [];
  const [selectedCode, setSelectedCode] = useState<string>(unmapped[0]?.code ?? "");
  const activeCode = useMemo(
    () => unmapped.find((u) => u.code === selectedCode) ?? unmapped[0],
    [unmapped, selectedCode],
  );
  const [selectedRole, setSelectedRole] = useState<string>(
    activeCode?.suggestedRole ?? SEMANTIC_ROLES[0].id,
  );
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mappedCodes, setMappedCodes] = useState<string[]>([]);
  const [activatedRole, setActivatedRole] = useState<string | null>(null);

  const remainingUnmapped = unmapped.filter((u) => !mappedCodes.includes(u.code));

  const onActivate = () => {
    if (!activeCode) return;
    setMappedCodes((prev) => [...prev, activeCode.code]);
    setActivatedRole(selectedRole);
    // seed Panel 2 rows for this role (only if grouping is needed)
    const g = ROLE_GROUPINGS[selectedRole];
    if (g?.needsGrouping && g.rows) {
      setStatusRows(g.rows);
    }
    toast({
      title: "Mapping diaktifkan",
      description: `${activeCode.code} → ${selectedRole}. Berlaku untuk ETL run berikutnya.`,
    });
    // move focus to next unmapped
    const next = unmapped.find(
      (u) => u.code !== activeCode.code && !mappedCodes.includes(u.code),
    );
    if (next) {
      setSelectedCode(next.code);
      setSelectedRole(next.suggestedRole ?? SEMANTIC_ROLES[0].id);
    }
  };

  // Panel 2 state
  const [statusRows, setStatusRows] = useState<StatusRow[]>([]);
  const setKategori = (label: string, k: Kategori) =>
    setStatusRows((prev) => prev.map((r) => (r.label === label ? { ...r, kategori: k } : r)));
  const onSaveKategori = () => {
    toast({
      title: "Kelompok disimpan",
      description: "Berlaku untuk LAM version 2026. Histori minggu sebelumnya tidak berubah.",
    });
  };

  const activeGrouping = activatedRole ? ROLE_GROUPINGS[activatedRole] : null;

  // Tab 2 — global search + per-column filters + pagination
  const [q, setQ] = useState("");

  const uniq = (arr: string[]) => Array.from(new Set(arr)).sort();
  const opts1 = useMemo(
    () => ({
      kuesioner: uniq(SAVED_CODES.map((s) => s.kuesioner)),
      semanticRole: uniq(SAVED_CODES.map((s) => s.semanticRole)),
      lamVersion: uniq(SAVED_CODES.map((s) => s.lamVersion)),
      status: uniq(SAVED_CODES.map((s) => s.status)),
    }),
    [],
  );
  const opts2 = useMemo(
    () => ({
      semanticRole: uniq(SAVED_STATUS.map((s) => s.semanticRole)),
      kpi: uniq(SAVED_STATUS.map((s) => s.kpi)),
      lamVersion: uniq(SAVED_STATUS.map((s) => s.lamVersion)),
      statusAktif: uniq(SAVED_STATUS.map((s) => s.statusAktif)),
    }),
    [],
  );

  const [f1, setF1] = useState({ kuesioner: "all", semanticRole: "all", lamVersion: "all", status: "all" });
  const [f2, setF2] = useState({ semanticRole: "all", kpi: "all", lamVersion: "all", statusAktif: "all" });
  const [pageSize1, setPageSize1] = useState(10);
  const [pageSize2, setPageSize2] = useState(10);
  const [page1, setPage1] = useState(1);
  const [page2, setPage2] = useState(1);

  const filteredCodes = useMemo(() => {
    const qq = q.toLowerCase();
    return SAVED_CODES.filter((s) => {
      const blob = (s.code + s.questionText + s.semanticRole + s.kuesioner + s.lamVersion + s.tipeData + s.kolomOlap + s.dipetakanOleh + s.status).toLowerCase();
      if (qq && !blob.includes(qq)) return false;
      if (f1.kuesioner !== "all" && s.kuesioner !== f1.kuesioner) return false;
      if (f1.semanticRole !== "all" && s.semanticRole !== f1.semanticRole) return false;
      if (f1.lamVersion !== "all" && s.lamVersion !== f1.lamVersion) return false;
      if (f1.status !== "all" && s.status !== f1.status) return false;
      return true;
    });
  }, [q, f1]);

  const filteredStatus = useMemo(() => {
    const qq = q.toLowerCase();
    return SAVED_STATUS.filter((s) => {
      const blob = (s.semanticRole + s.status + s.kategori + s.kpi + s.lamVersion + s.sumberKode + s.dikelompokkanOleh + s.statusAktif).toLowerCase();
      if (qq && !blob.includes(qq)) return false;
      if (f2.semanticRole !== "all" && s.semanticRole !== f2.semanticRole) return false;
      if (f2.kpi !== "all" && s.kpi !== f2.kpi) return false;
      if (f2.lamVersion !== "all" && s.lamVersion !== f2.lamVersion) return false;
      if (f2.statusAktif !== "all" && s.statusAktif !== f2.statusAktif) return false;
      return true;
    });
  }, [q, f2]);

  // Reset page when filters change
  const total1 = filteredCodes.length;
  const total2 = filteredStatus.length;
  const pageCount1 = Math.max(1, Math.ceil(total1 / pageSize1));
  const pageCount2 = Math.max(1, Math.ceil(total2 / pageSize2));
  const p1 = Math.min(page1, pageCount1);
  const p2 = Math.min(page2, pageCount2);
  const pagedCodes = filteredCodes.slice((p1 - 1) * pageSize1, p1 * pageSize1);
  const pagedStatus = filteredStatus.slice((p2 - 1) * pageSize2, p2 * pageSize2);

  const anyFilter1 = q || Object.values(f1).some((v) => v !== "all");
  const anyFilter2 = q || Object.values(f2).some((v) => v !== "all");

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
              <Link2 className="w-6 h-6 text-primary" />
              Pemetaan Data Pertanyaan
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Setup kuesioner baru: mapping kode & label pertanyaan ke <em>semantic role</em>, lalu
              — jika role-nya memerlukan — tentukan kategori KPI dari label status yang dihasilkan.
              Perubahan bersifat{" "}
              <span className="font-medium">forward-only</span> — histori minggu sebelumnya tidak
              tergeser.
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <History className="w-3.5 h-3.5" />
            LAM version 2026
          </Badge>
        </div>

        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="setup" className="gap-2">
              <Link2 className="w-4 h-4" />
              Pemetaan
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <FileText className="w-4 h-4" />
              Data Tersimpan
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6 mt-6">
            {/* Stepper */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-medium">
                <span className="w-5 h-5 rounded-full bg-primary-foreground text-primary flex items-center justify-center text-[10px] font-bold">
                  1
                </span>
                Petakan kode pertanyaan
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              <div
                className={`flex items-center gap-2 px-2.5 py-1 rounded-full font-medium ${
                  activatedRole
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    activatedRole
                      ? "bg-primary-foreground text-primary"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  2
                </span>
                Kelompokkan status ke KPI
              </div>
            </div>

        {/* ============= PANEL 1 ============= */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="text-base font-semibold">
                Langkah 1 — mapping kode & label pertanyaan → semantic role
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Dikerjakan oleh Pelaksana Tracer Study saat setup kuesioner baru.
              </p>
            </div>
            {remainingUnmapped.length > 0 ? (
              <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                Belum ada {remainingUnmapped.length} pertanyaan termapping
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Semua pertanyaan sudah termapping
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Kuesioner
                </label>
                <Select
                  value={kuesioner}
                  onValueChange={(v) => {
                    setKuesioner(v);
                    const list = UNMAPPED[v] ?? [];
                    setSelectedCode(list[0]?.code ?? "");
                    setSelectedRole(list[0]?.suggestedRole ?? SEMANTIC_ROLES[0].id);
                    setMappedCodes([]);
                    setActivatedRole(null);
                    setStatusRows([]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KUESIONER.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Kode pertanyaan terdeteksi
                </label>
                <Select
                  value={activeCode?.code ?? ""}
                  onValueChange={(v) => {
                    setSelectedCode(v);
                    const c = unmapped.find((u) => u.code === v);
                    if (c?.suggestedRole) setSelectedRole(c.suggestedRole);
                  }}
                  disabled={remainingUnmapped.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tidak ada kode belum termapping" />
                  </SelectTrigger>
                  <SelectContent>
                    {unmapped.map((u) => (
                      <SelectItem key={u.code} value={u.code} disabled={mappedCodes.includes(u.code)}>
                        <span className="font-mono">{u.code}</span>
                        <span className="text-muted-foreground mx-1.5">·</span>
                        <span className="truncate">{u.questionText.slice(0, 50)}…</span>
                        {mappedCodes.includes(u.code) ? " ✓" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Question detail card: nama pertanyaan + contoh jawaban */}
            {activeCode && (
              <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-3">
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <CircleHelp className="w-3.5 h-3.5" />
                    Nama / teks pertanyaan
                    <Badge variant="outline" className="ml-1 font-mono text-[10px] py-0">
                      {activeCode.code}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium leading-snug">
                    "{activeCode.questionText}"
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Eye className="w-3.5 h-3.5" />
                    Contoh jawaban dari OLTP (preview, belum masuk OLAP)
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
                    {activeCode.sampleAnswers.map((a, i) => (
                      <span key={i} className="font-medium">
                        "{a}"
                        {i < activeCode.sampleAnswers.length - 1 && (
                          <span className="text-muted-foreground mx-1">·</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Petakan ke role */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Petakan ke semantic role
              </label>
              <Select value={selectedRole} onValueChange={setSelectedRole} disabled={!activeCode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEMANTIC_ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-muted-foreground">{r.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview & Aktifkan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setPreviewOpen((v) => !v)}
                disabled={!activeCode}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview hasil resolve
              </Button>
              <Button onClick={onActivate} disabled={!activeCode} className="gap-2">
                <Check className="w-4 h-4" />
                Aktifkan mapping
              </Button>
            </div>

            {previewOpen && activeCode && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-sm space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Info className="w-3.5 h-3.5" />
                  Preview resolve (read-only ke OLTP)
                </div>
                <p className="text-xs text-muted-foreground">
                  Jika mapping <code className="text-foreground">{activeCode.code}</code> →{" "}
                  <code className="text-foreground">{selectedRole}</code> diaktifkan, contoh jawaban
                  akan dinormalisasi menjadi:
                </p>
                <ul className="text-xs space-y-0.5 mt-1">
                  {activeCode.sampleAnswers.map((a, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-muted-foreground">"{a}"</span>
                      <span className="text-muted-foreground">→</span>
                      <code className="text-primary font-mono">{selectedRole}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============= PANEL 2 (dinamis) ============= */}
        {!activatedRole ? (
          <Card className="border-dashed border-border bg-muted/20">
            <CardContent className="py-8 text-center space-y-2">
              <ListChecks className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">Langkah 2 belum aktif</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Selesaikan Langkah 1 terlebih dahulu — aktifkan minimal satu mapping kode
                pertanyaan. Isi Langkah 2 akan menyesuaikan dengan <em>semantic role</em> yang
                baru dipetakan.
              </p>
            </CardContent>
          </Card>
        ) : !activeGrouping?.needsGrouping ? (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                Langkah 2 — untuk role{" "}
                <code className="font-mono text-sm">{activatedRole}</code>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 flex items-start gap-2 text-sm">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-muted-foreground">{activeGrouping?.hint}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                Langkah 2 — kelompokkan status untuk role{" "}
                <code className="font-mono text-sm">{activatedRole}</code>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Digunakan oleh:{" "}
                <span className="font-medium">{activeGrouping.kpiName}</span>. Dikerjakan oleh
                Kaprodi / P2MPP — keputusan bisnis, bukan teknis. Status baru muncul di sini
                setelah lolos Langkah 1.
              </p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {statusRows.map((row) => (
                <div
                  key={row.label}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                    row.isNew ? "border-primary/60 bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{row.label}</div>
                    {row.isNew && (
                      <div className="text-xs text-primary mt-0.5">(status baru)</div>
                    )}
                  </div>
                  {row.isNew || row.kategori === "belum" ? (
                    <Select
                      value={row.kategori}
                      onValueChange={(v) => setKategori(row.label, v)}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {activeGrouping.categories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <KategoriBadge k={row.kategori} grouping={activeGrouping} />
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground max-w-md">
                  Berlaku untuk LAM version 2026 · perubahan tidak mengubah histori minggu
                  sebelumnya.
                </p>
                <Button onClick={onSaveKategori} className="gap-2">
                  <Check className="w-4 h-4" />
                  Simpan kelompok
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          {/* ============= TAB 2 — DATA TERSIMPAN ============= */}
          <TabsContent value="saved" className="space-y-6 mt-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm flex-1 min-w-[220px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage1(1); setPage2(1); }}
                  placeholder="Cari kode, peran data, status, LAM version…"
                  className="pl-9"
                />
              </div>
              {(anyFilter1 || anyFilter2) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ("");
                    setF1({ kuesioner: "all", semanticRole: "all", lamVersion: "all", status: "all" });
                    setF2({ semanticRole: "all", kpi: "all", lamVersion: "all", statusAktif: "all" });
                    setPage1(1); setPage2(1);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <FilterX className="w-3.5 h-3.5" />
                  Reset semua filter
                </Button>
              )}
            </div>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  Pemetaan Kode & Label Pertanyaan → Peran Data
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Semua mapping aktif per kuesioner &amp; LAM version. Perubahan pada versi baru
                  tidak mengubah baris di versi lama.
                </p>
                {/* Column filters */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                  <ColFilter label="Kuesioner" value={f1.kuesioner} options={opts1.kuesioner} onChange={(v) => { setF1({ ...f1, kuesioner: v }); setPage1(1); }} />
                  <ColFilter label="Peran Data" value={f1.semanticRole} options={opts1.semanticRole} onChange={(v) => { setF1({ ...f1, semanticRole: v }); setPage1(1); }} />
                  <ColFilter label="LAM Version" value={f1.lamVersion} options={opts1.lamVersion} onChange={(v) => { setF1({ ...f1, lamVersion: v }); setPage1(1); }} />
                  <ColFilter label="Status" value={f1.status} options={opts1.status} onChange={(v) => { setF1({ ...f1, status: v }); setPage1(1); }} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kuesioner</TableHead>
                        <TableHead>Kode</TableHead>
                        <TableHead>Teks Pertanyaan</TableHead>
                        <TableHead>Peran Data</TableHead>
                        <TableHead>Tipe Data</TableHead>
                        <TableHead>Kolom Tujuan OLAP</TableHead>
                        <TableHead>LAM Version</TableHead>
                        <TableHead>Berlaku Sejak</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dipetakan Oleh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedCodes.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{r.kuesioner}</TableCell>
                          <TableCell className="font-mono text-xs">{r.code}</TableCell>
                          <TableCell className="text-sm max-w-md">{r.questionText}</TableCell>
                          <TableCell>
                            <code className="text-xs font-mono text-primary">
                              {r.semanticRole}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-mono">
                              {r.tipeData}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-[11px] font-mono text-muted-foreground">
                              {r.kolomOlap}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <History className="w-3 h-3" />
                              {r.lamVersion}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.activatedAt}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                r.status === "Aktif"
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border-muted-foreground/30 bg-muted text-muted-foreground"
                              }
                            >
                              {r.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{r.dipetakanOleh}</TableCell>
                        </TableRow>
                      ))}
                      {pagedCodes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-6">
                            Tidak ada baris yang cocok
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <PagerFooter
                  total={total1}
                  page={p1}
                  pageCount={pageCount1}
                  pageSize={pageSize1}
                  onPage={setPage1}
                  onPageSize={(n) => { setPageSize1(n); setPage1(1); }}
                />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" />
                  Pemetaan Kelompok Status → Kategori KPI
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Aturan pengelompokan label status per peran data, digunakan oleh KPI hilir.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                  <ColFilter label="Peran Data" value={f2.semanticRole} options={opts2.semanticRole} onChange={(v) => { setF2({ ...f2, semanticRole: v }); setPage2(1); }} />
                  <ColFilter label="Digunakan Oleh (KPI)" value={f2.kpi} options={opts2.kpi} onChange={(v) => { setF2({ ...f2, kpi: v }); setPage2(1); }} />
                  <ColFilter label="LAM Version" value={f2.lamVersion} options={opts2.lamVersion} onChange={(v) => { setF2({ ...f2, lamVersion: v }); setPage2(1); }} />
                  <ColFilter label="Status" value={f2.statusAktif} options={opts2.statusAktif} onChange={(v) => { setF2({ ...f2, statusAktif: v }); setPage2(1); }} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Peran Data</TableHead>
                        <TableHead>Sumber Kode</TableHead>
                        <TableHead>Label Status</TableHead>
                        <TableHead>Kategori KPI</TableHead>
                        <TableHead>Digunakan Oleh</TableHead>
                        <TableHead>LAM Version</TableHead>
                        <TableHead>Berlaku Sejak</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dikelompokkan Oleh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagedStatus.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <code className="text-xs font-mono text-primary">
                              {r.semanticRole}
                            </code>
                          </TableCell>
                          <TableCell>
                            <code className="text-[11px] font-mono text-muted-foreground">
                              {r.sumberKode}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">{r.status}</TableCell>
                          <TableCell className="text-sm">{r.kategori}</TableCell>
                          <TableCell className="text-sm">{r.kpi}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <History className="w-3 h-3" />
                              {r.lamVersion}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.activatedAt}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                r.statusAktif === "Aktif"
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border-muted-foreground/30 bg-muted text-muted-foreground"
                              }
                            >
                              {r.statusAktif}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{r.dikelompokkanOleh}</TableCell>
                        </TableRow>
                      ))}
                      {pagedStatus.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                            Tidak ada baris yang cocok
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <PagerFooter
                  total={total2}
                  page={p2}
                  pageCount={pageCount2}
                  pageSize={pageSize2}
                  onPage={setPage2}
                  onPageSize={(n) => { setPageSize2(n); setPage2(1); }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default QuestionMappingPage;

// ---------- Reusable helpers ----------
function ColFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
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
            <SelectItem key={o} value={o} className="text-xs">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function PagerFooter({
  total,
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
}: {
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <div className="text-xs text-muted-foreground">
        Menampilkan <span className="font-medium text-foreground">{from}–{to}</span> dari{" "}
        <span className="font-medium text-foreground">{total}</span> baris
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Baris/halaman</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSize(parseInt(v, 10))}>
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-xs">
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-xs px-2 tabular-nums">
            Hal. <span className="font-medium text-foreground">{page}</span> / {pageCount}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onPage(Math.min(pageCount, page + 1))}
            disabled={page >= pageCount}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}