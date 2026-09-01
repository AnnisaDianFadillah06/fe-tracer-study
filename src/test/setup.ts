import "@testing-library/jest-dom/vitest";

// jsdom belum mengimplementasikan ResizeObserver -- dibutuhkan Recharts
// (ResponsiveContainer) untuk mengukur dimensi kontainer di browser asli.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error -- polyfill minimal, bukan implementasi lengkap ResizeObserver
globalThis.ResizeObserver = ResizeObserverStub;
