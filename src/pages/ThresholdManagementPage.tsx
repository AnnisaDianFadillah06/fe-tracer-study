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
import { Plus, Edit, Trash2, Search, Target, X } from "lucide-react";
import { useThresholdManagement, LAM_OPTIONS } from "@/hooks/useThresholdManagement";

const ThresholdManagementPage = () => {
  const {
    filtered,
    items,
    searchQuery,
    setSearchQuery,
    filterLam,
    setFilterLam,
    filterStatus,
    setFilterStatus,
    isDialogOpen,
    setIsDialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    editing,
    formData,
    setFormData,
    prodiSearch,
    setProdiSearch,
    filteredProdiOptions,
    handleOpenAdd,
    handleOpenEdit,
    handleSubmit,
    confirmDelete,
    handleDelete,
    toggleProdi,
    toggleAllVisibleProdi,
    toggleStatus,
  } = useThresholdManagement();

  const allVisibleSelected =
    filteredProdiOptions.length > 0 &&
    filteredProdiOptions.every((p) => formData.prodi.includes(p));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold">Manajemen Threshold</h2>
            <p className="text-muted-foreground text-sm">
              Kelola nilai ambang batas LAM/BAN-PT dan pemetaan ke program studi
            </p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Threshold
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Threshold</p>
                <p className="text-xl font-semibold">{items.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Aktif</p>
              <p className="text-xl font-semibold text-emerald-600">
                {items.filter((i) => i.status === "aktif").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Tidak Aktif</p>
              <p className="text-xl font-semibold text-muted-foreground">
                {items.filter((i) => i.status === "nonaktif").length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daftar Threshold</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari LAM, tahun, atau prodi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterLam} onValueChange={setFilterLam}>
                <SelectTrigger className="md:w-[200px]">
                  <SelectValue placeholder="Filter LAM" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua LAM</SelectItem>
                  {LAM_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
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

            {/* Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>LAM</TableHead>
                    <TableHead className="w-[90px]">Tahun</TableHead>
                    <TableHead className="w-[100px]">Nilai</TableHead>
                    <TableHead>Prodi Terpetakan</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[120px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Tidak ada data threshold
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.lam}</TableCell>
                        <TableCell>{t.tahun}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{t.nilai}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {t.prodi.slice(0, 4).map((p) => (
                              <Badge key={p} variant="outline" className="text-xs">
                                {p}
                              </Badge>
                            ))}
                            {t.prodi.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{t.prodi.length - 4} lainnya
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={t.status === "aktif"}
                              onCheckedChange={() => toggleStatus(t.id)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {t.status === "aktif" ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(t)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmDelete(t.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit Threshold" : "Tambah Threshold"}
              </DialogTitle>
              <DialogDescription>
                Tetapkan nama LAM, tahun, nilai threshold, dan petakan ke program studi
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
              <div className="space-y-2">
                <Label>Nama LAM *</Label>
                <Select
                  value={formData.lam}
                  onValueChange={(v) => setFormData({ ...formData, lam: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih LAM" />
                  </SelectTrigger>
                  <SelectContent>
                    {LAM_OPTIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tahun *</Label>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  value={formData.tahun}
                  onChange={(e) =>
                    setFormData({ ...formData, tahun: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Nilai Threshold *</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.nilai}
                  onChange={(e) =>
                    setFormData({ ...formData, nilai: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            {/* Prodi mapping */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pemetaan Program Studi *</Label>
                <span className="text-xs text-muted-foreground">
                  {formData.prodi.length} dipilih
                </span>
              </div>

              {/* Selected chips */}
              {formData.prodi.length > 0 && (
                <div className="flex flex-wrap gap-1 p-2 border rounded-md bg-muted/30 max-h-24 overflow-y-auto">
                  {formData.prodi.map((p) => (
                    <Badge key={p} variant="secondary" className="gap-1">
                      {p}
                      <button
                        type="button"
                        onClick={() => toggleProdi(p)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search prodi */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari program studi..."
                  value={prodiSearch}
                  onChange={(e) => setProdiSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Select all visible */}
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

              {/* Checkbox list */}
              <div className="border rounded-md max-h-64 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                {filteredProdiOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4 col-span-2">
                    Tidak ada prodi yang cocok
                  </p>
                ) : (
                  filteredProdiOptions.map((p) => {
                    const checked = formData.prodi.includes(p);
                    return (
                      <label
                        key={p}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleProdi(p)}
                        />
                        <span>{p}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between border rounded-md p-3 mt-4">
              <div>
                <Label>Status Threshold</Label>
                <p className="text-xs text-muted-foreground">
                  Hanya threshold aktif yang dipakai pada visualisasi dashboard
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.status === "aktif"}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, status: c ? "aktif" : "nonaktif" })
                  }
                />
                <Badge variant={formData.status === "aktif" ? "default" : "outline"}>
                  {formData.status === "aktif" ? "Aktif" : "Tidak Aktif"}
                </Badge>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit">{editing ? "Simpan Perubahan" : "Tambah"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Threshold?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data threshold akan dihapus permanen
              dan tidak lagi diterapkan ke prodi yang dipetakan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default ThresholdManagementPage;