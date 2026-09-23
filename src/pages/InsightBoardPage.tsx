import { useState, type ComponentProps } from "react";
import { Link } from "react-router-dom";
import { isAxiosError } from "axios";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Compass,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Maximize2,
  Minimize2,
  PinOff,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ExplorerResultView from "@/components/dashboard/insight/ExplorerResultView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useExplorerQuery } from "@/hooks/useExplorer";
import {
  moveItem,
  useInsightBoard,
  useReorderBoard,
  useResizeItem,
  useUnpinItem,
  type BoardItem,
} from "@/hooks/useInsightBoard";
import { useToast } from "@/hooks/common/use-toast";

/**
 * Dashboard Saya — kumpulan pertanyaan Insight yang disematkan pengguna.
 *
 * Setiap kartu menghitung ulang pertanyaannya dari data terbaru dengan hak
 * akses pengguna yang sedang login; papan ini hanya menyimpan urutan dan
 * ukuran kartunya.
 */
const InsightBoardPage = () => {
  const { data: items, isLoading, isError } = useInsightBoard();
  const reorder = useReorderBoard();
  const resize = useResizeItem();
  const unpin = useUnpinItem();
  const { toast } = useToast();

  const ids = items?.map((i) => i.id) ?? [];

  const move = (id: number, direction: -1 | 1) => {
    reorder.mutate(moveItem(ids, id, direction), {
      onError: () =>
        toast({ title: "Urutan gagal disimpan", variant: "destructive" }),
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold">Dashboard Saya</h1>
          <p className="text-muted-foreground">
            Pertanyaan Insight yang Anda sematkan. Angkanya selalu dihitung ulang dari data
            terbaru setiap kali halaman dibuka.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard/insight">
            <Compass className="mr-2 h-4 w-4" />
            Buat pertanyaan baru
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dashboard tidak bisa dimuat</AlertTitle>
          <AlertDescription>Coba muat ulang halaman beberapa saat lagi.</AlertDescription>
        </Alert>
      )}

      {items && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <LayoutGrid className="h-8 w-8 text-primary" />
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              Belum ada yang disematkan. Buka halaman Insight, simpan sebuah pertanyaan, lalu
              tekan <strong>Sematkan ke Dashboard Saya</strong> — hasilnya akan tampil di sini.
            </p>
            <Button asChild>
              <Link to="/dashboard/insight">Ke halaman Insight</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {items.map((item, index) => (
            <BoardCard
              key={item.id}
              item={item}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              busy={reorder.isPending}
              onMove={(d) => move(item.id, d)}
              onResize={() =>
                resize.mutate({ id: item.id, size: item.size === "lg" ? "sm" : "lg" })
              }
              onUnpin={() =>
                unpin.mutate(item.id, {
                  onSuccess: () =>
                    toast({ title: "Dilepas dari Dashboard Saya", description: item.question.title }),
                })
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

// ─────────────────────────────────────────────────────────────

interface BoardCardProps {
  item: BoardItem;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onMove: (direction: -1 | 1) => void;
  onResize: () => void;
  onUnpin: () => void;
}

const BoardCard = ({ item, isFirst, isLast, busy, onMove, onResize, onUnpin }: BoardCardProps) => {
  const { question } = item;
  const { data: result, isLoading, error } = useExplorerQuery(question.query);
  const [chartMeasure, setChartMeasure] = useState<string | null>(question.chart_measure);

  return (
    <Card className={item.size === "lg" ? "lg:col-span-2" : ""}>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base leading-snug">
            <Link to={`/dashboard/insight?q=${question.id}`} className="hover:underline">
              {question.title}
            </Link>
          </CardTitle>
          {!question.is_mine && question.owner_name && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Users className="h-3 w-3" />
              oleh {question.owner_name}
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center">
          <IconButton label="Naikkan" disabled={isFirst || busy} onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" />
          </IconButton>
          <IconButton label="Turunkan" disabled={isLast || busy} onClick={() => onMove(1)}>
            <ArrowDown className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={item.size === "lg" ? "Perkecil kartu" : "Perlebar kartu"}
            onClick={onResize}
            className="hidden lg:inline-flex"
          >
            {item.size === "lg" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </IconButton>
          <Button asChild variant="ghost" size="icon" className="h-8 w-8" title="Buka di Insight">
            <Link to={`/dashboard/insight?q=${question.id}`} aria-label="Buka di Insight">
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
          <IconButton label="Lepas dari Dashboard Saya" onClick={onUnpin}>
            <PinOff className="h-4 w-4" />
          </IconButton>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="flex h-60 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Menghitung…
          </div>
        )}

        {error && (
          <p className="py-10 text-center text-sm text-destructive">
            {isAxiosError(error) && typeof error.response?.data?.message === "string"
              ? error.response.data.message
              : "Pertanyaan ini gagal dihitung."}
          </p>
        )}

        {result && result.rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada data untuk pertanyaan ini.
          </p>
        )}

        {result && result.rows.length > 0 && (
          <ExplorerResultView
            result={result}
            rowDims={question.query.rowDims}
            colDim={question.query.colDim}
            filters={question.query.filters}
            display={question.query}
            chartMeasure={chartMeasure}
            onChartMeasureChange={setChartMeasure}
            compact
          />
        )}
      </CardContent>
    </Card>
  );
};

const IconButton = ({
  label,
  children,
  className = "",
  ...props
}: ComponentProps<typeof Button> & { label: string }) => (
  <Button
    variant="ghost"
    size="icon"
    className={`h-8 w-8 ${className}`}
    title={label}
    aria-label={label}
    {...props}
  >
    {children}
  </Button>
);

export default InsightBoardPage;
