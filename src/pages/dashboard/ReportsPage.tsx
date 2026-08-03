import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const ReportsPage = () => (
  <DashboardLayout>
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Laporan Tracer Study</h2>
        <p className="text-muted-foreground">Laporan dan dokumen tracer study institusi</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "Laporan Tracer Study 2025", date: "Desember 2025", status: "Final" },
          { title: "Laporan Tracer Study 2024", date: "November 2024", status: "Final" },
          { title: "Laporan Semester Ganjil 2025/2026", date: "Januari 2026", status: "Draft" },
        ].map((report) => (
          <Card key={report.title} className="cursor-pointer hover:border-primary/50 transition-colors">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle className="text-sm">{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{report.date} • {report.status}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </DashboardLayout>
);

export default ReportsPage;
