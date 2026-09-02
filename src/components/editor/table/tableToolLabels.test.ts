// @vitest-environment jsdom

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { installBrowserStubs } from "@/testing/mountEditor";

import TableButton from "./TableButton.vue";

/**
 * 回归护栏：`t()` 的求值时机。
 *
 * 语言包是**异步加载**的（见 `provideEditorLocale` 里 shallowRef 的注释）：setup 执行时
 * `messages` 还是 null，`t()` 只能返回原始 key。若此时把结果存进普通数组/对象，
 * 语言包加载完也不会更新——按钮 tooltip 会永久显示 `table.addRowBefore` 这样的 key。
 * 表格插入面板与表格气泡工具栏都踩过这个坑。
 */
beforeAll(installBrowserStubs);

afterEach(() => {
  document.body.innerHTML = "";
});

async function settle(rounds = 40): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

describe("表格插入面板的按钮文案", () => {
  it("语言包加载完后 tooltip 是译文，不是原始 key", async () => {
    const root = document.createElement("div");
    root.className = EDITOR_ROOT_CLASS;
    const portal = document.createElement("div");
    portal.className = OVERLAY_PORTAL_CLASS;
    root.append(portal);
    document.body.append(root);

    const Host = defineComponent({
      setup() {
        provideEditorRoot(ref(root));
        provideOverlayPortal(ref(portal));
        provideEditorLocale(ref("zh-CN"));
        return () => h(TableButton, { editor: null });
      },
    });

    mount(Host, { attachTo: root });
    await settle();

    // 面板内容懒渲染，先打开
    document.querySelector("button")?.click();
    await settle(20);

    const titles = Array.from(document.querySelectorAll(".table-menu-btn")).map((button) =>
      button.getAttribute("title"),
    );

    expect(titles.length, "表格操作按钮应已渲染").toBeGreaterThan(0);
    for (const title of titles) {
      expect(title, "tooltip 不应是原始 key").not.toMatch(/^table\./);
    }
  });
});

/**
 * 静态护栏：挡住「把 t() 结果冻进顶层字面量」这个写法本身。
 *
 * 渲染测试只能覆盖被测到的那几个组件；这条规则对所有现有与未来的组件生效。
 */
describe("t() 不得在 setup 顶层被求值后冻结", () => {
  function collectSources(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        collectSources(full, out);
      } else if ((full.endsWith(".vue") || full.endsWith(".ts")) && !full.includes(".test.")) {
        out.push(full);
      }
    }
    return out;
  }

  /** 顶层 `const X = [` / `const X = {` 字面量里出现 t("…") 即为违规 */
  function violations(source: string): string[] {
    if (!source.includes("useEditorT")) return [];
    const body = source.includes("<script setup")
      ? source.slice(source.indexOf("<script setup"))
      : source;
    const lines = body.split("\n");
    const found: string[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const opening = /^const (\w+)(?:: [^=]+)? = ([[{])\s*$/.exec(lines[i]);
      if (!opening) continue;

      const [, name, opener] = opening;
      const closer = opener === "[" ? "]" : "}";
      let depth = 1;
      let j = i + 1;
      const chunk: string[] = [];
      while (j < lines.length && depth > 0) {
        depth += lines[j].split(opener).length - lines[j].split(closer).length;
        chunk.push(lines[j]);
        j += 1;
      }
      if (/(?<![\w.])t\(["'`]/.test(chunk.join("\n"))) found.push(name);
      i = j - 1;
    }
    return found;
  }

  it("src 下没有这样的字面量", () => {
    const offenders: string[] = [];
    for (const file of collectSources("src")) {
      for (const name of violations(readFileSync(file, "utf8"))) {
        offenders.push(`${file} → const ${name}`);
      }
    }

    expect(
      offenders,
      "这些常量在 setup 时求值 t()，语言包尚未加载，会把原始 key 冻死；改成 computed(() => [...])",
    ).toEqual([]);
  });
});
