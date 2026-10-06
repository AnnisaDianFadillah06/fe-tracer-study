import { describe, expect, it } from "vitest";
import {
  getDefaultRoute,
  getMenuForRole,
  hasAnyPermission,
  hasPermission,
  mapBackendRole,
  routePermissionMap,
} from "./rbac";

describe("hasPermission", () => {
  it("mengizinkan role yang memang punya permission tersebut", () => {
    expect(hasPermission("head_tracer", "admin.user")).toBe(true);
  });

  it("menolak role yang tidak punya permission tersebut (kaprodi tidak boleh admin.user)", () => {
    expect(hasPermission("kaprodi", "admin.user")).toBe(false);
  });

  it("alumni hanya punya permission questionnaire.fill", () => {
    expect(hasPermission("alumni", "questionnaire.fill")).toBe(true);
    expect(hasPermission("alumni", "dashboard.overview")).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("true kalau salah satu permission dimiliki", () => {
    expect(hasAnyPermission("kaprodi", ["admin.user", "dashboard.overview"])).toBe(true);
  });

  it("false kalau tidak satu pun permission dimiliki", () => {
    expect(hasAnyPermission("alumni", ["admin.user", "dashboard.overview"])).toBe(false);
  });
});

describe("getMenuForRole", () => {
  it("kaprodi tidak melihat menu admin.user (Kelola Staff/Mahasiswa)", () => {
    const groups = getMenuForRole("kaprodi");
    const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(allHrefs).not.toContain("/dashboard/staff-management");
  });

  it("group yang seluruh item-nya tersaring habis tidak ikut muncul (mis. Konfigurasi untuk kaprodi)", () => {
    const groups = getMenuForRole("kaprodi");
    const labels = groups.map((g) => g.label);
    expect(labels).not.toContain("Konfigurasi");
  });

  it("overrideByRole mengganti title/description sesuai role (Approval Request untuk kaprodi)", () => {
    const groups = getMenuForRole("kaprodi");
    const approval = groups
      .flatMap((g) => g.items)
      .find((i) => i.href === "/dashboard/approvals");

    expect(approval?.title).toBe("Riwayat Pengajuan");
  });

  it("head_tracer tidak override title, tetap 'Approval Request'", () => {
    const groups = getMenuForRole("head_tracer");
    const approval = groups
      .flatMap((g) => g.items)
      .find((i) => i.href === "/dashboard/approvals");

    expect(approval?.title).toBe("Approval Request");
  });
});

describe("getDefaultRoute", () => {
  it("alumni diarahkan ke /form, bukan dashboard", () => {
    expect(getDefaultRoute("alumni")).toBe("/form");
  });

  it("role staf lain diarahkan ke /dashboard/overview", () => {
    expect(getDefaultRoute("kaprodi")).toBe("/dashboard/overview");
    expect(getDefaultRoute("head_tracer")).toBe("/dashboard/overview");
  });
});

describe("mapBackendRole", () => {
  it("memetakan role backend modern apa adanya", () => {
    expect(mapBackendRole("kaprodi")).toBe("kaprodi");
    expect(mapBackendRole("dekan")).toBe("dekan");
  });

  it("memetakan alias role legacy ke role modern (admin -> head_tracer, ketua_fakultas -> dekan)", () => {
    expect(mapBackendRole("admin")).toBe("head_tracer");
    expect(mapBackendRole("p2mpp")).toBe("wadir");
    expect(mapBackendRole("prodi")).toBe("kaprodi");
    expect(mapBackendRole("ketua_fakultas")).toBe("dekan");
  });

  it("role tidak dikenal atau kosong fallback ke alumni (bukan crash)", () => {
    expect(mapBackendRole("role_asing")).toBe("alumni");
    expect(mapBackendRole(undefined)).toBe("alumni");
  });
});

describe("routePermissionMap konsisten dengan getMenuForRole", () => {
  it("setiap href di menu kaprodi punya entry permission yang sama di routePermissionMap", () => {
    const groups = getMenuForRole("kaprodi");
    for (const item of groups.flatMap((g) => g.items)) {
      if (routePermissionMap[item.href]) {
        expect(routePermissionMap[item.href]).toBe(item.permission);
      }
    }
  });
});

describe("menu Dashboard", () => {
  it("Multidimensi Insight membuka Insight, Dashboard Saya tidak ada di sidebar", () => {
    const items = getMenuForRole("head_tracer").flatMap((g) => g.items);
    const multi = items.filter((i) => i.title === "Multidimensi Insight");
    expect(multi).toHaveLength(1);
    expect(multi[0].href).toBe("/dashboard/insight");
    expect(items.some((i) => i.title === "Dashboard Saya")).toBe(false);
  });
});
