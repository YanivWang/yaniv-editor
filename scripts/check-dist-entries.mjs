#!/usr/bin/env node
/**
 * 发布前产物自检：**真正加载**每个入口，而不是只看文件在不在。
 *
 * 起因：`exports.require` 长期指向 `dist/index.js`，而本包是 `"type": "module"`——
 * Node 把 `dist/*.js` 一律按 ESM 解析，CJS 代码里的 `exports` 在 ESM 作用域下不存在，
 * 任何 `require("@yanivjs/yaniv-editor")` 都会抛
 * `ReferenceError: exports is not defined in ES module scope`。
 * 而 CI 当时的断言只有 `test -s`（文件非空），三个入口全坏了照样绿。
 *
 * 因此这里按 `package.json#exports` 逐个条件解析，import 的 `import()`、
 * require 的 `require()`，并要求确实拿到导出——文件存在但加载即炸的情况必须被拦住。
 *
 * 需要在仓库内运行：入口对 vue / @tiptap/* 等 peer 依赖是 external，
 * 靠仓库的 node_modules 解析。
 */
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const require = createRequire(join(root, "dist/"));

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.error(`✗ ${msg}`);
};
const pass = (msg) => console.log(`✓ ${msg}`);

/** exports 里所有 (子路径, 条件) 组合，展开成待检清单 */
function collectTargets() {
  const targets = [];
  for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
    if (subpath === "./package.json") continue;

    if (typeof value === "string") {
      targets.push({ subpath, condition: "default", file: value, kind: "asset" });
      continue;
    }
    for (const condition of ["import", "require"]) {
      const branch = value[condition];
      if (!branch) {
        fail(`exports["${subpath}"] 缺少 "${condition}" 条件`);
        continue;
      }
      targets.push({
        subpath,
        condition,
        file: branch.default,
        types: branch.types,
        kind: condition,
      });
    }
  }
  return targets;
}

async function main() {
  for (const target of collectTargets()) {
    const label = `${pkg.name}${target.subpath.slice(1)} [${target.condition}]`;
    const abs = resolve(root, target.file);

    if (!existsSync(abs)) {
      fail(`${label}: 产物缺失 ${target.file}`);
      continue;
    }

    // 声明文件：必须存在，且后缀要与条件匹配（require → .d.cts，否则 node16 解析会报
    // “Masquerading as ESM”）
    if (target.types) {
      const typesAbs = resolve(root, target.types);
      if (!existsSync(typesAbs)) {
        fail(`${label}: 类型声明缺失 ${target.types}`);
      } else if (target.condition === "require" && !target.types.endsWith(".d.cts")) {
        fail(`${label}: "type":"module" 下 require 条件的类型必须是 .d.cts，实为 ${target.types}`);
      } else if (readFileSync(typesAbs, "utf8").length < 2000) {
        fail(`${label}: ${target.types} 过小，疑似类型打包失效`);
      }
    }

    if (target.kind === "asset") {
      pass(`${label}: ${target.file}`);
      continue;
    }

    // 后缀与条件必须自洽：本包是 "type":"module"，CJS 产物只能是 .cjs
    if (target.condition === "require" && !target.file.endsWith(".cjs")) {
      fail(`${label}: "type":"module" 下 CJS 产物必须用 .cjs 后缀，实为 ${target.file}`);
      continue;
    }

    try {
      const mod =
        target.condition === "require" ? require(abs) : await import(pathToFileURL(abs).href);
      const keys = Object.keys(mod).filter((key) => key !== "default" && key !== "__esModule");
      if (keys.length === 0) {
        fail(`${label}: 加载成功但没有任何具名导出`);
      } else {
        pass(`${label}: ${target.file} (${keys.length} 个导出)`);
      }
    } catch (error) {
      fail(`${label}: 加载失败 — ${error.name}: ${String(error.message).split("\n")[0]}`);
    }
  }

  // 传统字段同样要能解析（老打包器只看 main / module / types）
  for (const [field, value] of [
    ["main", pkg.main],
    ["module", pkg.module],
    ["types", pkg.types],
  ]) {
    if (!value) continue;
    existsSync(resolve(root, value))
      ? pass(`${field}: ${value}`)
      : fail(`${field} 指向不存在的文件 ${value}`);
  }

  if (failures.length) {
    console.error(`\n产物自检未通过：${failures.length} 项`);
    process.exit(1);
  }
  console.log("\n产物自检通过：所有入口均可真实加载");
}

await main();
