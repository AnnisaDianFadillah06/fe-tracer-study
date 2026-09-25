import { Compass, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SavedQuestionsList from "./SavedQuestionsList";
import type { InsightQuestion } from "@/hooks/useInsightQuestions";
import type { ExplorerQueryInput, StarterQuestion } from "@/lib/olapExplorer";

interface Props {
  starters: StarterQuestion[];
  /** Kalimat ringkas satu susunan, mis. "Rata-rata gaji menurut Program Studi". */
  describe: (input: ExplorerQueryInput) => string;
  savedQuestions: InsightQuestion[];
  activeId: number | null;
  onStart: (input: ExplorerQueryInput) => void;
  onOpen: (question: InsightQuestion) => void;
  onDelete: (question: InsightQuestion) => void;
}

const STEPS = [
  "Pilih apa yang ingin dihitung",
  "Pilih pembagiannya (mis. per jurusan)",
  "Batasi datanya bila perlu",
];

/**
 * Tampilan awal Insight sebelum ada yang dihitung. Jalan masuk utama adalah
 * contoh siap pakai; pertanyaan tersimpan ada di tab sendiri supaya tidak
 * menumpuk dengan contoh.
 */
const InsightStartPanel = ({
  starters,
  describe,
  savedQuestions,
  activeId,
  onStart,
  onOpen,
  onDelete,
}: Props) => {
  const mine = savedQuestions.filter((q) => q.is_mine);
  const shared = savedQuestions.filter((q) => !q.is_mine);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <Compass className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">Pilih apa yang ingin dihitung untuk memulai</CardTitle>
            <ol className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted-foreground">
              Atur di panel "Susun analisis" di atas, atau mulai dari salah satu contoh di bawah.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="contoh">
          <TabsList className="mb-4 flex h-auto w-fit flex-wrap gap-1.5 rounded-xl bg-muted/40 p-1.5">
            <TabsTrigger value="contoh" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">Contoh ({starters.length})</TabsTrigger>
            <TabsTrigger value="mine" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">Tersimpan saya ({mine.length})</TabsTrigger>
            <TabsTrigger value="shared" className="rounded-lg px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow">Dibagikan ({shared.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contoh">
            {starters.length === 0 ? (
              <Empty>Belum ada contoh untuk data ini.</Empty>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {starters.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => onStart(s.input)}
                    className="group flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                  >
                    <span className="flex items-start gap-2 text-sm font-medium">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      {s.title}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {describe(s.input)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="mine">
            {mine.length === 0 ? (
              <Empty>
                Belum ada pertanyaan tersimpan. Susun analisis, lalu klik Simpan agar bisa dibuka
                lagi nanti.
              </Empty>
            ) : (
              <SavedQuestionsList
                questions={mine}
                activeId={activeId}
                onOpen={onOpen}
                onDelete={onDelete}
              />
            )}
          </TabsContent>

          <TabsContent value="shared">
            {shared.length === 0 ? (
              <Empty>Belum ada pertanyaan yang dibagikan pengguna lain kepada Anda.</Empty>
            ) : (
              <SavedQuestionsList
                questions={shared}
                activeId={activeId}
                onOpen={onOpen}
                onDelete={onDelete}
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const Empty = ({ children }: { children: string }) => (
  <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
    {children}
  </p>
);

export default InsightStartPanel;
