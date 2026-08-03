import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  Check,
  Link2,
  ListChecks,
  Info,
  FileText,
  ArrowRight,
  CircleHelp,
  Search,
  ChevronLeft,
  ChevronRight,
  FilterX,
  AlertTriangle,
  RefreshCcw,
  Ban,
  Pencil,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/common/use-toast";
import {
  useSemanticRoles,
  useUnmappedQuestions,
  useSimilarQuestions,
  useCreateQuestionSemanticMapping,
  useQuestionSemanticMappings,
  useKpiCategoryMappings,
  useKpiCategoryTaxonomy,
  useKpiCategoryTaxonomyAll,
  useAllKpiCategoryMappings,
  useCreateKpiCategoryMapping,
  useDeactivateKpiCategoryMapping,
  useOptionCandidates,
  useMappableQuestionnaires,
  useEtlRunStatus,
  categoryLabel,
  digunakanOlehLabel,
  formatExpectedKind,
} from "@/hooks/useQuestionMappingManagement";
import type { SemanticRole, UnmappedQuestion, KpiCategoryMapping } from "@/lib/apiClient";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Tone badge kategori KPI — API tidak mengirim "tone", jadi ditebak dari nama kategori. */
const inferTone = (kpiCategory: string): "good" | "bad" | "neutral" => {
  const k = kpiCategory.toLowerCase();
  if (k.includes("tidak") || k.includes("invalid") || k.includes("gagal")) return "bad";
  if (k.includes("valid") || k.includes("terserap") || k.includes("sesuai") || k.includes("baik") || k.includes("unggul") || k.includes("beasiswa"))
    return "good";
  return "neutral";
};

const toneClass = (tone: "good" | "bad" | "neutral") => {
  const map = {
    good: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bad: "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400",
    neutral: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  } as const;
  return map[tone];
};

