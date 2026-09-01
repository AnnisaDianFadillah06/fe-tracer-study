import { describe, expect, it } from "vitest";
import { generateClusteringData, MOCK_STUDENTS } from "./mockData";

describe("generateClusteringData", () => {
  it("MOCK_STUDENTS sengaja kosong (belum ada dummy generator)", () => {
    expect(MOCK_STUDENTS).toHaveLength(0);
  });

  it("mengembalikan jumlahAlumni 0 per prodi karena tidak ada mock student", () => {
    const rows = generateClusteringData("wait-time", ["Teknik Informatika"]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      prodi: "Teknik Informatika",
      jumlahAlumni: 0,
      waktuTungguRata: "0.0",
    });
  });

  it("tidak melempar error walau data alumni kosong (domain career-profile)", () => {
    expect(() => generateClusteringData("career-profile", ["Teknik Informatika"])).not.toThrow();
  });

  it("mengambil daftar prodi unik dari PRODI_LIST saat tidak ada filter", () => {
    const rows = generateClusteringData("wait-time");
    expect(rows.length).toBeGreaterThan(0);
    const names = rows.map((r) => r.prodi);
    expect(new Set(names).size).toBe(names.length);
  });
});
