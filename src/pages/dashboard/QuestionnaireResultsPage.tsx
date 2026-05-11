import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/contexts/RoleContext";

const QuestionnaireResultsPage = () => {
  const { selectedProdi } = useRole();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-heading font-bold">Hasil Kuesioner Prodi</h2>
          <p className="text-muted-foreground">
            Ringkasan hasil kuesioner {selectedProdi ?? "program studi Anda"}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Response Rate</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">83.9%</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Rata-rata Kepuasan</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">4.2 / 5.0</p></CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader><CardTitle>Detail Hasil</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Hasil detail kuesioner akan ditampilkan di sini.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default QuestionnaireResultsPage;
