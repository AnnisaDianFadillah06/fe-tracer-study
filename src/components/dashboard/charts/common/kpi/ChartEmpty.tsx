import { Inbox } from "lucide-react";

interface Props {
  message?: string;
  hint?: string;
  height?: number;
}

/** Empty-state placeholder used inside KpiCard body. */
const ChartEmpty = ({
  message = "Belum ada data untuk filter ini",
  hint = "Coba ubah filter atau pilih periode lain.",
  height = 288,
}: Props) => (
  <div
    className="flex flex-col items-center justify-center text-center gap-2 px-4 border border-dashed border-border rounded-lg bg-muted/20"
    style={{ height }}
  >
    <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
      <Inbox className="w-6 h-6 text-muted-foreground" />
    </div>
    <p className="text-sm font-medium text-foreground">{message}</p>
    <p className="text-xs text-muted-foreground max-w-xs">{hint}</p>
  </div>
);

export default ChartEmpty;