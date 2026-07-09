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
  el.setAttribute("role", "status");
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
  el.setAttribute("role", "status");

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

export function showEditorToast(editor: Editor, options: OverlayToastOptions): void {
  showOverlayToast(resolveOverlayPortalFromEditor(editor), options);
}

export function showEditorNotice(editor: Editor, options: OverlayNoticeOptions): void {
  showOverlayNotice(resolveOverlayPortalFromEditor(editor), options);
}
