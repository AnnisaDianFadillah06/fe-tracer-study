import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/common/use-toast";
import { apiService } from "@/lib/apiClient";
import {
  BUILDER_DRAFT_STORAGE_KEY,
  createBlankFormDraft,
  createFormDraftFromQuestionnaire,
} from "@/lib/questionnaireDrafts";
import { ArrowRight, FileText, Loader2, PenLine } from "lucide-react";

const TEMPLATE_CODE = "DIKTI_2026";

const FormCreationChoicePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isTemplateLoading, setIsTemplateLoading] = useState(false);
  const [isBlankLoading, setIsBlankLoading] = useState(false);

  const openBuilder = (draft: unknown) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`${BUILDER_DRAFT_STORAGE_KEY}:new`, JSON.stringify(draft));
    }
    navigate("/dashboard/form-management/new/builder");
  };

  const handleBlankForm = () => {
    setIsBlankLoading(true);
    try {
      openBuilder(createBlankFormDraft());
    } finally {
      setIsBlankLoading(false);
    }
  };

  const handleTemplateForm = async () => {
    setIsTemplateLoading(true);

    try {
      const response = await apiService.get<{ success?: boolean; data?: unknown[] }>("/questionnaires");
      const questionnaires = Array.isArray(response?.data) ? response.data : [];
      const template =
        questionnaires.find((item: any) => item?.code === TEMPLATE_CODE) ??
        questionnaires.find((item: any) => item?.is_global && item?.status === "published") ??
        questionnaires.find((item: any) => item?.status === "published");

      if (!template) {
        toast({
          title: "Template tidak ditemukan",
          description: "Kuesioner dari questionnaireSeeder belum tersedia di server.",
          variant: "destructive",
        });
        return;
      }

      openBuilder(createFormDraftFromQuestionnaire(template));
    } catch {
      toast({
        title: "Gagal memuat template",
        description: "Tidak dapat mengambil template kuisioner dari server.",
        variant: "destructive",
      });
    } finally {
      setIsTemplateLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col justify-center gap-8 px-4 py-8 sm:px-6">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Pilih cara membuat kuisioner
          </div>
          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-bold sm:text-4xl">Tambah Kuisioner Baru</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Pilih apakah ingin memulai dari template kuesioner yang sudah disiapkan atau membuat kuisioner dari awal.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="group border-2 border-border/60 bg-white shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-lg">
            <CardContent className="flex h-full flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold">Gunakan Standar Kuesioner </h2>
                    <p className="max-w-md text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Kuesioner Standar untuk seluruh lulusan perguruan tinggi.
                      </span>
                      <span className="mt-1 block">
                        Standar kuisioner ini berasal dari Kementerian Pendidikan.
                      </span>
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-muted p-3 text-foreground">
                  <FileText className="h-7 w-7" />
                </div>
              </div>

              <Button className="mt-auto w-full sm:w-auto" variant="outline" onClick={handleTemplateForm} disabled={isTemplateLoading}>
                {isTemplateLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Gunakan Standar Kuesioner 
              </Button>
            </CardContent>
          </Card>

          <Card className="group border-2 border-border/60 bg-white shadow-sm transition-all duration-200 hover:border-primary/40 hover:shadow-lg">
            <CardContent className="flex h-full flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold">Buat Kuesioner Baru</h2>
                    <p className="max-w-md text-sm text-muted-foreground">
                      Mulai dari kanvas kosong untuk menyusun struktur, pertanyaan, dan alur kuisioner dari awal.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-muted p-3 text-foreground">
                  <PenLine className="h-7 w-7" />
                </div>
              </div>

              <Button className="mt-auto w-full sm:w-auto" variant="outline" onClick={handleBlankForm} disabled={isBlankLoading}>
                {isBlankLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Buat Kuesioner Baru
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FormCreationChoicePage;
