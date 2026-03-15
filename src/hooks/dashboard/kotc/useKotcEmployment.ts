import { useState } from "react";

export function useKotcEmployment() {
  const [selectedProdi, setSelectedProdi] = useState("all");
  const [selectedTahun, setSelectedTahun] = useState("all");
  const [selectedJenjang, setSelectedJenjang] = useState("all");

  const filters = { prodi: selectedProdi, jenjang: selectedJenjang, tahun: selectedTahun };

  return { selectedProdi, setSelectedProdi, selectedTahun, setSelectedTahun, selectedJenjang, setSelectedJenjang, filters };
}
