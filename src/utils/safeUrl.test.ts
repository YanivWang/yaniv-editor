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

  /**
   * 回归：这些地址一度被「一律补 https://」的逻辑毁掉——
   * `#docs` 直接判为非法（Link 扩展据此丢弃整个链接标记），
   * `/docs/page` 被补成指向外部主机 `docs` 的 `https://docs/page`。
   */
  it("锚点 / 查询串 / 站内路径原样保留，不补全也不拒绝", () => {
    expect(normalizeSafeUrl("#docs")).toBe("#docs");
    expect(normalizeSafeUrl("?q=1")).toBe("?q=1");
    expect(normalizeSafeUrl("/docs/page")).toBe("/docs/page");
    expect(normalizeSafeUrl("./rel")).toBe("./rel");
    expect(normalizeSafeUrl("../up")).toBe("../up");
  });

  it("协议相对 URL 仍按绝对地址处理，不当作站内路径", () => {
    expect(normalizeSafeUrl("//evil.com/x")).toBe("https://evil.com/x");
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
    expect(normalizeSafeMediaUrl("../up/a.png", "image")).toBe("../up/a.png");
    expect(normalizeSafeMediaUrl("blob:https://x/y", "video")).toBe("blob:https://x/y");
  });

  /**
   * 回归：不带前导 `/` 的相对路径一度被「无协议就补 https://」的分支改写成
   * `https://a.png/`（把文件名当成了主机名）。图片直接失效，而且这个被改坏的值
   * 会经 `getJSON()` 回到宿主被持久化。
   */
  it("不带前导斜杠的相对路径同样原样保留", () => {
    expect(normalizeSafeMediaUrl("a.png", "image")).toBe("a.png");
    expect(normalizeSafeMediaUrl("images/a.png", "image")).toBe("images/a.png");
    expect(normalizeSafeMediaUrl("assets/media/clip.mp4", "video")).toBe("assets/media/clip.mp4");
    expect(normalizeSafeMediaUrl("a.png?v=2", "image")).toBe("a.png?v=2");
  });

  it("形如 host.tld/path 的无协议地址仍补全为 https", () => {
    expect(normalizeSafeMediaUrl("cdn.example.com/a.png", "image")).toBe(
      "https://cdn.example.com/a.png",
    );
  });

  it("相对路径这条分支不会放过带协议的值", () => {
    expect(normalizeSafeMediaUrl("javascript:alert(1)", "image")).toBeNull();
    expect(normalizeSafeMediaUrl("file:///etc/passwd", "image")).toBeNull();
    expect(normalizeSafeMediaUrl("//evil.com/a.png", "image")).toBe("https://evil.com/a.png");
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

  // 站内相对地址不能进 iframe：那等于把宿主页面自己嵌进来
  it("拒绝站内相对地址", () => {
    for (const url of ["#docs", "?q=1", "/embed", "./embed", "../embed"]) {
      expect(normalizeSafeFrameUrl(url)).toBeNull();
    }
  });
});
