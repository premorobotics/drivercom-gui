import { Accessor, createSignal, onCleanup, Setter } from "solid-js";

export enum CursorMode {
  None,
  Pan,
  Horizontal,
  Lock,
  Vertical,
}

const SHORTCUTS: Record<string, CursorMode> = {
  Control: CursorMode.Vertical,
  Shift: CursorMode.Horizontal,
  Alt: CursorMode.Lock,
};

export function createCursorMode(
  opts: { isShortcutBlocked?: (key: string) => boolean } = {},
): {
  mode: Accessor<CursorMode>;
  baseMode: Accessor<CursorMode>;
  setMode: Setter<CursorMode>;
  select: (cursorMode: CursorMode) => void;
  reset: () => void;
} {
  const [mode, setMode] = createSignal(CursorMode.Pan);
  const [baseMode, setBaseMode] = createSignal(CursorMode.Pan);

  const onKeyDown = (e: KeyboardEvent) => {
    const next = SHORTCUTS[e.key];
    if (next === undefined || opts.isShortcutBlocked?.(e.key)) return;
    setMode(next);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (SHORTCUTS[e.key] === mode()) setMode(baseMode());
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);

  onCleanup(() => {
    document.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("keyup", onKeyUp);
  });

  return {
    mode,
    baseMode,
    setMode,
    select: (cursorMode: CursorMode) => {
      // If Toggle group is none selected, Should change cusormode as none and set the mode again.
      setMode(cursorMode);
      if (cursorMode === CursorMode.None) {
        setMode(baseMode());
      } else {
        setBaseMode(cursorMode);
      }
    },
    reset: () => setMode(baseMode()),
  };
}
