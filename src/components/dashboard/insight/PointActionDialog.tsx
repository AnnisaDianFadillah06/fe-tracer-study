import { ArrowDownToLine, ArrowUpToLine, Filter, Grid2x2, ListPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DrillTarget } from "@/lib/olapExplorer";

interface Props {
  /** null = tertutup. */
  pending: object | null;
  /** "Jurusan Akuntansi · Tahun lulus 2022" */
  pointLabel: string;
  /** Dimensi-dimensi titik ini; satu tombol slice per dimensi. */
  pointDims: { key: string; label: string; value: string }[];
  onClose: () => void;
  /** Slice: kunci satu dimensi ke nilai titik ini. */
  onSlice: (dim: string) => void;
  /** Dice: kunci SEMUA dimensi titik ini sekaligus. */
  onDiceAll: () => void;
  /** Drill-down menurut hierarki; kosong = tombolnya tidak ada. */
  drillTargets: (DrillTarget & { label: string })[];
  onDrillDown: (target: DrillTarget) => void;
  onAlumni: () => void;
  /** Jumlah titik yang sudah dikumpulkan; titik ini ditambahkan ke sana. */
  picked: number;
  /** Slice bila pilihan hanya mencakup satu dimensi, Dice bila dua atau lebih. */
  pickedOperation: "Slice" | "Dice";
  onAddPicked: () => void;
  /** Saring ke titik terkumpul (termasuk titik ini bila belum ditambahkan). */
  onDice: () => void;
  /** Label roll-up ("Roll-up ke Jurusan"); null = tidak ada yang bisa di-roll-up. */
  rollUpLabel: string | null;
  onRollUp: () => void;
}

// Label tombol memuat nilai kelompok ("… D3 Teknik Pendingin & Tata Udara"),
// jadi harus boleh turun baris — Button bawaan memakai whitespace-nowrap.
const WRAP = "h-auto min-h-10 w-full justify-start whitespace-normal py-2 text-left";

/**
 * Pilihan setelah mengklik batang/angka: mengunci satu dimensi (slice),
 * mengunci beberapa dimensi (dice), turun satu level hierarki (drill-down),
 * naik satu level (roll-up), atau melihat daftar alumninya (drill-through).
 */
const PointActionDialog = ({
  pending,
  pointLabel,
  pointDims,
  onClose,
  onSlice,
  onDiceAll,
  drillTargets,
  onDrillDown,
  onAlumni,
  picked,
  pickedOperation,
  onAddPicked,
  onDice,
  rollUpLabel,
  onRollUp,
}: Props) => (
  <Dialog open={pending !== null} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="pr-6 leading-snug">{pointLabel}</DialogTitle>
        <DialogDescription>Mau diapakan kelompok ini?</DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        {pointDims.map((d) => (
          <Button
            key={d.key}
            className={WRAP}
            variant="outline"
            onClick={() => onSlice(d.key)}
            title={`Hanya hitung ${d.label} ${d.value}; ${d.label} tidak lagi ditampilkan per kelompok`}
          >
            <Filter className="mr-2 h-4 w-4" />
            Slice: hanya {d.label} {d.value}
          </Button>
        ))}

        {pointDims.length >= 2 && (
          <Button className={WRAP} variant="outline" onClick={onDiceAll}>
            <Grid2x2 className="mr-2 h-4 w-4" />
            Dice: kunci {pointDims.map((d) => d.label).join(" & ")}
          </Button>
        )}

        {drillTargets.map((t) => (
          <Button
            key={`${t.from}>${t.to}`}
            className={WRAP}
            variant="outline"
            onClick={() => onDrillDown({ from: t.from, to: t.to })}
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Drill-down: {t.label}
          </Button>
        ))}

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button className="h-auto min-h-10 flex-1 justify-start whitespace-normal py-2 text-left" variant="outline" onClick={onAddPicked}>
              <ListPlus className="mr-2 h-4 w-4" />
              Tambah ke pilihan
              {picked > 0 && <span className="ml-auto text-xs text-muted-foreground">{picked} terpilih</span>}
            </Button>
            {picked > 0 && (
              <Button onClick={onDice} title="Saring ke semua titik yang dipilih">
                {pickedOperation}
              </Button>
            )}
          </div>
          {picked > 0 && (
            <p className="text-xs text-muted-foreground">
              {pickedOperation === "Dice"
                ? "Dice: hasil memuat semua kombinasi nilai yang dipilih."
                : "Slice: hanya kelompok yang dipilih yang ditampilkan."}
            </p>
          )}
        </div>

        {rollUpLabel && (
          <Button className={WRAP} variant="outline" onClick={onRollUp}>
            <ArrowUpToLine className="mr-2 h-4 w-4" />
            {rollUpLabel}
          </Button>
        )}

        <Button className={WRAP} variant="outline" onClick={onAlumni}>
          <Users className="mr-2 h-4 w-4" />
          Lihat daftar alumni (drill-through)
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default PointActionDialog;
