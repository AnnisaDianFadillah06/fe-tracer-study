import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/common/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronRight, ChevronDown, Plus, Edit, Trash2, Move, Search, Network,
  Loader2, AlertCircle, EyeOff, Eye, GraduationCap, Building2,
} from "lucide-react";
import api from "@/lib/api";

/** Ekstrak pesan error backend ({ message }) dari respons axios tanpa memakai `any`. */
function apiErrorMessage(e: unknown, fallback: string): string {
  if (typeof e === "object" && e !== null && "response" in e) {
    const response = (e as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}

// ── Tipe ──────────────────────────────────────────────────────────────────
interface OrgUnitTypeRow {
  id: number;
  institution_type: string;
  level_index: number;
  label: string;
  is_required: boolean;
}

interface OrgUnitNode {
  id: number;
  name: string;
  org_unit_type_id: number;
  level_label: string | null;
  level_index: number | null;
  parent_id: number | null;
  is_active: boolean;
  children: OrgUnitNode[];
}

interface SearchHit {
  id: number;
  name: string;
  org_unit_type_id: number;
  level_label: string;
  level_index: number;
  parent_id: number | null;
  is_active: boolean;
}

const TEMPLATE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: "politeknik", label: "Politeknik", description: "1 level: Jurusan (langsung menaungi Program Studi)" },
  { value: "universitas", label: "Universitas", description: "2 level: Fakultas > Departemen" },
  { value: "institut", label: "Institut", description: "2 level: Fakultas/Sekolah > Departemen (opsional)" },
  { value: "custom", label: "Custom", description: "Definisikan sendiri, 2-5 level" },
];

// Flatten tree jadi array datar (dipakai dropdown pilih induk saat pindah/tambah unit).
function flattenTree(nodes: OrgUnitNode[], acc: OrgUnitNode[] = []): OrgUnitNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flattenTree(n.children, acc);
  }
  return acc;
}

// Kumpulkan id node ini + seluruh keturunannya -- dipakai supaya dialog
// pindah tidak menawarkan unit itu sendiri atau keturunannya sebagai induk
// baru (anti-siklus sisi klien; server tetap validasi ulang di DFR-09).
function collectDescendantIds(node: OrgUnitNode, acc: Set<number> = new Set()): Set<number> {
  acc.add(node.id);
  for (const c of node.children ?? []) collectDescendantIds(c, acc);
  return acc;
}

