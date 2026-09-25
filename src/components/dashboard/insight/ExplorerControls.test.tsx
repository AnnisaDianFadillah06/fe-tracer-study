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

const renderControls = (open: boolean, onOpenChange = vi.fn()) =>
  render(
    <TooltipProvider>
      <ExplorerControls
        catalog={catalog}
        cube={catalog.cubes[0]}
        input={input}
        onChange={vi.fn()}
        open={open}
        onOpenChange={onOpenChange}
        summary="Jumlah alumni menurut Jurusan"
      />
    </TooltipProvider>,
  );

describe("ExplorerControls", () => {
  it("terbuka: menampilkan tiga langkah bernomor dan pengaturan tampilan terlipat", () => {
    renderControls(true);

    expect(screen.getByText(/1\. Apa yang ingin dihitung/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Dibagi menurut apa/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Batasi ke/)).toBeInTheDocument();
    expect(screen.getByText("Pengaturan tampilan", { exact: false })).toBeInTheDocument();
    // Terlipat bawaan: isinya belum dirender.
    expect(screen.queryByText("Tampilkan jumlah sebagai")).not.toBeInTheDocument();
  });

  it("satu sumber data: pemilih sumber data tidak ditampilkan", () => {
    renderControls(true);

    expect(screen.queryByText("Data yang dianalisis")).not.toBeInTheDocument();
  });

  it("pengaturan tampilan terbuka saat pemicunya diklik", () => {
    renderControls(true);

    fireEvent.click(screen.getByText("Pengaturan tampilan", { exact: false }));

    expect(screen.getByText("Tampilkan jumlah sebagai")).toBeInTheDocument();
  });

  it("diringkas: hanya kalimat ringkasan dan tombol Ubah susunan", () => {
    const onOpenChange = vi.fn();
    renderControls(false, onOpenChange);

    expect(screen.getByText("Jumlah alumni menurut Jurusan")).toBeInTheDocument();
    expect(screen.queryByText(/1\. Apa yang ingin dihitung/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ubah susunan/ }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});
