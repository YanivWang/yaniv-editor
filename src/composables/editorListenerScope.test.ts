import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：退订编辑器事件时，不得在退订函数里「就地取当前编辑器」。
 *
 * `watch(editor, cb)` 的回调触发时 `editor.value` **已经是新实例**。若退订函数体内自己
 * 去读 `editor.value` / `toValue(editor)` / `props.editor`，`off()` 就全打在刚换上的实例上
 * （那上面还没有监听），旧实例的监听一个也摘不掉——组件早已不再使用它，回调却还在跑。
 *
 * 正确写法是让被退订的编辑器**从外面进来**：
 * - `watch(editor, (e, _p, onCleanup) => { e.on(...); onCleanup(() => e.off(...)); })`
 *   （`HeadingControl` / `useControlledContent` / `ZoomBar`，闭包捕获的是**当次**实例）——**首选**
 * - 或 `watch(editor, (next, prev) => { detach(prev); attach(next); })`（`OutlinePanel`），
 *   但这种写法只覆盖「换实例」，**不覆盖「组件卸载」**，必须另配 `onBeforeUnmount` 退订；
 *   见本文件末尾的第二条护栏。
 *
 * 历史事故：同一形状一次性存在 4 处——`UndoRedoButton`（还叠加了摘不掉的匿名 `create`
 * 监听与 `nextTick` 造成的重复订阅）、`FormatPainterButton`、`useEditorColorState`、
 * `CodeBlockLanguageBadge`（后者写了 `if (prev) unbind()`，看着用了 prev，
 * 实际 `unbind()` 内部读的仍是 `editor.value`）。对应 ARCHITECTURE 不变量 24。
 */
const EDITOR_EVENT_OFF = /\.off\(\s*["'](?:update|selectionUpdate|transaction|create|destroy)["']/;

/** 「就地取当前编辑器」的三种写法 */
const LIVE_EDITOR_READ = /=\s*(?:editor\.value\b|toValue\(\s*editor\s*\)|props\.editor\b)/;

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "testing") collectSourceFiles(full, out);
    } else if (/\.(ts|vue)$/.test(entry) && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** 具名函数声明与赋给常量的箭头函数，两种写法都要扫 */
const FUNCTION_HEAD =
  /(?:function\s+(\w+)\s*\([^)]*\)\s*(?::[^{]*?)?|const\s+(\w+)\s*=\s*\([^)]*\)\s*(?::[^=]*?)?=>\s*)\{/g;

/** 从 `{` 处按花括号配平截出函数体 */
function readBody(text: string, openBrace: number): string {
  let depth = 0;
  for (let i = openBrace; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(openBrace, i + 1);
    }
  }
  return text.slice(openBrace);
}

interface FunctionSpan {
  name: string;
  start: number;
  end: number;
  body: string;
}

export function findUnscopedDetach(text: string): string[] {
  FUNCTION_HEAD.lastIndex = 0;

  const withOff: FunctionSpan[] = [];
  let head: RegExpExecArray | null;
  while ((head = FUNCTION_HEAD.exec(text)) !== null) {
    const openBrace = head.index + head[0].length - 1;
    const body = readBody(text, openBrace);
    if (!EDITOR_EVENT_OFF.test(body)) continue;
    withOff.push({
      name: head[1] ?? head[2] ?? "<anonymous>",
      start: openBrace,
      end: openBrace + body.length,
      body,
    });
  }

  /**
   * 只看**最内层**那个退订函数。
   *
   * 外层的 composable / setup 整体也包含 `.off(`，同时往往在别处（兄弟函数里）
   * 合法地读过一次 `editor.value`——不剔除外层就会误报。
   */
  const innermost = withOff.filter(
    (fn) => !withOff.some((other) => other !== fn && other.start > fn.start && other.end <= fn.end),
  );

  return innermost.filter((fn) => LIVE_EDITOR_READ.test(fn.body)).map((fn) => fn.name);
}

