import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { describe, it, expect, vi, afterEach } from "vitest";

import { parseContentToDoc } from "./contentAdapter";

const schema = getSchema([StarterKit]);

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * 锁定「HTML 必须经惰性文档解析」这一安全约束。
 *
 * `div.innerHTML = html` 会在活动文档中建节点：`<img src=x onerror=...>` /
 * `<svg onload=...>` 会立即触发，外链资源会真实发起请求。Inline Editor 的
 * `v-model:content` 直接接收宿主 HTML（评论 / 表单等 UGC），该路径是存储型 XSS 面。
 */
describe("HTML 解析安全性", () => {
  it("走 DOMParser 惰性解析，而不是 innerHTML", () => {
    const parseSpy = vi.spyOn(window.DOMParser.prototype, "parseFromString");
    const createElementSpy = vi.spyOn(document, "createElement");

    parseContentToDoc("<p>hello</p>", schema);

    expect(parseSpy).toHaveBeenCalledTimes(1);
    expect(parseSpy.mock.calls[0][1]).toBe("text/html");
    // 回退到 innerHTML 的实现会在这里创建一个宿主 div
    expect(createElementSpy).not.toHaveBeenCalledWith("div");
  });

  it("解析产物属于无 browsing context 的惰性文档", () => {
    const parseSpy = vi.spyOn(window.DOMParser.prototype, "parseFromString");
    parseContentToDoc("<p>x</p>", schema);

    const body = parseSpy.mock.results[0].value as Document;
    expect(body.defaultView).toBeNull();
  });

  it("危险内联事件属性不会进入最终文档", () => {
    const doc = parseContentToDoc(
      '<p>safe</p><img src="x" onerror="globalThis.__pwned = true">',
      schema,
    );
    expect(doc.textContent).toContain("safe");
    expect(JSON.stringify(doc.toJSON())).not.toContain("onerror");
    expect((globalThis as Record<string, unknown>).__pwned).toBeUndefined();
  });

  it("script 标签不会被保留", () => {
    const doc = parseContentToDoc("<p>a</p><script>globalThis.__x = 1</script>", schema);
    expect(JSON.stringify(doc.toJSON())).not.toContain("script");
    expect((globalThis as Record<string, unknown>).__x).toBeUndefined();
  });

  it("空内容回退到空段落而不是抛错", () => {
    expect(parseContentToDoc("", schema).childCount).toBe(1);
  });
});
