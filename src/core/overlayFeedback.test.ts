/**
 * 浮层反馈的无障碍语义与挂载位置。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { describe, expect, it } from "vitest";

import {
  showEditorNotice,
  showEditorToast,
  showOverlayNotice,
  showOverlayToast,
} from "./overlayFeedback";

const portal = (): HTMLElement => {
  const el = document.createElement("div");
  document.body.append(el);
  return el;
};

describe("showOverlayToast / showOverlayNotice 的 aria 语义", () => {
  it("错误用 alert（assertive），其余用 status（polite）", () => {
    const p = portal();
    showOverlayToast(p, { content: "失败了", kind: "error" });
    showOverlayToast(p, { content: "成功了", kind: "success" });
    showOverlayToast(p, { content: "注意", kind: "warning" });
    showOverlayToast(p, { content: "默认" });

    const roles = [...p.querySelectorAll(".ye-overlay-toast")].map((el) => el.getAttribute("role"));
    expect(roles).toEqual(["alert", "status", "status", "status"]);
  });

  it("通知同样按 kind 选 role，并整块播报", () => {
    const p = portal();
    showOverlayNotice(p, { message: "出错", description: "详情", kind: "error" });
    const el = p.querySelector(".ye-overlay-notice");
    expect(el?.getAttribute("role")).toBe("alert");
    expect(el?.getAttribute("aria-atomic")).toBe("true");

    showOverlayNotice(p, { message: "提示" });
    const infos = p.querySelectorAll(".ye-overlay-notice");
    expect(infos[1]?.getAttribute("role")).toBe("status");
  });

  it("同类反馈复用同一个 host，且 host 是 portal 的直接子节点", () => {
    const p = portal();
    showOverlayToast(p, { content: "a" });
    showOverlayToast(p, { content: "b" });
    expect(p.querySelectorAll(":scope > .ye-overlay-toast-host")).toHaveLength(1);
    expect(p.querySelectorAll(".ye-overlay-toast")).toHaveLength(2);
  });

  it("文案走 textContent，不解析 HTML", () => {
    const p = portal();
    showOverlayToast(p, { content: "<img src=x onerror=alert(1)>" });
    const el = p.querySelector(".ye-overlay-toast");
    expect(el?.querySelector("img")).toBeNull();
    expect(el?.textContent).toBe("<img src=x onerror=alert(1)>");
  });
});

describe("编辑器已销毁时的降级", () => {
  const mountShell = () => {
    const root = document.createElement("div");
    root.className = "yaniv-editor";
    const portal = document.createElement("div");
    portal.className = "yaniv-editor__overlay-portal";
    const host = document.createElement("div");
    root.append(host, portal);
    document.body.append(root);
    return { root, host, portal };
  };

  it("销毁后不抛错，也不再产出节点", () => {
    const { host, portal } = mountShell();
    const editor = new Editor({ element: host, extensions: [StarterKit], content: "<p>x</p>" });

    showEditorNotice(editor, { message: "存活时" });
    expect(portal.querySelectorAll(".ye-overlay-notice")).toHaveLength(1);

    editor.destroy();
    expect(() => showEditorNotice(editor, { message: "销毁后" })).not.toThrow();
    expect(() => showEditorToast(editor, { content: "销毁后" })).not.toThrow();
    expect(portal.querySelectorAll(".ye-overlay-notice")).toHaveLength(1);
    expect(portal.querySelectorAll(".ye-overlay-toast")).toHaveLength(0);
  });

  it("结构错误仍要抛 —— 那是开发期 bug，不能一起吞掉", () => {
    const orphan = document.createElement("div");
    document.body.append(orphan);
    const editor = new Editor({ element: orphan, extensions: [StarterKit], content: "<p>x</p>" });
    // 没有 .yaniv-editor 祖先
    expect(() => showEditorNotice(editor, { message: "x" })).toThrow(/yaniv-editor/);
    editor.destroy();
  });
});
