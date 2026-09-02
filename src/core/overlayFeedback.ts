/**
 * 编辑器浮层反馈（toast / notice）
 * 一律挂到 `.yaniv-editor__overlay-portal`，禁止 antd 静态 message/notification（全局单例 + body）。
 */

import { resolveOverlayPortalFromNode } from "@/core/overlayPortal";

import type { Editor } from "@tiptap/core";

export type OverlayFeedbackKind = "success" | "info" | "warning" | "error";

export interface OverlayToastOptions {
  content: string;
  kind?: OverlayFeedbackKind;
  /** 秒；默认 2.5 */
  duration?: number;
}

export interface OverlayNoticeOptions {
  message: string;
  description?: string;
  kind?: OverlayFeedbackKind;
  /** 秒；默认 3 */
  duration?: number;
}

/**
 * 反馈的无障碍语义：错误必须是 `alert`（assertive），其余用 `status`（polite）。
 *
 * 此前两个入口都恒写 `role="status"` —— 那是 polite live region，屏幕阅读器会等到
 * 当前朗读结束才播报，而 toast 只停留 2.5 秒，用户很可能根本听不到失败提示。
 * warning 仍保持 polite：assertive 会打断用户当前的朗读，滥用比不用更烦人，
 * 这也是 Ant Design / Material 的取法。
 */
function ariaRoleFor(kind: OverlayFeedbackKind): "alert" | "status" {
  return kind === "error" ? "alert" : "status";
}

const TOAST_HOST_CLASS = "ye-overlay-toast-host";
const NOTICE_HOST_CLASS = "ye-overlay-notice-host";

function ensureHost(portal: HTMLElement, className: string): HTMLElement {
  const existing = portal.querySelector(`:scope > .${className}`);
  if (existing instanceof HTMLElement) return existing;
  const host = document.createElement("div");
  host.className = className;
  portal.append(host);
  return host;
}

function scheduleRemove(el: HTMLElement, durationSec: number): void {
  const ms = Math.max(0, durationSec) * 1000;
  window.setTimeout(() => {
    el.classList.add("is-leaving");
    window.setTimeout(() => el.remove(), 180);
  }, ms);
}

/** 轻量顶部居中提示（替代 antd message） */
export function showOverlayToast(portal: HTMLElement, options: OverlayToastOptions): void {
  const host = ensureHost(portal, TOAST_HOST_CLASS);
  const kind = options.kind ?? "info";
  const el = document.createElement("div");
  el.className = `ye-overlay-toast ye-overlay-toast--${kind}`;
  el.setAttribute("role", ariaRoleFor(kind));
  el.textContent = options.content;
  host.append(el);
  scheduleRemove(el, options.duration ?? 2.5);
}

/** 右上角通知（替代 antd notification） */
export function showOverlayNotice(portal: HTMLElement, options: OverlayNoticeOptions): void {
  const host = ensureHost(portal, NOTICE_HOST_CLASS);
  const kind = options.kind ?? "info";
  const el = document.createElement("div");
  el.className = `ye-overlay-notice ye-overlay-notice--${kind}`;
  el.setAttribute("role", ariaRoleFor(kind));
  // 通知由标题 + 描述两个子节点组成，必须整块播报，否则只会读出变化的那一个
  el.setAttribute("aria-atomic", "true");

  const title = document.createElement("div");
  title.className = "ye-overlay-notice__title";
  title.textContent = options.message;
  el.append(title);

  if (options.description) {
    const desc = document.createElement("div");
    desc.className = "ye-overlay-notice__desc";
    desc.textContent = options.description;
    el.append(desc);
  }

  host.append(el);
  scheduleRemove(el, options.duration ?? 3);
}

export function resolveOverlayPortalFromEditor(editor: Editor): HTMLElement {
  return resolveOverlayPortalFromNode(editor.view.dom);
}

/**
 * 已销毁的编辑器没有可承载反馈的浮层，直接跳过。
 *
 * 这两个入口大量出现在**异步流式回调**里（AI 润色 / 续写 / 总结 / 翻译的 `onError`），
 * 而回调发生时编辑器可能早已销毁——组件卸载，或能力开关变化触发 session 重建。
 * 销毁后 `editor.state` 仍可读，但 `editor.view` 一碰就抛
 * `[tiptap error]: The editor view is not available`（实测），而这些调用**无人捕获**。
 *
 * 触发路径不止「销毁与失败恰好同时」这一种竞态：`aiSuggestionManager.setAbortController()`
 * 是直接覆盖而不 abort 旧的，连续两次 AI 操作就会让第一个流变成再也 abort 不了的孤儿，
 * 它失败时拿的正是闭包里那个已销毁的 editor。
 *
 * 只对「编辑器已销毁」降级：缺 `.yaniv-editor` 祖先或缺 portal 是**结构错误**，
 * 那是开发期的 bug，照常抛出，不能一起吞掉。
 */
function resolveLiveOverlayPortal(editor: Editor): HTMLElement | null {
  if (editor.isDestroyed) return null;
  return resolveOverlayPortalFromEditor(editor);
}

export function showEditorToast(editor: Editor, options: OverlayToastOptions): void {
  const portal = resolveLiveOverlayPortal(editor);
  if (!portal) return;
  showOverlayToast(portal, options);
}

export function showEditorNotice(editor: Editor, options: OverlayNoticeOptions): void {
  const portal = resolveLiveOverlayPortal(editor);
  if (!portal) return;
  showOverlayNotice(portal, options);
}
