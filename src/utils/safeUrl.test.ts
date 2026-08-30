import { describe, it, expect } from "vitest";

import { normalizeSafeFrameUrl, normalizeSafeMediaUrl, normalizeSafeUrl } from "./safeUrl";

describe("normalizeSafeUrl", () => {
  it("放行 http / https / mailto / tel", () => {
    expect(normalizeSafeUrl("https://example.com/a")).toBe("https://example.com/a");
    expect(normalizeSafeUrl("http://example.com")).toBe("http://example.com/");
    expect(normalizeSafeUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(normalizeSafeUrl("tel:+8613800138000")).toBe("tel:+8613800138000");
  });

  it("拦截脚本类协议", () => {
    for (const url of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "  javascript:alert(1)  ",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      expect(normalizeSafeUrl(url)).toBeNull();
    }
  });

  it("无协议输入补全为 https", () => {
    expect(normalizeSafeUrl("example.com/x")).toBe("https://example.com/x");
  });
});

describe("normalizeSafeMediaUrl", () => {
  it("按 kind 限制 data: 前缀", () => {
    expect(normalizeSafeMediaUrl("data:image/png;base64,AAA", "image")).toBe(
      "data:image/png;base64,AAA",
    );
    expect(normalizeSafeMediaUrl("data:image/png;base64,AAA", "video")).toBeNull();
    expect(normalizeSafeMediaUrl("data:text/html,<script>", "image")).toBeNull();
  });

  it("放行相对路径与 blob:", () => {
    expect(normalizeSafeMediaUrl("/a.png", "image")).toBe("/a.png");
    expect(normalizeSafeMediaUrl("./a.png", "image")).toBe("./a.png");
    expect(normalizeSafeMediaUrl("blob:https://x/y", "video")).toBe("blob:https://x/y");
  });

  it("拦截 javascript:", () => {
    expect(normalizeSafeMediaUrl("javascript:alert(1)", "image")).toBeNull();
  });
});

describe("normalizeSafeFrameUrl", () => {
  it("只放行 http / https", () => {
    expect(normalizeSafeFrameUrl("https://player.vimeo.com/video/1")).toBe(
      "https://player.vimeo.com/video/1",
    );
    expect(normalizeSafeFrameUrl("http://example.com/embed")).toBe("http://example.com/embed");
  });

  it("拦截 mailto / tel —— 比链接白名单更严格", () => {
    expect(normalizeSafeFrameUrl("mailto:a@b.com")).toBeNull();
    expect(normalizeSafeFrameUrl("tel:123")).toBeNull();
  });

  it("拦截脚本与 data 协议", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "blob:https://x/y",
    ]) {
      expect(normalizeSafeFrameUrl(url)).toBeNull();
    }
  });

  it("不做 https 自动补全 —— 裸串一律拒绝，避免把危险串补成合法 URL", () => {
    expect(normalizeSafeFrameUrl("example.com")).toBeNull();
    expect(normalizeSafeFrameUrl("//example.com")).toBeNull();
  });
});
