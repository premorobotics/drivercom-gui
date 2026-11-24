import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";
import { createCursorMode, CursorMode } from "./CreateCursorMode";

const press = (type: "keydown" | "keyup", key: string) =>
  document.dispatchEvent(new KeyboardEvent(type, { key }));

describe("createCursorMode", () => {
  it("switched temporarily while a shorcut key is held", () => {
    createRoot((dispose) => {
      const cursorMode = createCursorMode();
      press("keydown", "Shift");
      expect(cursorMode.mode()).toBe(CursorMode.Horizontal);
      press("keyup", "Shift");
      expect(cursorMode.mode()).toBe(CursorMode.Pan);
      dispose();
    });
  });

  it("ignores blocked shortcurts", () => {
    createRoot((dispose) => {
      const cursorMode = createCursorMode({
        isShortcutBlocked: (key) => key === "Alt",
      });
      press("keydown", "Alt");
      expect(cursorMode.mode()).toBe(CursorMode.Pan);
      dispose();
    });
  });

  it("remove listeners on dispose", () => {
    const cursor = createRoot((dispose) => {
      const c = createCursorMode();
      dispose();
      return c;
    });
    press("keydown", "Shift");
    expect(cursor.mode()).toBe(CursorMode.Pan);
  });
});
