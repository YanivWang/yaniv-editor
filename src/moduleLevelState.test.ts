import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

/**
 * 静态护栏：不变量 15「禁止模块级可变状态」的守夜人。
 *
 * 库要支持同页多实例，模块级的可变状态会让实例互相覆盖。这条不变量有**三次历史事故**
 * （outline 的 `scrollParent`、AI 的 `hostConfig`——未传 `ai-config` 的实例会静默复用
 * 另一实例的密钥、`aiSuggestionManager` 的构建期 `bindLocale`），但一直只写在文档里、
 * 没有任何静态检查。第 17 棒补上：**新增模块级可变状态就会红**，除非在下面的清单里
 * 登记并写清为什么它不该按实例隔离。
 *
 * 判据只认三种不会误伤的形态：
 * - 顶层 `let` / `var`（`const` 的只读查找表不算）
 * - 顶层 `ref()` / `shallowRef()` / `reactive()` / `shallowReactive()`（Vue 响应式状态）
 * - 顶层 `new Map()` / `new Set()` **且不带初值**（空注册表几乎一定是要往里写的）
 *
 * ⚠️ 只扫 `.ts`：`.vue` 的 `<script setup>` 是组件作用域，每个实例一份，不在此列。
 */
interface AllowedEntry {
  /** 相对仓库根的路径 */
  file: string;
  /** 声明的标识符 */
  name: string;
  /** 为什么它**不该**按实例隔离——写不出理由的就不该进这个清单 */
  reason: string;
}

const ALLOWED: AllowedEntry[] = [
  {
    file: "src/locales/manager.ts",
    name: "localeCache",
    reason: "已加载语言包的缓存：同页多实例共用一份是目的本身，按实例隔离等于重复下载",
  },
  {
    file: "src/locales/manager.ts",
    name: "localeGeneration",
    reason: "自定义文案的版本号，配合 localeCache 使消费方重算；与缓存同寿命",
  },
  {
    file: "src/locales/manager.ts",
    name: "currentLocale",
    reason: "全局默认语言（宿主未传 locale 时的兜底）；实例语言走 provideEditorLocale",
  },
  {
    file: "src/locales/manager.ts",
    name: "fallbackLocale",
    reason: "全局兜底语言：当前语言缺 key 时回退到它，与 currentLocale 同属进程级默认值",
  },
  {
    file: "src/locales/manager.ts",
    name: "customMessages",
    reason: "宿主注册的自定义文案，按 locale 代码索引，本就是进程级词表",
  },
  {
    file: "src/features/ai/translation/translateStore.ts",
    name: "currentTranslateLang",
    reason: "翻译目标语言是**浏览器用户**的偏好（随 AI 配置持久化），不是某个编辑器实例的状态",
  },
  {
    file: "src/features/ai/translation/translateStore.ts",
    name: "legacyLabel",
    reason: "上一条的旧格式遗留值，等界面拿到 locale 后反查成代码；与它同寿命",
  },
  {
    file: "src/features/ai/config/useAiConfig.ts",
    name: "state",
    reason:
      "用户在 AI 设置弹窗里填的配置（provider / key / 模型）——属于这个浏览器用户，" +
      "同页多实例共享才是预期。要按实例区分的宿主走 `ai-config` prop，那条路径是 owner 键控的",
  },
  {
    file: "src/features/ai/config/useAiConfig.ts",
    name: "isInitialized",
    reason: "上一条的一次性初始化标记，跟着它走",
  },
  {
    file: "src/features/ai/config/store.ts",
    name: "memoryApiKey",
    reason: "memory 存储模式下的密钥暂存：与上面的用户配置同一份归属，不落 localStorage",
  },
  {
    file: "src/features/ai/config/store.ts",
    name: "storeInstance",
    reason: "读写 localStorage 的无状态包装的单例工厂，本身不持有实例相关状态",
  },
  {
    file: "src/features/ai/config/hostConfig.ts",
    name: "warnedAmbiguous",
    reason: "「多个宿主登记了 ai-config 却匿名查询」的告警去重，只提醒一次；不影响任何行为",
  },
];

type Finding = { file: string; line: number; name: string; kind: string };

const PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: "let/var", re: /^(?:export\s+)?(?:let|var)\s+(\w+)/ },
  {
    kind: "reactive",
    re: /^(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*(?:ref|shallowRef|reactive|shallowReactive)\s*[(<]/,
  },
  {
    kind: "empty-registry",
    re: /^(?:export\s+)?const\s+(\w+)\s*(?::[^=]+)?=\s*new\s+(?:Map|Set|WeakMap|WeakSet)\s*\(\s*\)/,
  },
];

export function scanText(source: string, file = "<sample>"): Finding[] {
  const findings: Finding[] = [];
  source.split("\n").forEach((line, index) => {
    for (const { kind, re } of PATTERNS) {
      const match = re.exec(line);
      if (match) {
        findings.push({ file, line: index + 1, name: match[1], kind });
        return;
      }
    }
  });
  return findings;
}

function collectTsFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry !== "testing") collectTsFiles(full, out);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function scanRepo(): Finding[] {
  return collectTsFiles("src").flatMap((file) => scanText(readFileSync(file, "utf8"), file));
}

describe("模块级可变状态（不变量 15）", () => {
  test("除登记在案的例外，src 下没有模块级可变状态", () => {
    const allowed = new Set(ALLOWED.map((entry) => `${entry.file}::${entry.name}`));
    const offenders = scanRepo()
      .filter((hit) => !allowed.has(`${hit.file}::${hit.name}`))
      .map((hit) => `${hit.file}:${hit.line} [${hit.kind}] ${hit.name}`);

    expect(offenders).toEqual([]);
  });

  test("清单不许留过期条目 —— 登记的每一条都要真的存在", () => {
    const found = new Set(scanRepo().map((hit) => `${hit.file}::${hit.name}`));
    const stale = ALLOWED.filter((entry) => !found.has(`${entry.file}::${entry.name}`)).map(
      (entry) => `${entry.file}::${entry.name}`,
    );

    expect(stale, "代码已经改掉了，清单也要跟着删").toEqual([]);
  });

  test("每条例外都写了理由", () => {
    for (const entry of ALLOWED) {
      expect(entry.reason.length, `${entry.file}::${entry.name} 缺理由`).toBeGreaterThan(10);
    }
  });

  test("扫描器认得出三种形态，且不误伤函数内的局部变量（护栏自检）", () => {
    const sample = [
      "let moduleFlag = false;",
      "export let exported = 1;",
      "const cache = ref<string[]>([]);",
      "export const registry = new Map();",
      "const LOOKUP = new Set([1, 2, 3]);",
      "const frozen = { a: 1 };",
      "function f() {",
      "  let local = 0;",
      "  return local;",
      "}",
    ].join("\n");

    expect(scanText(sample).map((hit) => `${hit.kind}:${hit.name}`)).toEqual([
      "let/var:moduleFlag",
      "let/var:exported",
      "reactive:cache",
      "empty-registry:registry",
    ]);
  });
});