/**
 * 静态护栏之二：**组件**订阅了编辑器事件，就必须把退订挂在生命周期上。
 *
 * `watch(editor, (next, prev) => { detach(prev); attach(next) })` 只在**换实例**时退订。
 * 组件被卸载时 watcher 只是停止，回调不会再跑，监听于是永远留在那个还活着的编辑器上。
 *
 * 这条在 `ZoomBar` 上真实发生过：底栏在 `mode` 切到 preview 时卸载
 * （`resolveChromePolicy` 的 `showFooter`），而 `computeSessionKey` 不含 mode，
 * 编辑器并不重建——实测 edit↔preview 每来回一次，监听数 4 → 6 → 8 单调增长，
 * 每个残留的 `updateCounts` 还在跟着每次按键跑。
 *
 * 只判 `.vue`：节点视图与 manager（`resizableImage` / `aiSuggestionManager`）
 * 的生命周期由 ProseMirror / 调用方的 `destroy()` 负责，不走 Vue 钩子。
 */
const EDITOR_EVENT_ON = /\.on\(\s*["'](?:update|selectionUpdate|transaction|create|destroy)["']/;
const LIFECYCLE_TEARDOWN =
  /\bonCleanup\s*\(|\bonBeforeUnmount\s*\(|\bonUnmounted\s*\(|\bonScopeDispose\s*\(/;

export function findUnboundedSubscription(file: string, text: string): string[] {
  if (!file.endsWith(".vue")) return [];
  if (!EDITOR_EVENT_ON.test(text)) return [];
  if (LIFECYCLE_TEARDOWN.test(text)) return [];
  return [`${file} — 订阅了编辑器事件但没有任何随生命周期触发的退订`];
}

describe("退订编辑器事件不得就地取当前实例", () => {
  test("全仓无违规", () => {
    const findings = collectSourceFiles("src").flatMap((file) =>
      findUnscopedDetach(readFileSync(file, "utf8")).map((fn) => `${file}: ${fn}()`),
    );

    expect(findings).toEqual([]);
  });

  test("扫描器能认出违规写法（护栏自检）", () => {
    // 与 useEditorColorState / UndoRedoButton 修复前同形
    const broken = `
      function cleanupEditorSubscriptions() {
        const e = toValue(editor);
        if (!e) return;
        e.off("selectionUpdate", sync);
        e.off("transaction", sync);
      }
    `;
    expect(findUnscopedDetach(broken)).toEqual(["cleanupEditorSubscriptions"]);

    // 正确写法：被退订的编辑器由参数传入
    const fixed = `
      function detachEditorListeners(e) {
        if (!e) return;
        e.off("selectionUpdate", sync);
        e.off("transaction", sync);
      }
    `;
    expect(findUnscopedDetach(fixed)).toEqual([]);

    // 正确写法：onCleanup 闭包捕获当次实例
    const viaCleanup = `
      const stop = (e, prev, onCleanup) => {
        e.on("transaction", sync);
        onCleanup(() => e.off("transaction", sync));
      };
    `;
    expect(findUnscopedDetach(viaCleanup)).toEqual([]);
  });
});

describe("组件订阅编辑器事件必须绑定生命周期", () => {
  test("全仓无违规", () => {
    const findings = collectSourceFiles("src").flatMap((file) =>
      findUnboundedSubscription(file, readFileSync(file, "utf8")),
    );

    expect(findings).toEqual([]);
  });

  test("扫描器认得出漏挂生命周期的组件（护栏自检）", () => {
    // 与 ZoomBar 修复前同形：只处理 oldEditor，卸载时无人退订
    const broken = `
      watch(editor, (ed, oldEditor) => {
        if (oldEditor) detach(oldEditor);
        if (ed) ed.on("update", sync);
      }, { immediate: true });
    `;
    expect(findUnboundedSubscription("Probe.vue", broken)).toHaveLength(1);

    // onCleanup 覆盖换实例 + 卸载
    const viaCleanup = `
      watch(editor, (e, _p, onCleanup) => {
        e.on("update", sync);
        onCleanup(() => e.off("update", sync));
      });
    `;
    expect(findUnboundedSubscription("Probe.vue", viaCleanup)).toEqual([]);

    // 显式卸载钩子也算数
    const viaUnmount = `
      watch(editor, (ed, oldEditor) => { detach(oldEditor); ed?.on("update", sync); });
      onBeforeUnmount(() => detach(editorAtSubscribeTime));
    `;
    expect(findUnboundedSubscription("Probe.vue", viaUnmount)).toEqual([]);

    // 非组件文件不判（节点视图 / manager 走各自的 destroy）
    expect(findUnboundedSubscription("nodeView.ts", broken)).toEqual([]);
  });
});
