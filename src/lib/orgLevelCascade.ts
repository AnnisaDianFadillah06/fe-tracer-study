/**
 * orgLevelCascade.ts
 *
 * Fase 5 (DFR-20/DFR-21) — mesin cascading generik untuk filter/breadcrumb
 * struktur organisasi berkedalaman-N (bukan hardcode 3 dropdown Jenjang→
 * Jurusan→Prodi). Modul ini murni fungsi (tanpa state React, tanpa fetch)
 * supaya bisa diuji dengan data sintetis 2-level maupun 5-level tanpa
 * bergantung pada backend atau institusi nyata mana pun.
 *
 * Operasi terhadap `OrgUnitNode[]` yang bentuknya SAMA dengan respons
 * `GET /api/org-units/tree` (lihat StrukturInstitusiPage.tsx) supaya tidak
 * ada struktur data baru yang harus dijaga paralel dengan yang sudah ada.
 */

export interface OrgUnitNode {
  id: number;
  name: string;
  level_index: number | null;
  parent_id: number | null;
  children?: OrgUnitNode[];
  [key: string]: unknown;
}

/** Ratakan pohon jadi array datar (pre-order), dipakai untuk lookup cepat. */
export function flattenOrgTree(nodes: OrgUnitNode[]): OrgUnitNode[] {
  const out: OrgUnitNode[] = [];
  const walk = (list: OrgUnitNode[]) => {
    for (const n of list) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return out;
}

/**
 * Unit yang tersedia untuk `levelIndex`, dipersempit oleh leluhur terdalam
 * yang sudah dipilih di `selectedIds` (index 0 = level_index 1, dst;
 * `null` = "Semua" / belum dipilih di level itu).
 *
 * Generik untuk kedalaman berapa pun -- tidak ada asumsi "level ke-2 selalu
 * jurusan" dsb. Hanya bergantung pada relasi parent_id/level_index pada
 * node, sama seperti yang sudah dipakai `flattenTree` di StrukturInstitusiPage.
 */
export function optionsForLevel(
  flatNodes: OrgUnitNode[],
  levelIndex: number,
  selectedIds: (number | null)[]
): OrgUnitNode[] {
  const byId = new Map(flatNodes.map((n) => [n.id, n]));

  // Leluhur terdekat yang sudah dipilih (level manapun di atas levelIndex).
  let requiredAncestorId: number | null = null;
  for (let i = levelIndex - 2; i >= 0; i--) {
    if (selectedIds[i] != null) {
      requiredAncestorId = selectedIds[i];
      break;
    }
  }

  return flatNodes.filter((n) => {
    if (n.level_index !== levelIndex) return false;
    if (requiredAncestorId == null) return true;
    let cur: OrgUnitNode | undefined = n;
    while (cur?.parent_id != null) {
      if (cur.parent_id === requiredAncestorId) return true;
      cur = byId.get(cur.parent_id);
    }
    return false;
  });
}

/**
 * Reset semua level SETELAH `changedIndex` ke `resetValue` -- dipakai saat
 * user mengganti pilihan di suatu level, supaya level anak yang sudah tidak
 * valid tidak tertinggal (pola yang sama seperti `handleDegree`/`handleJurusan`
 * di GlobalFilters.tsx, tapi generik untuk N elemen, bukan hardcode 2-3).
 */
export function resetDescendantSelections<T>(path: T[], changedIndex: number, resetValue: T): T[] {
  return path.map((v, i) => (i <= changedIndex ? v : resetValue));
}

/** Label breadcrumb dari path id terpilih, untuk DFR-21 (hop dinamis). */
export function breadcrumbLabels(flatNodes: OrgUnitNode[], selectedIds: (number | null)[]): string[] {
  const byId = new Map(flatNodes.map((n) => [n.id, n]));
  const labels: string[] = [];
  for (const id of selectedIds) {
    if (id == null) break; // hop berikutnya belum dipilih -> breadcrumb berhenti di sini
    const n = byId.get(id);
    if (!n) break;
    labels.push(n.name);
  }
  return labels;
}
