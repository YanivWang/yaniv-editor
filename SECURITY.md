# 安全策略 / Security Policy

## 支持的版本 / Supported versions

当前仅对最新的 `0.2.x` 发布线提供安全修复；更早的发布线请先升级。

| Version | Supported |
| ------- | --------- |
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## 报告漏洞 / Reporting a vulnerability

**请不要通过公开 Issue 报告安全问题。**

请使用 GitHub 的 [Private vulnerability reporting](https://github.com/YanivWang/yaniv-editor/security/advisories/new)
提交。收到报告后：

- 3 个工作日内确认收悉；
- 10 个工作日内给出影响评估与修复计划；
- 修复发布后在 `CHANGELOG.md` 致谢报告者（可申请匿名）。

## 集成方需要知道的安全边界

编辑器负责的部分：

- **URL 白名单**：链接（`normalizeSafeUrl`，仅 http/https/mailto/tel）、图片与视频
  （`normalizeSafeMediaUrl`，额外允许 `blob:` 与匹配类型的 `data:`）、iframe 嵌入
  （`normalizeSafeFrameUrl`，仅 http/https）。
- **惰性 HTML 解析**：`ContentAdapter` 用 `DOMParser.parseFromString` 解析传入的 HTML
  字符串，脚本不执行、事件处理器不触发、外链资源不加载。
- **iframe 沙箱**：`embed` 节点渲染的 iframe 带 `sandbox`，且只开放播放所需的 `allow` 能力。
- **KaTeX `trust: false`**：公式渲染不允许 `\href` 等可注入命令。

集成方负责的部分：

- **服务端二次校验**：编辑器输出的 HTML/JSON 在入库与回显前必须由服务端再做一次
  清洗与结构校验。前端 schema 约束不能替代服务端校验。
- **AI 密钥**：生产环境请使用 `storageMode: "proxy"`，由后端保管密钥。
  `local` 会把密钥写入 `localStorage`，仅适用于本地调试与演示。
- **上传处理器**：`uploadImage` / `uploadVideo` 返回的地址会经过白名单校验，
  但文件本身的类型/大小/病毒扫描由接入方的上传服务负责。
