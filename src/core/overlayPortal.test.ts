import { describe, expect, it } from "vitest";

import {
  EDITOR_ROOT_CLASS,
  OVERLAY_PORTAL_CLASS,
  resolveEditorRootFromNode,
  resolveOverlayPortal,
  resolveOverlayPortalFromNode,
} from "@/core/overlayPortal";

describe("overlayPortal", () => {
  it("resolves portal from editor root", () => {
    const root = document.createElement("div");
    root.className = EDITOR_ROOT_CLASS;
    const portal = document.createElement("div");
    portal.className = OVERLAY_PORTAL_CLASS;
    root.append(portal);

    expect(resolveOverlayPortal(root)).toBe(portal);
  });

  it("resolves portal from nested node", () => {
    const root = document.createElement("div");
    root.className = EDITOR_ROOT_CLASS;
    const portal = document.createElement("div");
    portal.className = OVERLAY_PORTAL_CLASS;
    const child = document.createElement("span");
    root.append(portal, child);

    expect(resolveOverlayPortalFromNode(child)).toBe(portal);
    expect(resolveEditorRootFromNode(child)).toBe(root);
  });

  it("throws when portal is missing", () => {
    const root = document.createElement("div");
    root.className = EDITOR_ROOT_CLASS;
    expect(() => resolveOverlayPortal(root)).toThrow(/Missing overlay portal/);
  });

  it("throws when editor root ancestor is missing", () => {
    const orphan = document.createElement("div");
    expect(() => resolveOverlayPortalFromNode(orphan)).toThrow(/missing/);
  });
});
