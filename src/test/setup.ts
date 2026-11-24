// Canvas 2D context and Path2D for jsdom, so tests can create real uPlot charts.
import "vitest-canvas-mock";

// jsdom has no matchMedia, and uPlot calls it at import time.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
