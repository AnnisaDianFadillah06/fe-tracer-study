import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal,
} from "lucide-react";

/**
 * Paginasi di bawah tabel.
 *
 * Sebelumnya blok ini disalin apa adanya di Kelola Kuisioner dan Data
 * Mahasiswa: tanpa padding horizontal (teks menempel ke tepi kartu karena
 * CardContent-nya p-0), selalu memaksa lima tombol angka berurutan sehingga
 * halaman 1 dan halaman terakhir tidak bisa dijangkau sekali klik saat
 * jumlah halaman banyak, dan tidak turun baris di layar sempit.
 */

const ELLIPSIS = "ellipsis" as const;
type PageItem = number | typeof ELLIPSIS;

interface TablePaginationProps {
  page: number;
  totalPages: number;
  /** Jumlah seluruh baris (lintas halaman), untuk teks ringkasan. */
  total: number;
  /** Baris per halaman. Kalau diisi, ringkasan menyebut rentang barisnya. */
  perPage?: number;
  /** Kata benda untuk ringkasan, mis. "kuesioner" atau "mahasiswa". */
  itemLabel?: string;
  onPageChange: (page: number) => void;
  className?: string;
}

const range = (from: number, to: number): number[] =>
  Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);

/**
 * Deret tombol halaman: halaman pertama dan terakhir SELALU ikut, sekitar
 * halaman aktif ikut, sisanya diringkas jadi elipsis. Jadi lompat ke ujung
 * tetap satu klik berapa pun jumlah halamannya.
 *
 * Saat halaman aktif berada di dekat ujung, jendelanya digeser (bukan
 * dipotong) supaya jumlah tombol tetap sama di semua halaman -- kalau
 * memendek, tombol berikutnya/terakhir ikut bergeser posisinya tiap klik.
 */
function buildPageItems(page: number, totalPages: number, siblings = 1): PageItem[] {
  // Pertama + terakhir + aktif + dua tetangga + dua slot elipsis.
  const maxButtons = siblings * 2 + 5;

  if (totalPages <= maxButtons) {
    return range(1, totalPages);
  }

  const leftSibling = Math.max(page - siblings, 1);
  const rightSibling = Math.min(page + siblings, totalPages);

  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  // Panjang blok angka di ujung, dipilih supaya total tombolnya sama dengan
  // kasus jendela di tengah (1 + elipsis + 3 + elipsis + 1).
  const edgeCount = siblings * 2 + 3;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, edgeCount), ELLIPSIS, totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, ELLIPSIS, ...range(totalPages - edgeCount + 1, totalPages)];
  }

  return [1, ELLIPSIS, ...range(leftSibling, rightSibling), ELLIPSIS, totalPages];
}

const TablePagination = ({
  page,
  totalPages,
  total,
  perPage,
  itemLabel = "data",
  onPageChange,
  className,
}: TablePaginationProps) => {
  const items = useMemo(() => buildPageItems(page, totalPages), [page, totalPages]);

  if (totalPages <= 1) return null;

  const goTo = (target: number) => {
    const clamped = Math.min(Math.max(target, 1), totalPages);
    if (clamped !== page) onPageChange(clamped);
  };

  const summary = perPage
    ? `Menampilkan ${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)} dari ${total} ${itemLabel}`
    : `Halaman ${page} dari ${totalPages} (${total} ${itemLabel})`;

  return (
    <div
      className={cn(
        "flex flex-col-reverse items-center gap-3 border-t border-border/60 px-4 py-3",
        "sm:flex-row sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground tabular-nums">{summary}</p>

      <nav aria-label="Navigasi halaman" className="flex flex-wrap items-center justify-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={page <= 1}
          aria-label="Halaman pertama"
          onClick={() => goTo(1)}
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={page <= 1}
          aria-label="Halaman sebelumnya"
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Button>

        {items.map((item, index) =>
          item === ELLIPSIS ? (
            <span
              // Elipsis tidak punya identitas selain posisinya, dan posisinya
              // memang yang menentukan tampilannya.
              key={`ellipsis-${index}`}
              aria-hidden
              className="flex h-9 w-9 items-center justify-center text-muted-foreground"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? "default" : "outline"}
              size="icon"
              className="h-9 w-9 tabular-nums"
              aria-label={`Halaman ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => goTo(item)}
            >
              {item}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={page >= totalPages}
          aria-label="Halaman berikutnya"
          onClick={() => goTo(page + 1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          disabled={page >= totalPages}
          aria-label="Halaman terakhir"
          onClick={() => goTo(totalPages)}
        >
          <ChevronsRight className="h-4 w-4" aria-hidden />
        </Button>
      </nav>
    </div>
  );
};

export default TablePagination;
