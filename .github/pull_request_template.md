## 变更内容

<!-- 说明「改了什么」以及「为什么」，而不只是罗列文件 -->

## 变更类型

- [ ] fix — 缺陷修复
- [ ] feat — 新能力
- [ ] refactor — 不改变外部行为
- [ ] docs — 仅文档
- [ ] chore / build — 工程配置

## 自检

- [ ] `pnpm run verify` 通过
- [ ] 新增/修改的行为有测试覆盖
- [ ] 新增文案已同步 `zh-CN` / `en-US` / `locales/types.ts`
- [ ] 未引入模块级可变状态（多实例安全）
- [ ] 默认 preset 关闭的新能力使用了动态 import
- [ ] 新增交互元素使用原生语义标签或已补 ARIA
- [ ] 涉及公开 API 变更时已更新 `docs/` 与 `CHANGELOG.md`

## 破坏性变更

<!-- 无则填「无」；有则说明影响范围与迁移方式，并确认已写入 CHANGELOG 的 BREAKING CHANGES -->
