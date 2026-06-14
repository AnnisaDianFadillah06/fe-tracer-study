import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Edit, Trash2, Search, X, Building2, FileBadge } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useThresholdManagement,
  THRESHOLD_INDICATORS,
} from "@/hooks/useThresholdManagement";

const ThresholdManagementPage = () => {
  const {
    lams,
    standars,
    lamById,
    filteredStandar,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterLam,
    setFilterLam,

    // LAM
    isLamDialogOpen,
    setIsLamDialogOpen,
    editingLam,
    lamForm,
    setLamForm,
    lamFormErrors,
    isLamFormValid,
    submittingLam,
    prodiSearch,
    setProdiSearch,
    filteredProdiOptions,   // sekarang { id, label }[]
    openAddLam,
    openEditLam,
    submitLam,
    toggleProdi,
    toggleAllVisibleProdi,
    confirmDeleteLam,
    deleteLam,
    isLamDeleteOpen,
    setIsLamDeleteOpen,

    // Standar
    isStdDialogOpen,
    setIsStdDialogOpen,
    editingStandar,
    stdForm,
    setStdForm,
    stdFormErrors,
    isStdFormValid,
    submittingStd,
    openAddStandar,
    openEditStandar,
    submitStandar,
    updateThreshold,
    confirmDeleteStandar,
    deleteStandar,
    isStdDeleteOpen,
    setIsStdDeleteOpen,
    toggleStandarStatus,
  } = useThresholdManagement();

  // ── karena filteredProdiOptions sekarang { id, label }[], ambil label-nya
  const visibleLabels = filteredProdiOptions.map((p) => p.label);
  const allVisibleSelected =
    visibleLabels.length > 0 && visibleLabels.every((l) => lamForm.programs.includes(l));

  const totalAktif = standars.filter((s) => s.is_active).length;
  const totalNonaktif = standars.length - totalAktif;
  const disableAdd = loading || !!error;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-heading text-2xl font-bold">Manajemen Threshold</h2>
            <p className="text-muted-foreground text-sm">
              Kelola LAM beserta Standar Penilaian (versi tahunan) dan 5 indikator threshold
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total LAM</p>
                {loading ? <Skeleton className="h-6 w-10 mt-1" /> : <p className="text-xl font-semibold">{lams.length}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileBadge className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Standar</p>
                {loading ? <Skeleton className="h-6 w-10 mt-1" /> : <p className="text-xl font-semibold">{standars.length}</p>}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Aktif</p>
              {loading ? <Skeleton className="h-6 w-10 mt-1" /> : <p className="text-xl font-semibold text-emerald-600">{totalAktif}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Tidak Aktif</p>
              {loading ? <Skeleton className="h-6 w-10 mt-1" /> : <p className="text-xl font-semibold text-muted-foreground">{totalNonaktif}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lam" className="w-full">
          <TabsList>
            <TabsTrigger value="lam">
              <Building2 className="w-4 h-4 mr-2" /> Daftar LAM
            </TabsTrigger>
            <TabsTrigger value="standar">
              <FileBadge className="w-4 h-4 mr-2" /> Daftar Standar Penilaian
            </TabsTrigger>
          </TabsList>

          {/* ===== Tab: Daftar LAM ===== */}
          <TabsContent value="lam">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Daftar LAM</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{lams.length} LAM terdaftar</p>
                </div>
                <Button onClick={openAddLam} disabled={disableAdd}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah LAM
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Nama LAM</TableHead>
                        <TableHead className="w-[120px]">Kode</TableHead>
                        <TableHead className="min-w-[260px]">Prodi Terpetakan</TableHead>
                        <TableHead className="w-[100px]">Standar</TableHead>
                        <TableHead className="w-[110px] text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 2 }).map((_, i) => (
                          <TableRow key={`lsk-${i}`}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : lams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Belum ada LAM. Klik "Tambah LAM" untuk membuat.
                          </TableCell>
                        </TableRow>
                      ) : (
                        lams.map((l) => {
                          const count = standars.filter((s) => s.lam_id === l.id).length;
                          return (
                            <TableRow key={l.id}>
                              <TableCell className="font-medium">{l.name}</TableCell>
                              <TableCell><Badge variant="outline">{l.code}</Badge></TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {l.programs.slice(0, 3).map((p) => (
                                    <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                                  ))}
                                  {l.programs.length > 3 && (
                                    <Badge variant="outline" className="text-[10px]">+{l.programs.length - 3}</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell><Badge variant="secondary">{count}</Badge></TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditLam(l)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => confirmDeleteLam(l.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Tab: Daftar Standar Penilaian ===== */}
          <TabsContent value="standar">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Daftar Standar Penilaian</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{standars.length} standar terdaftar</p>
                </div>
                <Button onClick={openAddStandar} disabled={disableAdd || lams.length === 0}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Standar Penilaian
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari standar, LAM, tahun, atau prodi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                      disabled={disableAdd}
                    />
                  </div>
                  <Select value={filterLam} onValueChange={setFilterLam} disabled={disableAdd}>
                    <SelectTrigger className="md:w-[200px]">
                      <SelectValue placeholder="LAM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua LAM</SelectItem>
                      {lams.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus} disabled={disableAdd}>
                    <SelectTrigger className="md:w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="nonaktif">Tidak Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">LAM</TableHead>
                        <TableHead className="min-w-[180px]">Standar</TableHead>
                        <TableHead className="min-w-[420px]">Indikator Threshold</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[110px] text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                          <TableRow key={`sk-${i}`}>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell>
                              <div className="space-y-1.5">
                                <Skeleton className="h-3 w-72" />
                                <Skeleton className="h-3 w-64" />
                                <Skeleton className="h-3 w-60" />
                              </div>
                            </TableCell>
                            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : error ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-destructive py-8">{error}</TableCell>
                        </TableRow>
                      ) : filteredStandar.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Tidak ada standar penilaian
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStandar.map((s) => {
                          const lam = lamById[s.lam_id];
                          return (
                            <TableRow key={s.id}>
                              <TableCell>
                                <div className="font-medium">{lam?.name ?? "—"}</div>
                                <div className="text-[11px] text-muted-foreground">{lam?.code}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{s.version_name}</div>
                                <div className="text-[11px] text-muted-foreground">Tahun {s.year}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1.5">
                                  {s.thresholds.map((ind) => (
                                    <div key={ind.indicator_id} className="flex items-center gap-2 text-xs">
                                      <span className="min-w-[180px] text-muted-foreground truncate">{ind.indicator_name}</span>
                                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-[10px] px-2">Baik {ind.baik}</Badge>
                                      <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-0 text-[10px] px-2">Unggul {ind.unggul}</Badge>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch checked={s.is_active} onCheckedChange={() => toggleStandarStatus(s.id)} />
                                  <span className="text-xs text-muted-foreground">{s.is_active ? "Aktif" : "Nonaktif"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" onClick={() => openEditStandar(s)}>
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => confirmDeleteStandar(s.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== LAM Dialog ===== */}
      <Dialog open={isLamDialogOpen} onOpenChange={setIsLamDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={submitLam}>
            <DialogHeader>
              <DialogTitle>{editingLam ? "Edit LAM" : "Tambah LAM"}</DialogTitle>
              <DialogDescription>
                Isi identitas LAM dan petakan program studi yang berada di bawah akreditasinya
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nama LAM *</Label>
                <Input
                  placeholder="contoh: LAM INFOKOM"
                  value={lamForm.name}
                  onChange={(e) => setLamForm({ ...lamForm, name: e.target.value })}
                  aria-invalid={!!lamFormErrors.name}
                />
                {lamFormErrors.name && <p className="text-[11px] text-destructive">{lamFormErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Kode *</Label>
                <Input
                  placeholder="contoh: INFOKOM"
                  value={lamForm.code}
                  onChange={(e) => setLamForm({ ...lamForm, code: e.target.value.toUpperCase() })}
                  aria-invalid={!!lamFormErrors.code}
                />
                {lamFormErrors.code && <p className="text-[11px] text-destructive">{lamFormErrors.code}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pemetaan Program Studi *</Label>
                <span className="text-xs text-muted-foreground">{lamForm.programs.length} dipilih</span>
              </div>
              {lamFormErrors.programs && <p className="text-[11px] text-destructive">{lamFormErrors.programs}</p>}

              {lamForm.programs.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30 max-h-24 overflow-y-auto">
                  {lamForm.programs.map((label) => (
                    <Badge key={label} variant="secondary" className="gap-1">
                      {label}
                      <button type="button" onClick={() => toggleProdi(label)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari program studi..."
                  value={prodiSearch}
                  onChange={(e) => setProdiSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex items-center gap-2 px-2">
                <Checkbox
                  id="select-all-visible"
                  checked={allVisibleSelected}
                  onCheckedChange={(c) => toggleAllVisibleProdi(!!c)}
                />
                <Label htmlFor="select-all-visible" className="text-xs cursor-pointer">
                  Pilih semua hasil pencarian ({filteredProdiOptions.length})
                </Label>
              </div>

              {/* ── daftar prodi — satu-satunya bagian yang berubah dari page lama ── */}
              <div className="border rounded-md max-h-56 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                {filteredProdiOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 col-span-2">Tidak ada prodi yang cocok</p>
                ) : (
                  filteredProdiOptions.map((p) => {
                    const checked = lamForm.programs.includes(p.label);
                    return (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                        <Checkbox checked={checked} onCheckedChange={() => toggleProdi(p.label)} />
                        <span>{p.label}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsLamDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={!isLamFormValid || submittingLam}>
                {submittingLam ? "Menyimpan..." : editingLam ? "Simpan Perubahan" : "Tambah LAM"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== Standar Dialog ===== */}
      <Dialog open={isStdDialogOpen} onOpenChange={setIsStdDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={submitStandar}>
            <DialogHeader>
              <DialogTitle>{editingStandar ? "Edit Standar Penilaian" : "Tambah Standar Penilaian"}</DialogTitle>
              <DialogDescription>
                Pilih LAM, tentukan tahun & nama standar, lalu isi nilai threshold 5 indikator
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
              <div className="space-y-2 md:col-span-1">
                <Label>LAM *</Label>
                <Select
                  value={stdForm.lam_id}
                  onValueChange={(v) => setStdForm({ ...stdForm, lam_id: v })}
                >
                  <SelectTrigger aria-invalid={!!stdFormErrors.lam_id}>
                    <SelectValue placeholder="Pilih LAM" />
                  </SelectTrigger>
                  <SelectContent>
                    {lams.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Belum ada LAM</div>
                    ) : (
                      lams.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name} ({l.code})</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {stdFormErrors.lam_id && <p className="text-[11px] text-destructive">{stdFormErrors.lam_id}</p>}
              </div>
              <div className="space-y-2">
                <Label>Nama Standar *</Label>
                <Input
                  placeholder="contoh: Standar 2025"
                  value={stdForm.version_name}
                  onChange={(e) => setStdForm({ ...stdForm, version_name: e.target.value })}
                  aria-invalid={!!stdFormErrors.version_name}
                />
                {stdFormErrors.version_name && <p className="text-[11px] text-destructive">{stdFormErrors.version_name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Tahun *</Label>
                <Input
                  type="number" min={2000} max={2100}
                  value={stdForm.year}
                  onChange={(e) => setStdForm({ ...stdForm, year: Number(e.target.value) })}
                  aria-invalid={!!stdFormErrors.year}
                />
                {stdFormErrors.year && <p className="text-[11px] text-destructive">{stdFormErrors.year}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nilai Threshold per Indikator *</Label>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Indikator</TableHead>
                      <TableHead className="w-[140px]"><span className="text-emerald-600">Baik</span></TableHead>
                      <TableHead className="w-[140px]"><span className="text-violet-600">Unggul</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {THRESHOLD_INDICATORS.map((ind) => {
                      const row = stdForm.thresholds.find((x) => x.indicator_id === ind.id);
                      const tErr = stdFormErrors.thresholds?.[ind.id];
                      return (
                        <TableRow key={ind.id}>
                          <TableCell className="text-sm">
                            <div className="font-medium">{ind.name}</div>
                            <div className="text-[10px] text-muted-foreground">{ind.key} • {ind.unit}</div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number" min={0} max={100}
                              value={row?.baik ?? 0}
                              onChange={(e) => updateThreshold(ind.id, "baik", Number(e.target.value))}
                              className="h-8"
                              aria-invalid={!!tErr?.baik}
                            />
                            {tErr?.baik && <p className="text-[10px] text-destructive mt-1">{tErr.baik}</p>}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number" min={0} max={100}
                              value={row?.unggul ?? 0}
                              onChange={(e) => updateThreshold(ind.id, "unggul", Number(e.target.value))}
                              className="h-8"
                              aria-invalid={!!tErr?.unggul}
                            />
                            {tErr?.unggul && <p className="text-[10px] text-destructive mt-1">{tErr.unggul}</p>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-md p-3 mt-4">
              <div>
                <Label>Status Standar</Label>
                <p className="text-xs text-muted-foreground">Hanya standar aktif yang dipakai pada visualisasi dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={stdForm.is_active}
                  onCheckedChange={(c) => setStdForm({ ...stdForm, is_active: c })}
                />
                <Badge variant={stdForm.is_active ? "default" : "outline"}>
                  {stdForm.is_active ? "Aktif" : "Tidak Aktif"}
                </Badge>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsStdDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={!isStdFormValid || submittingStd}>
                {submittingStd ? "Menyimpan..." : editingStandar ? "Simpan Perubahan" : "Tambah Standar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete LAM */}
      <AlertDialog open={isLamDeleteOpen} onOpenChange={setIsLamDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus LAM?</AlertDialogTitle>
            <AlertDialogDescription>
              LAM beserta seluruh standar penilaian dan threshold-nya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={deleteLam} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Standar */}
      <AlertDialog open={isStdDeleteOpen} onOpenChange={setIsStdDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Standar Penilaian?</AlertDialogTitle>
            <AlertDialogDescription>
              Standar beserta seluruh nilai threshold-nya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={deleteStandar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ThresholdManagementPage;
