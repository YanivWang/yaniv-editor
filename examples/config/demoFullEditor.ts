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
    hintNotion: "选中文字后使用浮动菜单中的格式按钮",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "colorPicker",
    group: "编辑",
    label: "颜色",
    hint: "顶栏：文字颜色与背景高亮",
    hintNotion: "浮动菜单中的颜色与高亮",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "heading",
    group: "编辑",
    label: "标题",
    hint: "顶栏标题下拉切换 H1–H6",
    hintNotion: "行首输入 / 选择标题块，或用浮动菜单的标题下拉",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "list",
    group: "编辑",
    label: "列表",
    hint: "顶栏：有序、无序、任务列表",
    hintNotion: "行首输入 / 插入列表块，或用浮动菜单的列表按钮",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "align",
    group: "编辑",
    label: "对齐",
    hint: "顶栏：左、中、右、两端对齐",
    hintNotion: "无内置入口：对齐按钮只在顶栏，notion 隐藏了顶栏（扩展仍注册，可自行调命令）",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "link",
    group: "编辑",
    label: "链接",
    hint: "顶栏插入链接；选中链接后出现气泡菜单编辑",
    hintNotion: "浮动菜单插入链接；选中链接后出现气泡菜单编辑",
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
    hintNotion: "行首输入 / 选择代码块",
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
    hintNotion: "无内置入口：清除格式按钮只在顶栏，notion 隐藏了顶栏",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "image",
    group: "媒体",
    label: "图片",
    hint: "顶栏上传图片；选中后上下文条可对齐、预览、删除（缩放拖右下角手柄）",
    hintNotion: "行首输入 / 或用左侧 + 号插入图片；选中后出现图片条",
    presets: ["basic", "full", "notion"],
  },
  {
    id: "video",
    group: "媒体",
    label: "视频",
    hint: "顶栏插入视频；选中后上下文条可预览播放",
    hintNotion: "行首输入 / 或用左侧 + 号插入视频",
    presets: ["full", "notion"],
  },
  {
    id: "imageToolbar",
    group: "媒体",
    label: "图片上下文条",
    hint: "选中图片后出现对齐 / 预览 / 删除控件；缩放用图片右下角手柄",
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
    hintNotion: "行首输入 / 或用左侧 + 号插入表格；单元格内出现表格操作条",
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
    hintNotion: "行首输入 / 插入公式块，或 Ctrl/Cmd+M 插入行内公式",
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
    hint: "顶栏开关大纲；右上角目录面板点击跳转标题（收起时点右上角把手展开）",
    hintNotion: "右上角大纲把手展开面板，点击跳转标题（无顶栏开关）",
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
    hint: "块行首输入 / 选择块类型",
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
    hint: "notion 方案：行首输入 / 选择「标注」；或行首输入 > 加空格触发 Markdown 转标注",
    presets: ["notion"],
  },
  {
    id: "notionToggle",
    group: "块编辑",
    label: "折叠列表",
    hint: "行首输入 / 选择「折叠列表」插入可展开块",
    presets: ["notion"],
  },
  {
    id: "notionColumn",
    group: "块编辑",
    label: "分栏",
    hint: "行首输入 / 选择「分栏」插入双列布局",
    presets: ["notion"],
  },
  {
    id: "notionEmbed",
    group: "块编辑",
    label: "嵌入 / 书签",
    hint: "行首输入 / 选择「嵌入/书签」插入外部链接卡片",
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
    group: "编辑",
    label: "浮动菜单",
    hint: "选中非空文本后在选区旁弹出：标题、格式、颜色、链接、列表（AI 开启时含 AI）",
    presets: ["full", "notion"],
  },
  {
    id: "ai",
    group: "智能",
    label: "AI 辅助",
    hint: "选中文字后用浮动菜单或顶栏「智能」区的 AI；API Key 在 AI 设置里配（也可设 VITE_AI_DEMO_MODE 体验演示流）",
    hintNotion: "选中文字后用浮动菜单里的 AI；AI 设置菜单项也在该按钮的下拉里（notion 无顶栏）",
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
<p>Notion 方案：无固定顶栏/底栏，依赖选区旁的浮动菜单、<code>/</code> 与左侧手柄。</p>
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
