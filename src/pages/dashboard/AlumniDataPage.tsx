import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/contexts/RoleContext";

const AlumniDataPage = () => {
  const { selectedProdi } = useRole();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold">Data Alumni Prodi</h2>
          <p className="text-muted-foreground">
            Data alumni {selectedProdi ?? "program studi Anda"}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Total Alumni</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">342</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Sudah Mengisi</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">287</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Belum Mengisi</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-orange-500">55</p></CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Daftar Alumni</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Data alumni akan ditampilkan di sini berdasarkan program studi Anda.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AlumniDataPage;