const QuestionMappingPage = () => {
  const { toast } = useToast();

  // ── Panel 1 state ──
  const { questionnaires, loading: questionnairesLoading } = useMappableQuestionnaires();
  const [kuesioner, setKuesioner] = useState<number | null>(null);
  const questionnaireId = kuesioner;

  // Default ke kuesioner pertama (periode terbaru, lihat urutan di BE) begitu daftar termuat.
  useEffect(() => {
    if (kuesioner === null && questionnaires.length > 0) {
      setKuesioner(questionnaires[0].id);
    }
  }, [kuesioner, questionnaires]);

  const [selectedCode, setSelectedCode] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activatedRole, setActivatedRole] = useState<string | null>(null);
  // ETL otomatis ter-trigger begitu Langkah 1 disimpan (lihat RunEtlJob di
  // backend) -- id ini dipoll supaya admin tahu kapan jawaban historis
  // selesai ditata ulang, bukan diam tanpa info seperti sebelumnya.
  const [activeEtlRunId, setActiveEtlRunId] = useState<number | null>(null);
  const etlRun = useEtlRunStatus(activeEtlRunId);
  const [typeMismatchError, setTypeMismatchError] = useState<{ expected_kind: string; samples: string[] } | null>(null);
  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    conflicting_mapping: { id: number; question_code: string; question_text_snapshot: string } | null;
  }>({ open: false, conflicting_mapping: null });

  // ── Data hooks — Panel 1 ──
  const { groupedRoles, roleByKey, loading: rolesLoading } = useSemanticRoles();
  const { unmapped, loading: unmappedLoading } = useUnmappedQuestions(questionnaireId);
  const createMapping = useCreateQuestionSemanticMapping();

  const activeCode: UnmappedQuestion | undefined = useMemo(
    () => unmapped.find((u) => u.question_code === selectedCode) ?? unmapped[0],
    [unmapped, selectedCode],
  );

  const { similar, loading: similarLoading } = useSimilarQuestions({
    questionnaire_id: questionnaireId,
    question_text: activeCode?.question_text,
    exclude_code: activeCode?.question_code,
  });

  // Sinkronkan pilihan kode saat daftar unmapped berubah (ganti kuesioner, atau kode
  // yang tadi dipilih baru saja diaktifkan & hilang dari daftar).
  useEffect(() => {
    if (unmapped.length === 0) {
      if (selectedCode !== "") setSelectedCode("");
      return;
    }
    if (!unmapped.some((u) => u.question_code === selectedCode)) {
      setSelectedCode(unmapped[0].question_code);
    }
  }, [unmapped, selectedCode]);

  // Saat kode aktif berganti: ikuti saran heuristik role kalau ada, reset error type-mismatch.
  useEffect(() => {
    if (activeCode?.suggested_role) setSelectedRole(activeCode.suggested_role);
    setTypeMismatchError(null);
  }, [activeCode?.question_code]);

  const selectedRoleMeta: SemanticRole | undefined = roleByKey[selectedRole];

  const onActivate = async (forceReplace = false) => {
    if (!activeCode || !questionnaireId) return;
    try {
      const res = await createMapping.mutateAsync({
        questionnaire_id: questionnaireId,
        question_code: activeCode.question_code,
        semantic_role: selectedRole,
        force_replace: forceReplace || undefined,
      });
      setActivatedRole(res.data?.semantic_role ?? selectedRole);
      setTypeMismatchError(null);
      setConflictDialog({ open: false, conflicting_mapping: null });
      if (res.data?.etl_run_id) setActiveEtlRunId(res.data.etl_run_id);
    } catch (err: any) {
      const status = err?.response?.status;
      const body = err?.response?.data;
      if (status === 409 && body?.error === "role_already_mapped") {
        setConflictDialog({ open: true, conflicting_mapping: body.conflicting_mapping });
      } else if (status === 422 && body?.error === "type_mismatch") {
        setTypeMismatchError({ expected_kind: body.expected_kind, samples: body.samples ?? [] });
      }
      // Error lain sudah di-toast generik oleh useCreateQuestionSemanticMapping.
    }
  };

  // ── Panel 2 (kelompokkan status → kategori KPI) ──
  const activeRoleMeta: SemanticRole | undefined = activatedRole ? roleByKey[activatedRole] : undefined;
  const needsGrouping = !!activeRoleMeta && (activeRoleMeta.expected_kind === "categorical" || activeRoleMeta.expected_kind === "boolean");

  const { mappings: kpiRows, loading: kpiRowsLoading } = useKpiCategoryMappings(
    activatedRole ? { semantic_role: activatedRole } : undefined,
  );

  // Section (digunakan_oleh) apa saja yang PERNAH dikonfigurasi untuk role ini,
  // aktif atau tidak. Sumber kebenaran untuk section mana yang dirender — BUKAN
  // usageGroups (di bawah), karena usageGroups cuma baris AKTIF: kalau semua
  // baris satu digunakan_oleh kebetulan nonaktif (mis. dinonaktifkan semua utk
  // demo ulang), usageGroups-nya kosong dan section itu akan hilang total dari
  // Langkah 2 tanpa ini — persis skenario yang bikin "Tren Keterserapan" tidak
  // bisa dipetakan ulang lewat UI.
  const { taxonomy, loading: taxonomyLoading } = useKpiCategoryTaxonomy(activatedRole);

  // Grup baris existing (AKTIF saja) per digunakan_oleh — dipakai utk badge
  // "sudah dikategorikan" & mengecualikan option_code dari daftar kandidat.
  const usageGroups = useMemo(() => {
    const map = new Map<string, KpiCategoryMapping[]>();
    kpiRows.forEach((r) => {
      if (!map.has(r.digunakan_oleh)) map.set(r.digunakan_oleh, []);
      map.get(r.digunakan_oleh)!.push(r);
    });
    return map;
  }, [kpiRows]);

  // Opsi kategori per digunakan_oleh, dari taksonomi (bukan dari baris aktif) —
  // supaya tetap tersedia walau 0 baris aktif untuk usage tsb.
  const categoriesByUsage = useMemo(() => {
    const map = new Map<string, { id: string; label: string }[]>();
    taxonomy.forEach((t) => map.set(t.digunakan_oleh, t.categories));
    return map;
  }, [taxonomy]);

  // Opsi status kandidat baru (belum masuk kpi_category_mapping di digunakan_oleh
  // manapun) — bersumber dari option-candidates (option_code+option_label ASLI dari
  // questionnaire_options via kode aktif role ini), BUKAN dari label jawaban semata.
  // option_code adalah identitas yang dicocokkan Cube.js (SPLIT_PART id_status_alumni),
  // jadi harus dari sini, tidak boleh dikarang di klien (lihat catatan apiClient.ts).
  const { candidates: optionCandidates } = useOptionCandidates(activatedRole);

  // "Status baru" HARUS dihitung PER digunakan_oleh, bukan sekali secara global
  // untuk seluruh role — kalau tidak, option_code yang sudah aktif di SATU
  // grouping (mis. "1" aktif di masa_tunggu_valid_status) akan ikut
  // tersembunyi sebagai kandidat di grouping LAIN yang belum punya baris aktif
  // untuk option_code itu (mis. iku2_keterserapan setelah dinonaktifkan) --
  // padahal harusnya tetap bisa dipetakan ulang di situ. Bug ini pernah
  // membuat status "Bekerja"/"Wiraswasta"/dst hilang total dari section
  // Keterserapan: bukan aktif (sudah dinonaktifkan) DAN bukan kandidat baru
  // (dianggap "sudah dipakai" karena aktif di grouping lain).
  const candidateOptionsForUsage = (usage: string) => {
    const known = new Set((usageGroups.get(usage) ?? []).map((r) => r.option_code));
    return optionCandidates.filter((c) => !known.has(c.option_code));
  };

  const [pendingKategori, setPendingKategori] = useState<Record<string, string>>({});
  const setKategoriFor = (usage: string, optionCode: string, kpiCategory: string) =>
    setPendingKategori((prev) => ({ ...prev, [`${usage}::${optionCode}`]: kpiCategory }));

  const createKpiCategory = useCreateKpiCategoryMapping();

  const onSaveKategori = async (usage: string) => {
    const rowsToSave = candidateOptionsForUsage(usage)
      .map((c) => ({ ...c, kpiCategory: pendingKategori[`${usage}::${c.option_code}`] }))
      .filter((r) => !!r.kpiCategory);

    if (rowsToSave.length === 0) {
      toast({ title: "Belum ada kategori dipilih", variant: "destructive" });
      return;
    }

    const categoryOptions = categoriesByUsage.get(usage) ?? [];
    try {
      for (const row of rowsToSave) {
        const cat = categoryOptions.find((c) => c.id === row.kpiCategory);
        if (!cat) continue;
        await createKpiCategory.mutateAsync({
          semantic_role: activatedRole as string,
          option_code: row.option_code,
          option_label_snapshot: row.option_label,
          kpi_category: cat.id,
          kpi_category_label: cat.label,
          digunakan_oleh: usage,
        });
      }
      toast({
        title: "Kelompok disimpan",
        description:
          "Berlaku langsung ke seluruh data historis (tidak perlu ETL) — Cube.js membaca tabel ini setiap query. Kalau dashboard belum berubah, kemungkinan itu cache pre-aggregation Cube.js yang belum menangkap perubahan, bukan mapping-nya.",
      });
      setPendingKategori({});
    } catch {
      // error sudah di-toast oleh useCreateKpiCategoryMapping
    }
  };

  function distinctCategories(rows: KpiCategoryMapping[]) {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.kpi_category, r.kpi_category_label));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }

  // ── Tab 2 — Data Tersimpan ──
  const { mappings: savedCodes, loading: savedCodesLoading } = useQuestionSemanticMappings();
  const { mappings: savedStatus, loading: savedStatusLoading } = useAllKpiCategoryMappings();

  // ── Edit mapping status → kategori KPI yang sudah tersimpan ──
  // Forward-only (konsisten dengan seluruh fitur ini): "edit" BUKAN mutasi baris
  // in-place — itu akan menghapus jejak audit yang justru jadi alasan utama
  // pola is_active dipakai di sini. "Edit" = nonaktifkan baris lama, lalu buat
  // baris baru dengan (semantic_role, option_code, digunakan_oleh) yang SAMA
  // tapi kpi_category baru.
  const deactivateKpiCategory = useDeactivateKpiCategoryMapping();
  const [editStatusDialog, setEditStatusDialog] = useState<{
    open: boolean;
    row: KpiCategoryMapping | null;
    newCategory: string;
  }>({ open: false, row: null, newCategory: "" });

  const editCategoryOptions = useMemo(() => {
    if (!editStatusDialog.row) return [];
    return distinctCategories(savedStatus.filter((s) => s.digunakan_oleh === editStatusDialog.row!.digunakan_oleh));
  }, [editStatusDialog.row, savedStatus]);

  const handleSaveEditStatus = async () => {
    const { row, newCategory } = editStatusDialog;
    if (!row || !newCategory) return;

    const cat = editCategoryOptions.find((c) => c.id === newCategory);
    if (!cat) return;

    try {
      // Urutan penting: nonaktifkan dulu baru buat baris baru — kalau dibalik,
      // constraint unik (semantic_role, option_code, digunakan_oleh) WHERE
      // is_active akan menolak baris baru selama baris lama masih aktif.
      await deactivateKpiCategory.mutateAsync(row.id);
      await createKpiCategory.mutateAsync({
        semantic_role: row.semantic_role,
        option_code: row.option_code,
        option_label_snapshot: row.option_label_snapshot,
        kpi_category: cat.id,
        kpi_category_label: cat.label,
        digunakan_oleh: row.digunakan_oleh,
      });
      toast({
        title: "Kategori diperbarui",
        description: `"${row.option_label_snapshot}" dipindah ke kategori "${cat.label}". Baris lama tetap tersimpan (nonaktif) untuk audit. Berlaku langsung ke seluruh data historis (tidak perlu ETL) — Cube.js membaca tabel ini setiap query.`,
      });
      setEditStatusDialog({ open: false, row: null, newCategory: "" });
    } catch {
      // error sudah di-toast oleh masing-masing mutation
    }
  };

  const questionnaireNameById = useMemo(
    () => Object.fromEntries(questionnaires.map((q) => [q.id, q.title])),
    [questionnaires],
  );

  // Sumber kode aktif per semantic_role — dipakai kolom "Sumber Kode" tabel kategori KPI
  // (di-derive dari data mapping kode yang sudah dimuat, kpi_category_mapping sendiri
  // tidak menyimpan referensi question_code).
  const codesByRole = useMemo(() => {
    const map = new Map<string, string[]>();
    savedCodes
      .filter((s) => s.is_active)
      .forEach((s) => {
        if (!map.has(s.semantic_role)) map.set(s.semantic_role, []);
        const arr = map.get(s.semantic_role)!;
        if (!arr.includes(s.question_code)) arr.push(s.question_code);
      });
    return map;
  }, [savedCodes]);

  // KPI apa saja yang dipakai tiap role (mis. status_pekerjaan -> iku2_keterserapan) --
  // ditampilkan inline di daftar "role aktif" di bawah, supaya jelas TANPA perlu
  // klik apa pun bahwa "keterserapan" bukan role terpisah, tapi kategori KPI
  // yang sudah dipakai role yang sama dengan yang sedang dicari.
  const { byRole: kpiTaxonomyByRole } = useKpiCategoryTaxonomyAll();

  // Role aktif untuk kuesioner yang sedang dipilih di Langkah 1 (dedupe per
  // semantic_role — role wide-grain bisa punya banyak kode aktif, cukup
  // tampilkan salah satu sebagai contoh). Dipakai jalur "kelola Langkah 2
  // langsung" di atas.
  const activeRolesForQuestionnaire = useMemo(() => {
    if (questionnaireId === null) return [];
    const seen = new Set<string>();
    const result: { semantic_role: string; question_code: string }[] = [];
    savedCodes
      .filter((s) => s.questionnaire_id === questionnaireId && s.is_active)
      .forEach((s) => {
        if (seen.has(s.semantic_role)) return;
        seen.add(s.semantic_role);
        result.push({ semantic_role: s.semantic_role, question_code: s.question_code });
      });
    return result;
  }, [savedCodes, questionnaireId]);

  const [q, setQ] = useState("");

  const uniq = (arr: string[]) => Array.from(new Set(arr)).sort();
  const opts1 = useMemo(
    () => ({
      kuesioner: uniq(savedCodes.map((s) => questionnaireNameById[s.questionnaire_id] ?? String(s.questionnaire_id))),
      semanticRole: uniq(savedCodes.map((s) => s.semantic_role)),
      status: uniq(savedCodes.map((s) => (s.is_active ? "Aktif" : "Nonaktif"))),
    }),
    [savedCodes, questionnaireNameById],
  );
  const opts2 = useMemo(
    () => ({
      semanticRole: uniq(savedStatus.map((s) => s.semantic_role)),
      kpi: uniq(savedStatus.map((s) => s.digunakan_oleh)),
      statusAktif: uniq(savedStatus.map((s) => (s.is_active ? "Aktif" : "Nonaktif"))),
    }),
    [savedStatus],
  );

  const [f1, setF1] = useState({ kuesioner: "all", semanticRole: "all", status: "all" });
  const [f2, setF2] = useState({ semanticRole: "all", kpi: "all", statusAktif: "all" });
  const [pageSize1, setPageSize1] = useState(10);
  const [pageSize2, setPageSize2] = useState(10);
  const [page1, setPage1] = useState(1);
  const [page2, setPage2] = useState(1);

  const filteredCodes = useMemo(() => {
    const qq = q.toLowerCase();
    return savedCodes.filter((s) => {
      const kuesionerName = questionnaireNameById[s.questionnaire_id] ?? String(s.questionnaire_id);
      const statusLabel = s.is_active ? "Aktif" : "Nonaktif";
      const blob = (s.question_code + s.question_text_snapshot + s.semantic_role + kuesionerName + statusLabel + (s.mapped_by?.name ?? "")).toLowerCase();
      if (qq && !blob.includes(qq)) return false;
      if (f1.kuesioner !== "all" && kuesionerName !== f1.kuesioner) return false;
      if (f1.semanticRole !== "all" && s.semantic_role !== f1.semanticRole) return false;
      if (f1.status !== "all" && statusLabel !== f1.status) return false;
      return true;
    });
  }, [q, f1, savedCodes, questionnaireNameById]);

  const filteredStatus = useMemo(() => {
    const qq = q.toLowerCase();
    return savedStatus.filter((s) => {
      const statusLabel = s.is_active ? "Aktif" : "Nonaktif";
      const blob = (s.semantic_role + s.option_label_snapshot + s.kpi_category_label + s.digunakan_oleh + statusLabel).toLowerCase();
      if (qq && !blob.includes(qq)) return false;
      if (f2.semanticRole !== "all" && s.semantic_role !== f2.semanticRole) return false;
      if (f2.kpi !== "all" && s.digunakan_oleh !== f2.kpi) return false;
      if (f2.statusAktif !== "all" && statusLabel !== f2.statusAktif) return false;
      return true;
    });
  }, [q, f2, savedStatus]);

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
              Setup kuesioner baru: mapping kode &amp; label pertanyaan ke <em>semantic role</em>, lalu
              — jika role-nya memerlukan — tentukan kategori KPI dari label status yang dihasilkan.
              Perubahan bersifat{" "}
              <span className="font-medium">forward-only</span> — histori periode sebelumnya tidak
              tergeser.
            </p>
          </div>
        </div>

        {/* ETL status banner -- muncul begitu Langkah 1 disimpan, sampai job
            background (RunEtlJob) selesai menata ulang jawaban historis ke
            fact table. Tanpa ini admin tidak tahu kapan boleh cek dashboard. */}
        {activeEtlRunId !== null && etlRun.status !== null && (
          <div
            className={
              "rounded-lg border px-4 py-3 flex items-center gap-3 text-sm " +
              (etlRun.status === "completed"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : etlRun.status === "failed"
                ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400"
                : "border-primary/40 bg-primary/5 text-foreground")
            }
          >
            {(etlRun.status === "queued" || etlRun.status === "running") && (
              <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
            )}
            <div className="flex-1">
              {etlRun.status === "queued" && "ETL menunggu giliran diproses — jawaban historis akan ditata ulang mengikuti mapping baru."}
              {etlRun.status === "running" && "ETL sedang berjalan — menata ulang jawaban historis ke fact table sesuai mapping baru. Jangan tutup halaman ini."}
              {etlRun.status === "completed" && "ETL selesai. Data di dashboard sudah mengikuti mapping terbaru — silakan cek grafiknya."}
              {etlRun.status === "failed" && `ETL gagal: ${etlRun.errorMessage ?? "penyebab tidak diketahui"}. Mapping tetap tersimpan, tapi data historis belum ditata ulang — coba jalankan ulang ETL manual atau hubungi admin sistem.`}
            </div>
            {etlRun.isDone && (
              <button
                type="button"
                className="text-xs underline shrink-0"
                onClick={() => setActiveEtlRunId(null)}
              >
                Tutup
              </button>
            )}
          </div>
        )}

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
                {unmapped.length > 0 ? (
                  <Badge className="bg-primary/15 text-primary border-primary/30" variant="outline">
                    Belum ada {unmapped.length} pertanyaan termapping
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    {unmappedLoading ? "Memuat…" : "Semua pertanyaan sudah termapping"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 px-3 py-2.5 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
                  <span>
                    Mapping di Langkah 1 hanya berlaku untuk jawaban yang diproses ETL{" "}
                    <span className="font-medium text-foreground">setelah</span> mapping diaktifkan —
                    data yang sudah pernah masuk fact table tidak diproses ulang otomatis. ETL berjalan
                    terjadwal (setiap 5 menit di mode testing), jadi perubahan biasanya terlihat pada
                    data baru dalam beberapa menit.
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Kuesioner
                    </label>
                    <Select
                      value={kuesioner !== null ? String(kuesioner) : ""}
                      onValueChange={(v) => {
                        setKuesioner(Number(v));
                        setActivatedRole(null);
                        setPendingKategori({});
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={questionnairesLoading ? "Memuat…" : "Pilih kuesioner"} />
                      </SelectTrigger>
                      <SelectContent>
                        {questionnaires.map((q) => (
                          <SelectItem key={q.id} value={String(q.id)}>
                            {q.title}
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
                      value={activeCode?.question_code ?? ""}
                      onValueChange={setSelectedCode}
                      disabled={unmapped.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={unmappedLoading ? "Memuat…" : "Tidak ada kode belum termapping"} />
                      </SelectTrigger>
                      <SelectContent>
                        {unmapped.map((u) => (
                          <SelectItem key={u.question_code} value={u.question_code}>
                            <span className="font-mono">{u.question_code}</span>
                            <span className="text-muted-foreground mx-1.5">·</span>
                            <span className="truncate">{u.question_text.slice(0, 50)}…</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Jalur alternatif: role yang SUDAH punya kode aktif tidak pernah muncul di selector
                    "Kode pertanyaan terdeteksi" di atas (memang sudah termapping, itu benar) — tapi
                    itu berarti tidak ada cara masuk ke Langkah 2 untuk role tsb tanpa ini. Tidak perlu
                    mutasi apa pun di sini, cuma set activatedRole langsung karena mapping-nya memang
                    sudah aktif. */}
                {questionnaireId !== null && activeRolesForQuestionnaire.length > 0 && (
                  <div className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-3 space-y-2">
                    <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <ListChecks className="w-3.5 h-3.5 shrink-0 text-primary" />
                      Role yang sudah punya kode aktif — untuk atur KPI (Langkah 2), klik "Kelola" di
                      bawah. Jangan cari kodenya lagi di selector "Kode pertanyaan terdeteksi" — kode
                      yang sudah aktif memang sengaja tidak muncul di situ.
                    </div>
                    <div className="space-y-1.5">
                      {activeRolesForQuestionnaire.map((r) => {
                        const usages = kpiTaxonomyByRole.get(r.semantic_role) ?? [];
                        const roleMeta = roleByKey[r.semantic_role];
                        // Langkah 2 (kategori KPI) cuma berlaku untuk role categorical/boolean --
                        // role numerik/teks/dimensi-langsung (mis. pendapatan, nama_perusahaan)
                        // memang TIDAK PERNAH butuh pengelompokan ini, jadi jangan ditampilkan
                        // seolah "belum selesai" -- itu bikin admin bingung mengira ada yang salah.
                        const eligibleForGrouping =
                          roleMeta?.expected_kind === "categorical" || roleMeta?.expected_kind === "boolean";
                        return (
                          <div
                            key={r.semantic_role}
                            className="flex items-center justify-between gap-3 rounded-md bg-card border border-border px-2.5 py-2 flex-wrap"
                          >
                            <div className="min-w-0 text-xs">
                              <span className="font-mono font-medium text-foreground">{r.semantic_role}</span>
                              <span className="text-muted-foreground mx-1.5">· via {r.question_code}</span>
                              {usages.length > 0 ? (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <span className="text-muted-foreground">Dipakai untuk:</span>
                                  {usages.map((u) => (
                                    <Badge key={u} variant="outline" className="text-[10px] py-0 border-primary/30 bg-primary/10 text-primary">
                                      {digunakanOlehLabel(u)}
                                    </Badge>
                                  ))}
                                </div>
                              ) : eligibleForGrouping ? (
                                <div className="mt-1 text-muted-foreground italic">Belum dipakai KPI kategori manapun</div>
                              ) : (
                                <div className="mt-1 text-muted-foreground italic">
                                  Tidak perlu kategori KPI — nilai {roleMeta ? formatExpectedKind(roleMeta) : "role ini"} dipakai langsung, bukan dikelompokkan
                                </div>
                              )}
                            </div>
                            {eligibleForGrouping && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs shrink-0"
                                onClick={() => {
                                  setActivatedRole(r.semantic_role);
                                  setSelectedCode("");
                                }}
                              >
                                Kelola →
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Question detail card: nama pertanyaan + contoh jawaban */}
                {activeCode && (
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <CircleHelp className="w-3.5 h-3.5" />
                        Nama / teks pertanyaan
                        <Badge variant="outline" className="ml-1 font-mono text-[10px] py-0">
                          {activeCode.question_code}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-snug">
                        "{activeCode.question_text}"
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Eye className="w-3.5 h-3.5" />
                        Contoh jawaban dari OLTP (preview, belum masuk OLAP)
                      </div>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
                        {activeCode.sample_answers.map((a, i) => (
                          <span key={i} className="font-medium">
                            "{a}"
                            {i < activeCode.sample_answers.length - 1 && (
                              <span className="text-muted-foreground mx-1">·</span>
                            )}
                          </span>
                        ))}
                        {activeCode.sample_answers.length === 0 && (
                          <span className="text-muted-foreground italic">Belum ada jawaban masuk</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Similar-question warning box — Constraint D */}
                {activeCode && similarLoading && (
                  <p className="text-xs text-muted-foreground">Memeriksa pertanyaan mirip…</p>
                )}
                {activeCode && !similarLoading && similar.length > 0 && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Ditemukan {similar.length} pertanyaan mirip di kuesioner ini
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Periksa apakah pertanyaan ini duplikat/pecahan dari kode lain sebelum melanjutkan.
                    </p>
                    <ul className="space-y-1.5">
                      {similar.slice(0, 5).map((s) => (
                        <li key={s.question_code} className="flex items-start justify-between gap-2 text-xs bg-background/60 rounded-md px-2 py-1.5">
                          <div className="min-w-0">
                            <span className="font-mono font-medium">{s.question_code}</span>
                            <span className="text-muted-foreground mx-1">·</span>
                            <span className="truncate">{s.question_text.slice(0, 60)}{s.question_text.length > 60 ? "…" : ""}</span>
                            {s.current_semantic_role && (
                              <span className="block text-muted-foreground mt-0.5">
                                sudah dipetakan ke <code className="text-foreground">{s.current_semantic_role}</code>
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="shrink-0 text-[10px]">
                            {Math.round(s.similarity * 100)}% mirip
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Petakan ke role — dikelompokkan per kategori KPI supaya lintas-domain kelihatan jelas */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Petakan ke semantic role
                  </label>
                  <Select
                    value={selectedRole}
                    onValueChange={(v) => { setSelectedRole(v); setTypeMismatchError(null); }}
                    disabled={!activeCode || rolesLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={rolesLoading ? "Memuat role…" : "Pilih semantic role"} />
                    </SelectTrigger>
                    <SelectContent>
                      {groupedRoles.map((g) => (
                        <SelectGroup key={g.category}>
                          <SelectLabel>{categoryLabel(g.category)}</SelectLabel>
                          {g.roles.map((r) => (
                            <SelectItem key={r.role_key} value={r.role_key}>
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium">{r.label}</span>
                                  <Badge variant="outline" className="font-mono text-[10px] py-0 h-4">
                                    {formatExpectedKind(r)}
                                  </Badge>
                                </div>
                                {r.description && (
                                  <span className="text-xs text-muted-foreground">{r.description}</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Side-by-side sample comparison — role vs jawaban asli, sebelum commit */}
                {activeCode && selectedRoleMeta && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">
                        Role dipilih — <code className="text-foreground">{selectedRoleMeta.role_key}</code>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] mb-1.5">
                        {formatExpectedKind(selectedRoleMeta)}
                      </Badge>
                      <p className="text-sm">
                        Contoh jawaban valid:{" "}
                        <span className="font-medium">
                          {selectedRoleMeta.sample_valid_answer ?? <span className="text-muted-foreground italic">tidak tersedia</span>}
                        </span>
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-3">
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">
                        Jawaban asli pertanyaan ini
                      </div>
                      <div className="flex flex-wrap gap-x-1.5 gap-y-1 text-sm">
                        {activeCode.sample_answers.length > 0
                          ? activeCode.sample_answers.map((a, i) => (
                              <span key={i} className="font-medium">"{a}"{i < activeCode.sample_answers.length - 1 && ","}</span>
                            ))
                          : <span className="text-muted-foreground italic">tidak tersedia</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hard-block: type mismatch dari BE (422) */}
                {typeMismatchError && (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-3 text-sm space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
                      <Ban className="w-3.5 h-3.5" />
                      Tipe data tidak cocok — mapping ditolak
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Role ini mengharapkan <code className="text-foreground">{typeMismatchError.expected_kind}</code>, tapi
                      contoh jawaban yang ditemukan: {typeMismatchError.samples.map((s, i) => (
                        <span key={i}>
                          <code className="text-foreground">"{s}"</code>
                          {i < typeMismatchError.samples.length - 1 && ", "}
                        </span>
                      ))}. Pilih role lain yang sesuai.
                    </p>
                  </div>
                )}

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
                  <Button
                    onClick={() => onActivate(false)}
                    disabled={!activeCode || !selectedRole || !!typeMismatchError || createMapping.isPending}
                    className="gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {createMapping.isPending ? "Menyimpan…" : "Aktifkan mapping"}
                  </Button>
                </div>

                {previewOpen && activeCode && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-sm space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Info className="w-3.5 h-3.5" />
                      Preview resolve (read-only ke OLTP)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Jika mapping <code className="text-foreground">{activeCode.question_code}</code> →{" "}
                      <code className="text-foreground">{selectedRole}</code> diaktifkan, contoh jawaban
                      akan dinormalisasi menjadi:
                    </p>
                    <ul className="text-xs space-y-0.5 mt-1">
                      {activeCode.sample_answers.map((a, i) => (
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
            ) : !needsGrouping ? (
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
                    <p className="text-muted-foreground">
                      Semantic role ini bersifat {activeRoleMeta?.expected_kind ?? "numerik/ordinal"} — nilai akan
                      diproses langsung tanpa pengelompokan kategori manual.
                    </p>
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
                    Dikerjakan oleh Kaprodi / P2MPP — keputusan bisnis, bukan teknis. Status baru
                    muncul di sini setelah lolos Langkah 1.
                  </p>
                </CardHeader>
                <CardContent className="space-y-5">
                  {(kpiRowsLoading || taxonomyLoading) && (
                    <p className="text-xs text-muted-foreground">Memuat kategori KPI…</p>
                  )}

                  {!kpiRowsLoading && !taxonomyLoading && taxonomy.length === 0 && (
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 flex items-start gap-2 text-sm">
                      <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p className="text-muted-foreground">
                        Belum ada kategori KPI yang dikonfigurasi untuk role ini. Hubungi tim
                        teknis untuk menentukan KPI hilir (<code>digunakan_oleh</code>) &amp;
                        kategori awal sebelum status bisa dikelompokkan dari sini.
                      </p>
                    </div>
                  )}

                  {taxonomy.map(({ digunakan_oleh: usage, categories }) => {
                    const rows = usageGroups.get(usage) ?? [];
                    const candidateOptions = candidateOptionsForUsage(usage);
                    return (
                      <div key={usage} className="space-y-2.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                          Digunakan oleh: <span className="font-medium text-foreground">{digunakanOlehLabel(usage)}</span>
                          {rows.length === 0 && (
                            <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] py-0">
                              belum ada status aktif — kelompok ini kosong
                            </Badge>
                          )}
                        </p>

                        {rows.map((row) => (
                          <div
                            key={row.id}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{row.option_label_snapshot}</div>
                            </div>
                            <Badge variant="outline" className={toneClass(inferTone(row.kpi_category))}>
                              {row.kpi_category_label}
                            </Badge>
                          </div>
                        ))}

                        {candidateOptions.map((c) => (
                          <div
                            key={`${usage}-${c.option_code}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-primary/60 bg-primary/5 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{c.option_label}</div>
                              <div className="text-xs text-primary mt-0.5">
                                (status baru · option_code {c.option_code})
                              </div>
                            </div>
                            <Select
                              value={pendingKategori[`${usage}::${c.option_code}`] ?? ""}
                              onValueChange={(v) => setKategoriFor(usage, c.option_code, v)}
                            >
                              <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Pilih kategori" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}

                        {candidateOptions.length > 0 && (
                          <div className="flex items-center justify-end pt-1">
                            <Button
                              size="sm"
                              onClick={() => onSaveKategori(usage)}
                              disabled={createKpiCategory.isPending}
                              className="gap-2"
                            >
                              <Check className="w-4 h-4" />
                              Simpan kelompok
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Perubahan bersifat forward-only — tidak mengubah histori periode sebelumnya.
                  </p>
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
                  placeholder="Cari kode, peran data, status…"
                  className="pl-9"
                />
              </div>
              {(anyFilter1 || anyFilter2) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQ("");
                    setF1({ kuesioner: "all", semanticRole: "all", status: "all" });
                    setF2({ semanticRole: "all", kpi: "all", statusAktif: "all" });
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
                  Semua mapping per kuesioner. Perubahan pada versi baru tidak mengubah baris lama.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3">
                  <ColFilter label="Kuesioner" value={f1.kuesioner} options={opts1.kuesioner} onChange={(v) => { setF1({ ...f1, kuesioner: v }); setPage1(1); }} />
                  <ColFilter label="Peran Data" value={f1.semanticRole} options={opts1.semanticRole} onChange={(v) => { setF1({ ...f1, semanticRole: v }); setPage1(1); }} />
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
                        <TableHead>Berlaku Sejak</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Dipetakan Oleh</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedCodesLoading && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">
                            Memuat data…
                          </TableCell>
                        </TableRow>
                      )}
                      {!savedCodesLoading && pagedCodes.map((r) => {
                        const roleMeta = roleByKey[r.semantic_role];
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">{questionnaireNameById[r.questionnaire_id] ?? r.questionnaire_id}</TableCell>
                            <TableCell className="font-mono text-xs">{r.question_code}</TableCell>
                            <TableCell className="text-sm max-w-md">{r.question_text_snapshot}</TableCell>
                            <TableCell>
                              <code className="text-xs font-mono text-primary">{r.semantic_role}</code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs font-mono">
                                {roleMeta ? formatExpectedKind(roleMeta) : "—"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-[11px] font-mono text-muted-foreground">
                                {roleMeta ? `${roleMeta.target_table}.${roleMeta.target_column}` : "—"}
                              </code>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.effective_date}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  r.is_active
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-muted-foreground/30 bg-muted text-muted-foreground"
                                }
                              >
                                {r.is_active ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">{r.mapped_by?.name ?? "—"}</TableCell>
                          </TableRow>
                        );
                      })}
                      {!savedCodesLoading && pagedCodes.length === 0 && (
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3">
                  <ColFilter label="Peran Data" value={f2.semanticRole} options={opts2.semanticRole} onChange={(v) => { setF2({ ...f2, semanticRole: v }); setPage2(1); }} />
                  <ColFilter label="Digunakan Oleh (KPI)" value={f2.kpi} options={opts2.kpi} onChange={(v) => { setF2({ ...f2, kpi: v }); setPage2(1); }} />
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
                        <TableHead>Berlaku Sejak</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {savedStatusLoading && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
                            Memuat data…
                          </TableCell>
                        </TableRow>
                      )}
                      {!savedStatusLoading && pagedStatus.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <code className="text-xs font-mono text-primary">{r.semantic_role}</code>
                          </TableCell>
                          <TableCell>
                            <code className="text-[11px] font-mono text-muted-foreground">
                              {(codesByRole.get(r.semantic_role) ?? []).join(", ") || "—"}
                            </code>
                          </TableCell>
                          <TableCell className="text-sm">{r.option_label_snapshot}</TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="outline" className={toneClass(inferTone(r.kpi_category))}>
                              {r.kpi_category_label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{digunakanOlehLabel(r.digunakan_oleh)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.effective_date}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                r.is_active
                                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border-muted-foreground/30 bg-muted text-muted-foreground"
                              }
                            >
                              {r.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {r.is_active ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 h-8"
                                onClick={() => setEditStatusDialog({ open: true, row: r, newCategory: r.kpi_category })}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!savedStatusLoading && pagedStatus.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-6">
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

      {/* ===== Constraint-A conflict dialog ===== */}
      <Dialog
        open={conflictDialog.open}
        onOpenChange={(open) => setConflictDialog((d) => ({ ...d, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Role ini sudah dipetakan
            </DialogTitle>
            <DialogDescription>
              Role <code className="text-foreground">{selectedRole}</code> sudah aktif dipegang kode
              lain di kuesioner ini. Satu role hanya boleh punya satu kode aktif per kuesioner.
            </DialogDescription>
          </DialogHeader>

          {conflictDialog.conflicting_mapping && (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm space-y-1">
              <div>
                Kode aktif saat ini:{" "}
                <code className="font-mono text-foreground">{conflictDialog.conflicting_mapping.question_code}</code>
              </div>
              <div className="text-muted-foreground">
                "{conflictDialog.conflicting_mapping.question_text_snapshot}"
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConflictDialog({ open: false, conflicting_mapping: null })}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => onActivate(true)}
              disabled={createMapping.isPending}
              className="gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Ganti mapping lama
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Edit kategori KPI status tersimpan ===== */}
      <Dialog
        open={editStatusDialog.open}
        onOpenChange={(open) => setEditStatusDialog((d) => (open ? d : { open: false, row: null, newCategory: "" }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Ubah kategori KPI
            </DialogTitle>
            <DialogDescription>
              Baris lama akan dinonaktifkan (bukan dihapus) dan baris baru dibuat dengan kategori yang
              dipilih — riwayat tetap tersimpan untuk audit. Berlaku langsung ke seluruh data historis,
              tidak perlu ETL.
            </DialogDescription>
          </DialogHeader>

          {editStatusDialog.row && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-sm space-y-1">
                <div className="font-medium">{editStatusDialog.row.option_label_snapshot}</div>
                <div className="text-xs text-muted-foreground">
                  <code className="font-mono">{editStatusDialog.row.semantic_role}</code> ·{" "}
                  {digunakanOlehLabel(editStatusDialog.row.digunakan_oleh)} · kode opsi{" "}
                  <code className="font-mono">{editStatusDialog.row.option_code}</code>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Kategori KPI baru
                </label>
                <Select
                  value={editStatusDialog.newCategory}
                  onValueChange={(v) => setEditStatusDialog((d) => ({ ...d, newCategory: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {editCategoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditStatusDialog({ open: false, row: null, newCategory: "" })}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveEditStatus}
              disabled={
                deactivateKpiCategory.isPending ||
                createKpiCategory.isPending ||
                !editStatusDialog.newCategory ||
                editStatusDialog.newCategory === editStatusDialog.row?.kpi_category
              }
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Simpan perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
