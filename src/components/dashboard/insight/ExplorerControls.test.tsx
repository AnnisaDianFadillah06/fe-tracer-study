import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
    advanced: boolean;
    onChange: (next: ExplorerQueryInput) => void;
    onReset: () => void;
    catalog: ExplorerCatalog;
    input: ExplorerQueryInput;
  }> = {},
) =>
  render(
    <MemoryRouter>
    <TooltipProvider>
      <ExplorerControls
        catalog={props.catalog ?? catalog}
        cube={(props.catalog ?? catalog).cubes[0]}
        input={props.input ?? input}
        onChange={props.onChange ?? vi.fn()}
        onReset={props.onReset ?? vi.fn()}
        advanced={props.advanced ?? false}
        onAdvancedChange={vi.fn()}
        summary={props.summary ?? ""}
        fetching={props.fetching ?? false}
      />
    </TooltipProvider>
    </MemoryRouter>,
  );

describe("ExplorerControls (pita filter)", () => {
  it("menampilkan kontrol berlabel: dihitung, per, dibandingkan, batasi, tampilan", () => {
    renderControls();

    for (const label of ["Dihitung", "Per", "Dibandingkan antar", "Batasi"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // Aksi tampilan ada di strip ringkasan, bukan sebagai kolom berlabel.
    expect(screen.getByRole("button", { name: /Atur/ })).toHaveAttribute("title", "Atur tampilan");
    expect(screen.queryByRole("button", { name: "Tukar baris dan kolom" })).not.toBeInTheDocument();
  });

  it("mode lanjutan: slot dimensi bernomor, Batasi bertanda Slice/Dice, kolom Putar muncul", () => {
    renderControls({ advanced: true });

    for (const label of ["Per (Dimensi-1)", "Dibandingkan antar (Dimensi-2)", "Batasi (Slice/Dice)"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Tukar baris dan kolom" })).toBeInTheDocument();
  });

  it("Batasi hanya menghitung saringan yang sudah berisi nilai", () => {
    renderControls({
      advanced: true,
      input: {
        ...input,
        filters: [
          { member: "DimProdi.jurusan", values: ["Akuntansi"] },
          { member: "DimAlumni.tahun_lulus", values: [] },
        ],
      },
    });

    expect(screen.getByText("1 batasan")).toBeInTheDocument();
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

  describe("tingkat dimensi baris", () => {
    const dims = ["A", "B", "C", "D", "E"].map((k) => ({ key: `D.${k}`, label: `Dim ${k}` }));
    const katalog = (max: number): ExplorerCatalog => ({
      ...catalog,
      cubes: [{ ...catalog.cubes[0], max_dimensions: max, dimension_groups: [{ group: "G", members: dims }] }],
    });
    const dengan = (rowDims: string[], colDim: string | null = null): ExplorerQueryInput => ({
      ...input,
      measures: ["Fact.count"],
      rowDims,
      colDim,
    });
    const tombol = () => screen.queryByRole("button", { name: "Tingkat" });

    it("mode lanjutan menomori dimensi berurutan, kolom sesudah semua slot baris", () => {
      renderControls({ catalog: katalog(5), input: dengan(["D.A", "D.B", "D.C"], "D.D"), advanced: true });
      for (const label of ["Per (Dimensi-1)", "Lalu per (Dimensi-2)", "Lalu per (Dimensi-3)", "Dibandingkan antar (Dimensi-4)"]) {
        expect(screen.getByText(label)).toBeInTheDocument();
      }
    });

    it("slot kosong ikut bernomor, dan kolom bergeser satu", () => {
      renderControls({ catalog: katalog(5), input: dengan(["D.A"]), advanced: true });
      expect(screen.getByText("Lalu per (Dimensi-2)")).toBeInTheDocument();
      expect(screen.getByText("Dibandingkan antar (Dimensi-3)")).toBeInTheDocument();
    });

    it("tingkat kedua langsung berupa slot; tombol baru muncul setelahnya", () => {
      renderControls({ catalog: katalog(5), input: dengan(["D.A"]) });
      expect(screen.getAllByText("Lalu per")).toHaveLength(1);
      expect(tombol()).not.toBeInTheDocument();
    });

    it("tombol Tingkat membuka slot kosong berikutnya", () => {
      renderControls({ catalog: katalog(5), input: dengan(["D.A", "D.B"]) });
      fireEvent.click(tombol()!);
      expect(screen.getAllByText("Lalu per")).toHaveLength(2);
    });

    it("tombol hilang saat dimensi baris mencapai batas cube", () => {
      renderControls({ catalog: katalog(3), input: dengan(["D.A", "D.B", "D.C"]) });
      expect(tombol()).not.toBeInTheDocument();
    });

    it("dimensi kolom ikut memakai jatah batas", () => {
      renderControls({ catalog: katalog(3), input: dengan(["D.A", "D.B"], "D.C") });
      expect(tombol()).not.toBeInTheDocument();
    });

    it("tanpa batas per cube memakai batas global (peladen lama)", () => {
      const lama = { ...katalog(5), cubes: [{ ...katalog(5).cubes[0], max_dimensions: undefined }] };
      renderControls({ catalog: lama, input: dengan(["D.A", "D.B"]) });
      expect(tombol()).toBeInTheDocument();
      renderControls({ catalog: lama, input: dengan(["D.A", "D.B", "D.C"]) });
      expect(screen.getAllByRole("button", { name: "Tingkat" })).toHaveLength(1);
    });
  });

  it("menyediakan tautan ke Dashboard Saya", () => {
    renderControls();

    expect(screen.getByRole("link", { name: "Dashboard Saya" })).toHaveAttribute(
      "href",
      "/dashboard/insight/board",
    );
  });
});
