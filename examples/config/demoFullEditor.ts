import type {
  EditorAppearance,
  EditorColorMode,
  EditorMode,
  EditorPreset,
} from "@yanivjs/yaniv-editor";

export interface SelectOption<T extends string> {
  label: string;
  value: T;
}

export const MODE_OPTIONS: SelectOption<EditorMode>[] = [
  { label: "编辑", value: "edit" },
  { label: "预览", value: "preview" },
];

export const PRESET_OPTIONS: SelectOption<EditorPreset>[] = [
  { label: "Basic", value: "basic" },
  { label: "Full", value: "full" },
  { label: "Notion", value: "notion" },
];

export const APPEARANCE_OPTIONS: SelectOption<EditorAppearance>[] = [
  { label: "Default", value: "default" },
  { label: "Word", value: "word" },
  { label: "Notion", value: "notion" },
  { label: "Custom", value: "custom" },
];

export const COLOR_MODE_OPTIONS: SelectOption<EditorColorMode>[] = [
  { label: "亮色", value: "light" },
  { label: "暗色", value: "dark" },
  { label: "跟随系统", value: "auto" },
];

export type FeatureHintGroup = "编辑" | "媒体" | "文档" | "块编辑" | "智能" | "布局" | "集成";

export interface FeatureHint {
  id: string;
  group: FeatureHintGroup;
  label: string;
  /** basic / full（有顶栏时） */
  hint: string;
  /** notion：无固定顶栏时的文案 */
  hintNotion?: string;
  presets: EditorPreset[];
}

