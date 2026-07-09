// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { showOverlayNotice, showOverlayToast } from "@/core/overlayFeedback";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";

function createPortal(): HTMLElement {
  const root = document.createElement("div");
  root.className = EDITOR_ROOT_CLASS;
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  root.append(portal);
  document.body.append(root);
  return portal;
}

describe("overlayFeedback", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  it("mounts toast inside overlay portal host", () => {
    const portal = createPortal();
    showOverlayToast(portal, { content: "Saved", kind: "success" });

    const toast = portal.querySelector(".ye-overlay-toast-host .ye-overlay-toast--success");
    expect(toast?.textContent).toBe("Saved");
  });

  it("mounts notice inside overlay portal host", () => {
    const portal = createPortal();
    showOverlayNotice(portal, {
      message: "Failed",
      description: "Network error",
      kind: "error",
    });

    const notice = portal.querySelector(".ye-overlay-notice-host .ye-overlay-notice--error");
    expect(notice?.querySelector(".ye-overlay-notice__title")?.textContent).toBe("Failed");
    expect(notice?.querySelector(".ye-overlay-notice__desc")?.textContent).toBe("Network error");
  });

  it("removes toast after duration", () => {
    const portal = createPortal();
    showOverlayToast(portal, { content: "Hi", duration: 1 });

    expect(portal.querySelector(".ye-overlay-toast")).toBeTruthy();
    vi.advanceTimersByTime(1000);
    expect(portal.querySelector(".ye-overlay-toast")?.classList.contains("is-leaving")).toBe(true);
    vi.advanceTimersByTime(200);
    expect(portal.querySelector(".ye-overlay-toast")).toBeNull();
  });
});
