import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/common/use-toast";
import api from "@/lib/api";
import { Archive, Info, Loader2, Save } from "lucide-react";

interface SettingsPayload {
  range: { start: number | null; end: number | null };
  data_bounds: { min: number | null; max: number | null };
  available_years: number[];
}

/**
 * Pengaturan pengarsipan visual halaman publik.
 *
 * Rentang ini HANYA membatasi halaman publik. Dashboard internal tetap
 * melihat seluruh tahun — membatasi keduanya dari satu pengaturan membuat
 * kajur/kaprodi kehilangan data tanpa tahu sebabnya.
 */
const PublicSettingsPage = () => {
  const { toast } = useToast();

  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/admin/public-settings");
        if (data.success) {
          setSettings(data.data);
          setStart(data.data.range.start !== null ? String(data.data.range.start) : "");
          setEnd(data.data.range.end !== null ? String(data.data.range.end) : "");
        }
      } catch {
        toast({ title: "Gagal", description: "Gagal memuat pengaturan.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Divalidasi juga di backend; di sini hanya supaya tombol Simpan tidak
  // mengirim rentang terbalik yang pasti ditolak.
  const validationError = useMemo(() => {
    const s = start === "" ? null : Number(start);
    const e = end === "" ? null : Number(end);

    if (s !== null && (!Number.isInteger(s) || s < 1990 || s > 2100)) return "Tahun awal harus antara 1990 dan 2100.";
    if (e !== null && (!Number.isInteger(e) || e < 1990 || e > 2100)) return "Tahun akhir harus antara 1990 dan 2100.";
    if (s !== null && e !== null && e < s) return "Tahun akhir tidak boleh lebih kecil dari tahun awal.";

    return null;
  }, [start, end]);

  const handleSave = async () => {
    if (validationError) return;

    setSaving(true);
    try {
      const { data } = await api.put("/admin/public-settings", {
        start: start === "" ? null : Number(start),
        end: end === "" ? null : Number(end),
      });

      if (data.success) {
        setSettings((prev) => (prev ? { ...prev, ...data.data } : prev));
        toast({ title: "Berhasil", description: data.message });
      }
    } catch {
      toast({ title: "Gagal", description: "Gagal menyimpan pengaturan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold">Halaman Publik</h2>
          <p className="text-muted-foreground text-sm">
            Atur angkatan mana yang ditampilkan ke masyarakat umum
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Memuat pengaturan…
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Archive className="h-4 w-4 text-primary" aria-hidden />
                  Rentang Tahun Lulusan
                </CardTitle>
                <CardDescription>
                  Angkatan di luar rentang ini disembunyikan dari halaman Statistik publik.
                  Tidak berpengaruh ke dashboard internal (staf tetap melihat semua tahun)
                  maupun ke halaman Laporan TS — laporan diberi Tahun Pelaksanaan, bukan
                  Tahun Lulusan, dan tampil selama statusnya sudah diterbitkan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="year-start">Tahun Awal</Label>
                    <Input
                      id="year-start"
                      type="number"
                      min={1990}
                      max={2100}
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      placeholder="Kosongkan = tanpa batas bawah"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year-end">Tahun Akhir</Label>
                    <Input
                      id="year-end"
                      type="number"
                      min={1990}
                      max={2100}
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      placeholder="Kosongkan = tanpa batas atas"
                    />
                  </div>
                </div>

                {validationError && (
                  <p className="text-sm text-destructive">{validationError}</p>
                )}

                <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <p>
                    Mengosongkan salah satu kolom berarti sisi itu tanpa batas. Membatasi
                    rentang membuat halaman Statistik publik lebih ringan karena tidak perlu
                    menghitung seluruh angkatan yang pernah ada. Untuk menyembunyikan sebuah
                    laporan, matikan “Tampil Publik” di halaman Laporan Publik — bukan lewat
                    rentang ini.
                  </p>
                </div>

                <Button onClick={handleSave} disabled={isSaving || validationError !== null}>
                  {isSaving ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />Menyimpan…</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" aria-hidden />Simpan</>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data yang Tersedia</CardTitle>
                <CardDescription>Dari data alumni yang ada sekarang</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Tahun lulusan di database</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {settings?.data_bounds.min ?? "—"} – {settings?.data_bounds.max ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    Tampil di halaman publik ({settings?.available_years.length ?? 0} angkatan)
                  </p>
                  {settings?.available_years.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {settings.available_years.map((year) => (
                        <Badge key={year} variant="secondary" className="tabular-nums">{year}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">
                      Tidak ada angkatan yang cocok — halaman publik akan kosong.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PublicSettingsPage;
