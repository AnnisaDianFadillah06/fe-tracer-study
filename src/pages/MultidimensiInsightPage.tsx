import { Layers, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Dashboard-nya di-host di Metabase eksternal (bukan bagian dari FE/BE
// tracer study kita). Sengaja tidak di-iframe: server Metabase umumnya
// belum HTTPS, jadi browser akan blokir iframe itu sebagai mixed content
// begitu situs ini sendiri diakses lewat HTTPS -- makanya link-out biasa.
const METABASE_DASHBOARD_URL =
  import.meta.env.VITE_METABASE_DASHBOARD_URL ||
  "http://localhost:3000/public/dashboard/c3db24a3-7878-4d57-9a2d-e3f53b299b06";

const MultidimensiInsightPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-2 mb-6">
        <h1 className="font-heading text-2xl font-bold">Multidimensi Insight</h1>
        <p className="text-muted-foreground">Eksplorasi data multidimensi</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1 max-w-md">
            <h2 className="font-heading text-lg font-semibold">Dashboard Metabase Eksternal</h2>
            <p className="text-muted-foreground text-sm">
              Eksplorasi multidimensi (mis. lokasi kerja × UMP × gaji) disajikan lewat dashboard
              Metabase terpisah. Buka di tab baru untuk melihat & mengeksplor datanya.
            </p>
          </div>
          <Button asChild>
            <a href={METABASE_DASHBOARD_URL} target="_blank" rel="noopener noreferrer">
              Buka Dashboard Metabase
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default MultidimensiInsightPage;