export const FEATURE_HINTS: FeatureHint[] = [
  {
    id: "textFormat",
    group: "编辑",
    label: "文本格式",
    hint: "顶栏：粗体、斜体、下划线、删除线",
    hintNotion: "选中文字后使用行首悬浮菜单中的格式按钮",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "colorPicker",
    group: "编辑",
    label: "颜色",
    hint: "顶栏：文字颜色与背景高亮",
    hintNotion: "行首悬浮菜单中的颜色与高亮",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "heading",
    group: "编辑",
    label: "标题",
    hint: "顶栏标题下拉切换 H1–H6",
    hintNotion: "输入 / 选择标题块，或使用悬浮菜单",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "list",
    group: "编辑",
    label: "列表",
    hint: "顶栏：有序、无序、任务列表",
    hintNotion: "输入 / 插入列表块",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "align",
    group: "编辑",
    label: "对齐",
    hint: "顶栏：左、中、右、两端对齐",
    hintNotion: "块菜单或悬浮菜单中的对齐",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "link",
    group: "编辑",
    label: "链接",
    hint: "顶栏插入链接；选中链接后出现气泡菜单编辑",
    hintNotion: "悬浮菜单插入链接；选中可编辑",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "font",
    group: "编辑",
    label: "字体",
    hint: "顶栏字体族下拉",
    presets: ["full"],
  },
  {
    id: "subscriptSuperscript",
    group: "编辑",
    label: "上下标",
    hint: "顶栏上标 / 下标按钮",
    presets: ["full"],
  },
  {
    id: "codeBlock",
    group: "编辑",
    label: "代码块",
    hint: "顶栏插入代码块",
    hintNotion: "输入 / 选择代码块",
    presets: ["full", "notion"],
  },
  {
    id: "formatPainter",
    group: "编辑",
    label: "格式刷",
    hint: "顶栏格式刷：先选源格式再刷到目标",
    presets: ["full"],
  },
  {
    id: "clearFormat",
    group: "编辑",
    label: "清除格式",
    hint: "顶栏清除格式按钮，移除选区内的样式",
    hintNotion: "悬浮菜单或块菜单中的清除格式",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "image",
    group: "媒体",
    label: "图片",
    hint: "顶栏上传图片；选中后上下文条可缩放、预览",
    hintNotion: "输入 / 或悬浮菜单插入图片；选中后出现图片条",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "video",
    group: "媒体",
    label: "视频",
    hint: "顶栏插入视频；选中后上下文条可预览播放",
    hintNotion: "输入 / 或悬浮菜单插入视频",
    presets: ["full", "notion"],
  },
  {
    id: "imageToolbar",
    group: "媒体",
    label: "图片上下文条",
    hint: "选中图片后出现缩放与预览控件",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "videoToolbar",
    group: "媒体",
    label: "视频上下文条",
    hint: "选中视频后可预览播放",
    presets: ["full", "notion"],
  },
  {
    id: "table",
    group: "文档",
    label: "表格",
    hint: "顶栏选择行列插入表格；光标在表格内出现表格条",
    hintNotion: "输入 / 或悬浮菜单插入表格；单元格内出现表格操作条",
    presets: ["full", "notion"],
  },
  {
    id: "tableTools",
    group: "文档",
    label: "表格上下文条",
    hint: "在表格内选中单元格后使用表格操作条",
    presets: ["full", "notion"],
  },
  {
    id: "math",
    group: "文档",
    label: "数学公式",
    hint: "顶栏插入 LaTeX 公式",
    hintNotion: "输入 / 插入公式块",
    presets: ["full", "notion"],
  },
  {
    id: "word",
    group: "文档",
    label: "Word 导入导出",
    hint: "顶栏 Word 按钮导入或导出 .docx",
    presets: ["full"],
  },
  {
    id: "template",
    group: "文档",
    label: "文档模板",
    hint: "顶栏模板按钮插入预设文档结构",
    presets: ["full"],
  },
  {
    id: "gallery",
    group: "文档",
    label: "图库",
    hint: "顶栏图库从当前文档收集的图片中选择插入",
    presets: ["full"],
  },
  {
    id: "outline",
    group: "文档",
    label: "大纲目录",
    hint: "顶栏开关大纲；左侧目录面板点击跳转标题",
    hintNotion: "工作区左侧大纲面板，点击跳转标题",
    presets: ["full", "notion"],
  },
  {
    id: "searchReplace",
    group: "文档",
    label: "查找替换",
    hint: "顶栏按钮或 Ctrl/Cmd+F",
    hintNotion: "Ctrl/Cmd+F 打开查找替换（无顶栏）",
    presets: ["full", "notion"],
  },
  {
    id: "officePaste",
    group: "文档",
    label: "Office 粘贴",
    hint: "从 Word / Excel 复制后粘贴，保留表格与样式",
    presets: ["full", "notion"],
  },
  {
    id: "slashCommand",
    group: "块编辑",
    label: "斜杠命令",
    hint: "空行输入 / 选择块类型",
    presets: ["notion"],
  },
  {
    id: "dragHandle",
    group: "块编辑",
    label: "拖拽块",
    hint: "段落左侧六点：打开菜单或拖拽排序",
    presets: ["notion"],
  },
  {
    id: "notionCallout",
    group: "块编辑",
    label: "标注块",
    hint: "notion 方案：输入 / 选择「标注」；或空行输入 > 触发 Markdown 转标注",
    presets: ["notion"],
  },
  {
    id: "notionToggle",
    group: "块编辑",
    label: "折叠列表",
    hint: "输入 / 选择「折叠列表」插入可展开块",
    presets: ["notion"],
  },
  {
    id: "notionColumn",
    group: "块编辑",
    label: "分栏",
    hint: "输入 / 选择「分栏」插入双列布局",
    presets: ["notion"],
  },
  {
    id: "notionEmbed",
    group: "块编辑",
    label: "嵌入 / 书签",
    hint: "输入 / 选择「嵌入/书签」插入外部链接卡片",
    presets: ["notion"],
  },
  {
    id: "notionMention",
    group: "块编辑",
    label: "@ 提及",
    hint: "输入 @ 唤起提及建议菜单",
    presets: ["notion"],
  },
  {
    id: "floatingMenu",
    group: "块编辑",
    label: "行首悬浮菜单",
    hint: "空行行首 + 或块菜单插入内容",
    presets: ["full", "notion"],
  },
  {
    id: "ai",
    group: "智能",
    label: "AI 辅助",
    hint: "选中文字使用行首悬浮菜单 AI；或在顶栏 AI 设置配置 API Key（也可设 VITE_AI_DEMO_MODE 体验演示流）",
    hintNotion: "选中文字后行首悬浮菜单中的 AI；顶栏 AI 设置（notion 方案无顶栏时见悬浮菜单）",
    presets: ["full", "notion"],
  },
  {
    id: "footerNav",
    group: "布局",
    label: "底栏",
    hint: "底部缩放、页数/字数；full 方案含快捷键提示",
    presets: ["basic", "full"],
  },
  {
    id: "preview",
    group: "布局",
    label: "预览态",
    hint: "上方切换「预览」：无工具栏，内容只读；链接可点、视频可播",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "appearance",
    group: "布局",
    label: "外观皮肤",
    hint: "上方切换 appearance：体验 word / notion 等视觉",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "appearanceCustom",
    group: "布局",
    label: "Custom 外观",
    hint: "appearance 选 Custom 时通过 :custom-appearance-vars 注入演示 CSS 变量",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "featuresOverride",
    group: "布局",
    label: "features 覆盖",
    hint: "上方「features 覆盖」可强制开启/关闭单项能力，覆盖 preset 默认",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "uploadHandlers",
    group: "集成",
    label: "上传回调",
    hint: "开启「uploadImage / uploadVideo」：工具栏与块菜单上传走接入方 Promise，非默认 DataURL",
    presets: ["full", "notion", "basic"],
  },
  {
    id: "galleryImages",
    group: "集成",
    label: "外部图库",
    hint: "开启 galleryImages：图库按钮展示注入列表，而非仅扫描文档内图片",
    presets: ["full"],
  },
  {
    id: "customTemplates",
    group: "集成",
    label: "自定义模板",
    hint: "开启 customTemplates：模板弹窗末尾追加集成方模板项",
    presets: ["full"],
  },
  {
    id: "aiConfig",
    group: "集成",
    label: "AI 托管",
    hint: "开启 ai-config：忽略 localStorage/.env，默认隐藏「AI 设置」；无 Key 配合 VITE_AI_DEMO_MODE",
    presets: ["full", "notion"],
  },
];