const StrukturInstitusiPage = () => {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [levels, setLevels] = useState<OrgUnitTypeRow[]>([]);
  const [tree, setTree] = useState<OrgUnitNode[]>([]);

  const hasAnyUnit = tree.length > 0;

  // ── Wizard pilih template (DFR-01) ──────────────────────────────────────
  const [selectedTemplate, setSelectedTemplate] = useState<string>("politeknik");
  const [customLevels, setCustomLevels] = useState<string[]>(["Unit Akademik", "Program Studi"]);
  const [templateSaving, setTemplateSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [templateRes, unitsRes] = await Promise.all([
        api.get("/org-unit-types/active-template"),
        api.get("/org-units/tree"),
      ]);
      const institutionType: string = templateRes.data.data.institution_type;
      setActiveTemplate(institutionType);

      const levelsRes = await api.get("/org-unit-types", { params: { institution_type: institutionType } });
      setLevels(levelsRes.data.data ?? []);
      setTree(unitsRes.data.data ?? []);
      setLoadError(null);
    } catch (e: unknown) {
      setLoadError(apiErrorMessage(e, "Gagal memuat struktur institusi. Periksa koneksi ke server."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const saveTemplate = async () => {
    setTemplateSaving(true);
    try {
      if (selectedTemplate === "custom") {
        const labels = customLevels.map((l) => l.trim()).filter(Boolean);
        if (labels.length < 2) {
          toast({ title: "Error", description: "Template custom butuh minimal 2 level (unit akademik + program studi).", variant: "destructive" });
          return;
        }
        await api.post("/org-unit-types/custom-template", {
          levels: labels.map((label) => ({ label, is_required: true })),
        });
      }
      const { data } = await api.post("/org-unit-types/select-template", { institution_type: selectedTemplate });
      toast({ title: "Berhasil", description: data.message ?? "Template dipilih." });
      await load();
    } catch (e: unknown) {
      toast({ title: "Gagal", description: apiErrorMessage(e, "Template gagal dipilih."), variant: "destructive" });
    } finally {
      setTemplateSaving(false);
    }
  };

  // ── Tree editor state (DFR-07/08/09) ────────────────────────────────────
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const flatUnits = useMemo(() => flattenTree(tree), [tree]);

  // Tambah/ubah unit
  const [unitDialog, setUnitDialog] = useState(false);
  const [editUnit, setEditUnit] = useState<OrgUnitNode | null>(null);
  const [unitForm, setUnitForm] = useState<{ name: string; org_unit_type_id: number | null; parent_id: number | null }>(
    { name: "", org_unit_type_id: null, parent_id: null },
  );
  const [unitSaving, setUnitSaving] = useState(false);

  const openAddRoot = () => {
    setEditUnit(null);
    setUnitForm({ name: "", org_unit_type_id: levels[0]?.id ?? null, parent_id: null });
    setUnitDialog(true);
  };
  const openAddChild = (parent: OrgUnitNode) => {
    const childLevel = levels.find((l) => l.level_index === (parent.level_index ?? 0) + 1);
    setEditUnit(null);
    setUnitForm({ name: "", org_unit_type_id: childLevel?.id ?? null, parent_id: parent.id });
    setUnitDialog(true);
  };
  const openEdit = (unit: OrgUnitNode) => {
    setEditUnit(unit);
    setUnitForm({ name: unit.name, org_unit_type_id: unit.org_unit_type_id, parent_id: unit.parent_id });
    setUnitDialog(true);
  };

  const saveUnit = async () => {
    const name = unitForm.name.trim();
    if (!name || !unitForm.org_unit_type_id) {
      toast({ title: "Error", description: "Nama dan level unit wajib diisi.", variant: "destructive" });
      return;
    }
    setUnitSaving(true);
    try {
      if (editUnit) {
        const { data } = await api.put(`/org-units/${editUnit.id}`, { name });
        toast({ title: "Berhasil", description: data.message ?? "Unit diperbarui." });
      } else {
        const { data } = await api.post("/org-units", {
          org_unit_type_id: unitForm.org_unit_type_id,
          name,
          parent_id: unitForm.parent_id,
        });
        toast({ title: "Berhasil", description: data.message ?? "Unit ditambahkan." });
      }
      setUnitDialog(false);
      await load();
    } catch (e: unknown) {
      toast({ title: "Gagal", description: apiErrorMessage(e, "Unit gagal disimpan."), variant: "destructive" });
    } finally {
      setUnitSaving(false);
    }
  };

  const toggleActive = async (unit: OrgUnitNode) => {
    try {
      const { data } = await api.put(`/org-units/${unit.id}`, { name: unit.name, is_active: !unit.is_active });
      toast({ title: "Berhasil", description: data.message ?? (unit.is_active ? "Unit dinonaktifkan." : "Unit diaktifkan kembali.") });
      await load();
    } catch (e: unknown) {
      toast({ title: "Gagal", description: apiErrorMessage(e, "Status unit gagal diubah."), variant: "destructive" });
    }
  };

  const [deleteUnitId, setDeleteUnitId] = useState<number | null>(null);
  const confirmDeleteUnit = async () => {
    if (deleteUnitId === null) return;
    try {
      const { data } = await api.delete(`/org-units/${deleteUnitId}`);
      toast({ title: "Berhasil", description: data.message ?? "Unit dihapus." });
      await load();
    } catch (e: unknown) {
      toast({ title: "Gagal", description: apiErrorMessage(e, "Unit gagal dihapus."), variant: "destructive" });
    } finally {
      setDeleteUnitId(null);
    }
  };

  // Reparent (DFR-09)
  const [moveUnit, setMoveUnit] = useState<OrgUnitNode | null>(null);
  const [moveTargetId, setMoveTargetId] = useState<string>("__root__");
  const [moveSaving, setMoveSaving] = useState(false);

  const openMove = (unit: OrgUnitNode) => {
    setMoveUnit(unit);
    setMoveTargetId(unit.parent_id !== null ? String(unit.parent_id) : "__root__");
  };

  const eligibleParents = useMemo(() => {
    if (!moveUnit) return [];
    const excluded = collectDescendantIds(moveUnit);
    return flatUnits.filter((u) => !excluded.has(u.id) && (u.level_index ?? 0) < (moveUnit.level_index ?? 0));
  }, [moveUnit, flatUnits]);

  const saveMove = async () => {
    if (!moveUnit) return;
    setMoveSaving(true);
    try {
      const parentId = moveTargetId === "__root__" ? null : Number(moveTargetId);
      const { data } = await api.patch(`/org-units/${moveUnit.id}/reparent`, { parent_id: parentId });
      toast({ title: "Berhasil", description: data.message ?? "Unit berhasil dipindahkan." });
      setMoveUnit(null);
      await load();
    } catch (e: unknown) {
      toast({ title: "Gagal", description: apiErrorMessage(e, "Unit gagal dipindahkan."), variant: "destructive" });
    } finally {
      setMoveSaving(false);
    }
  };

  // ── Pencarian (DFR-11) ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLevelId, setSearchLevelId] = useState<string>("__all__");
  const [searchResults, setSearchResults] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim() && searchLevelId === "__all__") {
      setSearchResults(null);
      return;
    }
    let active = true;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/org-units/search", {
          params: {
            q: searchQuery.trim() || undefined,
            org_unit_type_id: searchLevelId === "__all__" ? undefined : searchLevelId,
          },
        });
        if (active) setSearchResults(data.data ?? []);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [searchQuery, searchLevelId]);

  // ── Render node pohon ────────────────────────────────────────────────────
  const renderNode = (node: OrgUnitNode, depth = 0) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isLeafLevel = levels.length > 0 && node.level_index === levels[levels.length - 1]?.level_index;

    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1.5 pr-2 rounded-md hover:bg-muted/60 group"
          style={{ paddingLeft: `${depth * 24 + 4}px` }}
        >
          <button
            type="button"
            onClick={() => hasChildren && toggleExpand(node.id)}
            className="h-5 w-5 flex items-center justify-center shrink-0 text-muted-foreground"
            aria-label={hasChildren ? (isExpanded ? "Tutup" : "Buka") : undefined}
          >
            {hasChildren ? (isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="h-4 w-4 inline-block" />}
          </button>

          {isLeafLevel ? <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" /> : <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />}

          <span className={`font-medium ${!node.is_active ? "text-muted-foreground line-through" : ""}`}>{node.name}</span>
          <Badge variant="outline" className="text-xs">{node.level_label}</Badge>
          {!node.is_active && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}

          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isLeafLevel && (
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Tambah unit anak" onClick={() => openAddChild(node)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ubah nama" onClick={() => openEdit(node)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Pindahkan (reparent)" onClick={() => openMove(node)}>
              <Move className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title={node.is_active ? "Nonaktifkan" : "Aktifkan"} onClick={() => toggleActive(node)}>
              {node.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={hasChildren ? "Masih punya unit anak" : "Hapus"}
              disabled={hasChildren}
              onClick={() => setDeleteUnitId(node.id)}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        {isExpanded && hasChildren && (
          <div>{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Network className="h-6 w-6" /> Struktur Institusi</h1>
          <p className="text-muted-foreground">Template hierarki dan pohon unit organisasi (jurusan/fakultas/departemen/program studi)</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> Memuat struktur institusi...
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center py-16 text-destructive gap-2">
            <AlertCircle className="h-5 w-5" /> {loadError}
          </div>
        ) : !hasAnyUnit ? (
          // ── DFR-01/04: Wizard setup awal (belum ada org_units) ──────────
          <Card>
            <CardHeader>
              <CardTitle>Pilih Template Institusi</CardTitle>
              <CardDescription>
                Belum ada unit organisasi yang dibuat. Pilih bentuk hierarki institusi Anda sebelum mulai
                menambah jurusan/fakultas/prodi. Pilihan ini terkunci begitu unit pertama dibuat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {TEMPLATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSelectedTemplate(opt.value)}
                    className={`text-left rounded-lg border p-4 transition-colors ${
                      selectedTemplate === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-sm text-muted-foreground">{opt.description}</div>
                  </button>
                ))}
              </div>

              {selectedTemplate === "custom" && (
                <div className="space-y-3 rounded-lg border p-4">
                  <Label>Level Custom (dari unit akademik teratas sampai program studi di dasar pohon)</Label>
                  {customLevels.map((lvl, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={lvl}
                        placeholder={i === customLevels.length - 1 ? "Contoh: Program Studi" : `Level ${i + 1}`}
                        onChange={(e) => setCustomLevels((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                      />
                      {customLevels.length > 2 && (
                        <Button variant="ghost" size="icon" onClick={() => setCustomLevels((prev) => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={customLevels.length >= 5}
                    onClick={() => setCustomLevels((prev) => [...prev, ""])}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Tambah Level ({customLevels.length}/5)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Minimal 2 level: 1 unit akademik + 1 program studi di dasar pohon. Maksimal 5 level.
                  </p>
                </div>
              )}

              <Button onClick={saveTemplate} disabled={templateSaving}>
                {templateSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gunakan Template Ini
              </Button>
            </CardContent>
          </Card>
        ) : (
          // ── DFR-03/07/08/09/11: Ringkasan level + tree editor ────────────
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Level Struktur Aktif — {activeTemplate}</CardTitle>
                <CardDescription>Kedalaman hierarki yang berlaku saat ini, dari unit teratas ke program studi.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {levels.map((l) => (
                    <Badge key={l.id} variant={l.is_required ? "default" : "outline"}>
                      {l.level_index}. {l.label}{!l.is_required && " (opsional)"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">Pohon Unit Organisasi</CardTitle>
                  <CardDescription>Klik panah untuk buka/tutup cabang. Arahkan kursor ke baris untuk aksi.</CardDescription>
                </div>
                <Button onClick={openAddRoot}><Plus className="h-4 w-4 mr-2" />Tambah Unit Teratas</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari unit berdasarkan nama..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={searchLevelId} onValueChange={setSearchLevelId}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Semua level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Semua level</SelectItem>
                      {levels.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {searchResults !== null ? (
                  <div className="space-y-1 border rounded-md p-2">
                    {searching ? (
                      <div className="text-sm text-muted-foreground py-4 text-center flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Mencari...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">Tidak ada unit yang cocok.</div>
                    ) : (
                      searchResults.map((hit) => (
                        <div key={hit.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/60">
                          <span className={`font-medium ${!hit.is_active ? "text-muted-foreground line-through" : ""}`}>{hit.name}</span>
                          <Badge variant="outline" className="text-xs">{hit.level_label}</Badge>
                          {!hit.is_active && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="border rounded-md p-2">
                    {tree.map((n) => renderNode(n))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Dialog tambah/ubah unit ── */}
      <Dialog open={unitDialog} onOpenChange={setUnitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editUnit ? "Ubah Unit" : "Tambah Unit"}</DialogTitle>
            {editUnit && (
              <DialogDescription>
                Rename merambat otomatis ke program studi/akun staf terkait jika unit ini adalah representasi
                sebuah jurusan (DFR-10).
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            {!editUnit && (
              <div>
                <Label>Level</Label>
                <Select
                  value={unitForm.org_unit_type_id ? String(unitForm.org_unit_type_id) : undefined}
                  onValueChange={(v) => setUnitForm((f) => ({ ...f, org_unit_type_id: Number(v) }))}
                >
                  <SelectTrigger><SelectValue placeholder="Pilih level" /></SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Nama Unit</Label>
              <Input
                value={unitForm.name}
                onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contoh: Teknik Elektro"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitDialog(false)}>Batal</Button>
            <Button onClick={saveUnit} disabled={unitSaving || !unitForm.name.trim()}>
              {unitSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog pindahkan (reparent) ── */}
      <Dialog open={moveUnit !== null} onOpenChange={(open) => !open && setMoveUnit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pindahkan "{moveUnit?.name}"</DialogTitle>
            <DialogDescription>
              Pilih induk baru. Unit tidak bisa dipindah menjadi anak dari dirinya sendiri atau keturunannya (DFR-09).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={moveTargetId} onValueChange={setMoveTargetId}>
              <SelectTrigger><SelectValue placeholder="Pilih induk baru" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__">— Jadikan unit teratas —</SelectItem>
                {eligibleParents.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.level_label}: {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveUnit(null)}>Batal</Button>
            <Button onClick={saveMove} disabled={moveSaving}>
              {moveSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pindahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Konfirmasi hapus ── */}
      <AlertDialog open={deleteUnitId !== null} onOpenChange={() => setDeleteUnitId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Unit?</AlertDialogTitle>
            <AlertDialogDescription>
              Unit hanya bisa dihapus kalau sudah tidak punya unit anak. Untuk menyembunyikan sementara tanpa
              menghapus, gunakan tombol nonaktifkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUnit} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default StrukturInstitusiPage;
