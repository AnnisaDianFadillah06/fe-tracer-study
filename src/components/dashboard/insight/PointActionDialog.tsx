import { useState } from "react";
import { ArrowUpToLine, Filter, ListPlus, ListTree, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  /** null = tertutup. */
  pending: object | null;
  /** "Jurusan Akuntansi · Tahun lulus 2022" */
  pointLabel: string;
  /** Dimensi yang masih boleh ditambahkan; kosong = "Rinci per" disembunyikan. */
  dimensions: { key: string; label: string }[];
  onClose: () => void;
  /** Menyaring ke titik ini; dim terisi = sekaligus merinci per dimensi itu. */
  onSlice: (dim?: string) => void;
  onAlumni: () => void;
  /** Dice: jumlah titik yang sudah dikumpulkan, titik ini ditambahkan ke sana. */
  picked: number;
  onAddPicked: () => void;
  /** Dice ke titik terkumpul (termasuk titik ini bila belum ditambahkan). */
  onDice: () => void;
  /** Roll-up; tombolnya hanya ada bila ada yang bisa dilepas. */
  canRollUp: boolean;
  onRollUp: () => void;
}

/**
 * Pilihan setelah mengklik batang/angka: menyaring ke kelompok itu (slice),
 * mengumpulkan beberapa kelompok lalu menyaring ke semuanya (dice), merinci
 * per dimensi lain (drill-down), naik satu tingkat (roll-up), atau melihat
 * daftar alumninya (drill-through).
 */
const PointActionDialog = ({
  pending,
  pointLabel,
  dimensions,
  onClose,
  onSlice,
  onAlumni,
  picked,
  onAddPicked,
  onDice,
  canRollUp,
  onRollUp,
}: Props) => {
  const [dim, setDim] = useState<string>("");

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{pointLabel}</DialogTitle>
          <DialogDescription>Mau diapakan kelompok ini?</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Button className="w-full justify-start" variant="outline" onClick={() => onSlice()}>
            <Filter className="mr-2 h-4 w-4" />
            Filter ke ini
          </Button>

          {dimensions.length > 0 && (
            <div className="flex items-center gap-2">
              <ListTree className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select value={dim} onValueChange={setDim}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Rinci per…" />
                </SelectTrigger>
                <SelectContent>
                  {dimensions.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button disabled={dim === ""} onClick={() => dim && onSlice(dim)}>
                Rinci
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button className="flex-1 justify-start" variant="outline" onClick={onAddPicked}>
              <ListPlus className="mr-2 h-4 w-4" />
              Tambah ke pilihan (Dice)
              {picked > 0 && <span className="ml-auto text-xs text-muted-foreground">{picked} terpilih</span>}
            </Button>
            {picked > 0 && (
              <Button onClick={onDice} title="Saring ke semua titik yang dipilih">
                Dice
              </Button>
            )}
          </div>

          {canRollUp && (
            <Button className="w-full justify-start" variant="outline" onClick={onRollUp}>
              <ArrowUpToLine className="mr-2 h-4 w-4" />
              Naik satu tingkat (Roll-up)
            </Button>
          )}

          <Button className="w-full justify-start" variant="outline" onClick={onAlumni}>
            <Users className="mr-2 h-4 w-4" />
            Lihat daftar alumni
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PointActionDialog;
