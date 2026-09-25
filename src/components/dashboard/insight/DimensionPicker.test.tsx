import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DimensionPicker, { type DimensionGroup } from "./DimensionPicker";

const groups: DimensionGroup[] = [
  {
    group: "Perusahaan",
    members: [
      { key: "P.jenis", label: "Jenis instansi" },
      { key: "P.provinsi", label: "Provinsi tempat kerja" },
    ],
  },
  {
    group: "Program Studi",
    members: [
      { key: "S.jenjang", label: "Jenjang" },
      { key: "S.jurusan", label: "Jurusan" },
    ],
  },
];

const open = () => fireEvent.click(screen.getByRole("button"));

describe("DimensionPicker", () => {
  it("dua langkah: pilih tabel dimensi dulu, lalu sisinya", () => {
    const onChange = vi.fn();
    render(<DimensionPicker value={null} groups={groups} onChange={onChange} />);
    open();

    // Tabel pertama aktif bawaan: sisinya langsung terlihat.
    expect(screen.getByText("Jenis instansi")).toBeInTheDocument();
    expect(screen.queryByText("Jurusan")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Program Studi" }));
    fireEvent.click(screen.getByText("Jurusan"));

    expect(onChange).toHaveBeenCalledWith("S.jurusan");
  });

  it("membuka di tabel milik pilihan saat ini dan menandai pilihannya", () => {
    render(<DimensionPicker value="S.jenjang" groups={groups} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Jenjang/ })).toBeInTheDocument();
    open();
    expect(screen.getByText("Jurusan")).toBeInTheDocument();
  });

  it("pencarian melintasi semua tabel dan menyebut tabelnya", () => {
    const onChange = vi.fn();
    render(<DimensionPicker value={null} groups={groups} onChange={onChange} />);
    open();

    fireEvent.change(screen.getByLabelText("Cari dimensi"), { target: { value: "juru" } });

    expect(screen.getByText("Jurusan")).toBeInTheDocument();
    expect(screen.getByText("Program Studi")).toBeInTheDocument();
    expect(screen.queryByText("Jenis instansi")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Jurusan"));
    expect(onChange).toHaveBeenCalledWith("S.jurusan");
  });

  it("pencarian tanpa hasil memberi tahu pengguna", () => {
    render(<DimensionPicker value={null} groups={groups} onChange={vi.fn()} />);
    open();

    fireEvent.change(screen.getByLabelText("Cari dimensi"), { target: { value: "zzz" } });

    expect(screen.getByText(/Tidak ada dimensi bernama itu/)).toBeInTheDocument();
  });

  it("Kosongkan mengirim null, dan tidak ada tombolnya bila allowClear mati", () => {
    const onChange = vi.fn();
    const { unmount } = render(
      <DimensionPicker value="P.jenis" groups={groups} onChange={onChange} />,
    );
    open();
    fireEvent.click(screen.getByRole("button", { name: /Kosongkan/ }));
    expect(onChange).toHaveBeenCalledWith(null);
    unmount();

    render(<DimensionPicker value="P.jenis" groups={groups} onChange={onChange} allowClear={false} />);
    open();
    expect(screen.queryByRole("button", { name: /Kosongkan/ })).not.toBeInTheDocument();
  });
});
