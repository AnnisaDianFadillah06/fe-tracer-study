import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import ExplorerControls from "./ExplorerControls";
import type { ExplorerCatalog, ExplorerQueryInput } from "@/lib/olapExplorer";

vi.mock("@/hooks/useExplorer", () => ({
  useDimensionValues: () => ({ data: [] }),
}));

const catalog: ExplorerCatalog = {
  limits: { max_dimensions: 3, max_measures: 4, max_rows: 500 },
  cubes: [
    {
      key: "Fact",
      label: "Alumni",
      description: "Satu baris per alumni.",
      measures: [{ key: "Fact.count", label: "Jumlah alumni", format: "integer" }],
      count_measure: "Fact.count",
      dimension_groups: [
        { group: "Program studi", members: [{ key: "Prodi.jurusan", label: "Jurusan" }] },
      ],
    },
  ],
};

const input: ExplorerQueryInput = {
  cube: "Fact",
  measures: [],
  rowDims: [],
  colDim: null,
  filters: [],
};

const renderControls = (
  props: Partial<{
    summary: string;
    fetching: boolean;
    onChange: (next: ExplorerQueryInput) => void;
    onReset: () => void;
  }> = {},
) =>
  render(
    <TooltipProvider>
      <ExplorerControls
        catalog={catalog}
        cube={catalog.cubes[0]}
        input={input}
        onChange={props.onChange ?? vi.fn()}
        onReset={props.onReset ?? vi.fn()}
        summary={props.summary ?? ""}
        fetching={props.fetching ?? false}
      />
    </TooltipProvider>,
  );

describe("ExplorerControls (pita filter)", () => {
  it("menampilkan kontrol berlabel: dihitung, per, dibandingkan, batasi, tampilan", () => {
    renderControls();

    for (const label of ["Dihitung", "Per", "Dibandingkan antar", "Batasi", "Tampilan"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("satu sumber data: pemilih sumber data tidak ditampilkan", () => {
    renderControls();

    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });

  it("belum ada pilihan: strip status mengajak memulai", () => {
    renderControls();

    expect(screen.getByText(/Pilih apa yang ingin dihitung untuk memulai/)).toBeInTheDocument();
  });

  it("strip status menampilkan kalimat pertanyaan dan status menghitung", () => {
    renderControls({ summary: "Jumlah alumni menurut Jurusan", fetching: true });

    expect(screen.getByText("Jumlah alumni menurut Jurusan")).toBeInTheDocument();
    expect(screen.getByText(/Menghitung/)).toBeInTheDocument();
  });

  it("memilih ukuran dari popover Dihitung mengirim perubahan", () => {
    const onChange = vi.fn();
    renderControls({ onChange });

    fireEvent.click(screen.getByRole("button", { name: /Pilih ukuran/ }));
    fireEvent.click(screen.getByText("Jumlah alumni"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ measures: ["Fact.count"] }),
    );
  });

  it("tombol Reset memanggil onReset", () => {
    const onReset = vi.fn();
    renderControls({ onReset });

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