const GROUP_ORDER: FeatureHintGroup[] = ["编辑", "媒体", "文档", "块编辑", "智能", "布局", "集成"];

export interface ResolvedFeatureHint {
  id: string;
  group: FeatureHintGroup;
  label: string;
  hint: string;
}

export function resolveHintText(item: FeatureHint, preset: EditorPreset): string {
  if (preset === "notion" && item.hintNotion) return item.hintNotion;
  return item.hint;
}

export function getHintsForPreset(preset: EditorPreset): ResolvedFeatureHint[] {
  return FEATURE_HINTS.filter((h) => h.presets.includes(preset)).map((h) => ({
    id: h.id,
    group: h.group,
    label: h.label,
    hint: resolveHintText(h, preset),
  }));
}

export function getHintGroupsForPreset(
  preset: EditorPreset,
): { group: FeatureHintGroup; items: ResolvedFeatureHint[] }[] {
  const hints = getHintsForPreset(preset);
  return GROUP_ORDER.map((group) => ({
    group,
    items: hints.filter((h) => h.group === group),
  })).filter((g) => g.items.length > 0);
}

const SAMPLE_BASIC = `
<h1>Yaniv Editor — Basic</h1>
<p>轻量写作方案：顶栏 + 底栏，常用排版与图片能力。</p>
<h2>列表示例</h2>
<ul>
  <li>有序与无序列表</li>
  <li>任务列表可在工具栏开启</li>
</ul>
<p>可尝试插入链接与图片；表格、视频等需切换 full preset 或在「features 覆盖」中开启。</p>
`;

const SAMPLE_FULL = `
<h1>Yaniv Editor — Full</h1>
<p>完整能力集：AI、数学公式、Word、查找替换、格式刷、大纲等。</p>
<h2>表格示例</h2>
<table>
  <tr><th>功能</th><th>操作</th></tr>
  <tr><td>表格</td><td>顶栏插入后在此编辑</td></tr>
  <tr><td>查找</td><td>Ctrl/Cmd+F</td></tr>
</table>
<h2>更多</h2>
<p>选中文字体验 <strong>AI 悬浮菜单</strong>；也可选中 <a href="https://example.com">示例链接</a> 查看链接气泡；数学公式、模板、图库、Office 粘贴等见顶栏。</p>
<p>可从 Word 复制内容粘贴试 <strong>Office 粘贴</strong>；顶栏插入公式试 <strong>数学</strong>。块编辑（<code>/</code>、拖拽块）请切换 <strong>Notion</strong> 方案。</p>
`;

const SAMPLE_NOTION = `
<h1>块编辑体验</h1>
<p>Notion 方案：无固定顶栏/底栏，依赖行首悬浮菜单、<code>/</code> 与左侧手柄。</p>
<h2>试一试</h2>
<ul>
  <li>空行输入 <code>/</code> 插入块（标注、折叠列表、分栏、嵌入等）</li>
  <li>空行输入 <code>@</code> 唤起提及菜单；输入 <code>&gt; </code> 可转标注块</li>
  <li>段落左侧六点：菜单或拖拽</li>
  <li>选中文字使用行首 AI 与格式</li>
</ul>
<p>在下方切换 appearance 可叠加不同皮肤。</p>
`;

export function getSampleContent(preset: EditorPreset): string {
  switch (preset) {
    case "basic":
      return SAMPLE_BASIC;
    case "notion":
      return SAMPLE_NOTION;
    default:
      return SAMPLE_FULL;
  }
}
