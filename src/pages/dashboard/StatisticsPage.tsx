import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const StatisticsPage = () => (
  <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Statistik Institusi</h2>
        <p className="text-muted-foreground">Statistik lintas program studi</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Lulusan</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">4,218</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Response Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">76.3%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Bekerja</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">68.5%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Studi Lanjut</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-blue-600">12.1%</p></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Perbandingan Antar Prodi</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Grafik perbandingan statistik antar program studi akan ditampilkan di sini.</p>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default StatisticsPage;
