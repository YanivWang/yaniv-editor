// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import { YE_Z_INDEX_DEFAULT_BASE, YE_Z_BASE_OFFSETS, getYeZIndex } from "@/utils/zIndex";

function createEditorRoot(tokens: Record<string, string> = {}): HTMLElement {
  const root = document.createElement("div");
  root.className = "yaniv-editor";
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
  document.body.append(root);
  return root;
}

describe("getYeZIndex", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("reads z-index tokens from editor root", () => {
    const root = createEditorRoot({
      "--ye-z-base": "1200",
      "--ye-z-bubble-menu": "1210",
    });

    expect(getYeZIndex("--ye-z-bubble-menu", root)).toBe(1210);
  });

  it("reads zIndexBase override from editor root", () => {
    const root = createEditorRoot({
      "--ye-z-base": "1500",
      "--ye-z-picker-menu": "1530",
    });

    expect(getYeZIndex("--ye-z-picker-menu", root)).toBe(1530);
  });

  it("resolves calc() z-index tokens from editor root", () => {
    const root = createEditorRoot({
      "--ye-z-base": "1000",
      "--ye-z-bubble-menu": "calc(var(--ye-z-base) + 10)",
    });

    expect(getYeZIndex("--ye-z-bubble-menu", root)).toBe(1010);
  });

  it("throws when token is missing on editor root", () => {
    const root = createEditorRoot();

    expect(() => getYeZIndex("--ye-z-modal", root)).toThrow(/Missing or invalid z-index token/);
  });

  it("exports default base constant", () => {
    expect(YE_Z_INDEX_DEFAULT_BASE).toBe(1000);
  });

  it("exports base offsets aligned with variables.css calc offsets", () => {
    expect(YE_Z_BASE_OFFSETS).toEqual({
      "--ye-z-overlay-backdrop": 0,
      "--ye-z-bubble-menu": 10,
      "--ye-z-floating-menu": 20,
      "--ye-z-picker-menu": 30,
      "--ye-z-drag-menu": 40,
      "--ye-z-drag-submenu": 41,
      "--ye-z-dropdown": 50,
      "--ye-z-tooltip": 60,
      "--ye-z-toast": 80,
      "--ye-z-modal": 100,
    });
  });
});
