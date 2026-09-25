import {
  AreaChart,
  BarChart3,
  Layers,
  LineChart,
  PieChart,
  Sparkles,
  Table2,
  AlignLeft,
  type LucideIcon,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VIZ_LABELS, type Viz } from "@/lib/olapExplorer";

const ICONS: Record<Viz, LucideIcon> = {
  auto: Sparkles,
  bar: BarChart3,
  row: AlignLeft,
  line: LineChart,
  area: AreaChart,
  stacked: Layers,
  pie: PieChart,
  table: Table2,
};

interface Props {
  value: Viz;
  options: Viz[];
  onChange: (viz: Viz) => void;
}

/**
 * Pemilih visualisasi ala Metabase: deretan ikon, satu aktif. Hanya bentuk
 * yang memang mungkin untuk hasil ini yang ditawarkan (lihat `availableViz`).
 */
const VizPicker = ({ value, options, onChange }: Props) => (
  <ToggleGroup
    type="single"
    value={value}
    // Radix mengirim "" saat item aktif diklik lagi; tetap di pilihan semula.
    onValueChange={(v) => v && onChange(v as Viz)}
    className="gap-0.5 rounded-lg bg-muted/40 p-0.5"
    aria-label="Jenis visualisasi"
  >
    {options.map((viz) => {
      const Icon = ICONS[viz];

      return (
        <Tooltip key={viz}>
          <TooltipTrigger asChild>
            <ToggleGroupItem
              value={viz}
              aria-label={VIZ_LABELS[viz]}
              className="h-8 w-8 rounded-md p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Icon className="h-4 w-4" />
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent className="text-xs">{VIZ_LABELS[viz]}</TooltipContent>
        </Tooltip>
      );
    })}
  </ToggleGroup>
);

export default VizPicker;
