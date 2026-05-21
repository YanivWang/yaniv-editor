export interface DemoEntry {
  id: string;
  title: string;
  description: string;
  routeName: "full-editor" | "inline-editor" | "inline-compose" | "multi-instance";
  tags: string[];
  highlights: string[];
}

export const DEMO_ENTRIES: DemoEntry[] = [
  {
    id: "full-editor",
    title: "完整编辑器",
    description:
      "YanivEditor 文档级接入：可切换 preset、外观、颜色与预览模式，体验表格、AI、块编辑等完整能力。",
    routeName: "full-editor",
    tags: ["YanivEditor", "preset", "appearance"],
    highlights: [
      "preset / features 覆盖 / 预览 / 六套外观",
      "集成 API + Custom 外观 custom-appearance-vars",
      "全量工具栏与块编辑能力指引",
    ],
  },
  {
    id: "inline-editor",
    title: "行内编辑器",
    description: "YanivInlineEditor 开箱即用：toolbar 与扩展自动同步，适合评论框、私信等轻量场景。",
    routeName: "inline-editor",
    tags: ["YanivInlineEditor", "toolbar"],
    highlights: [
      "toolbar 全项开关 + 编辑/预览",
      "v-model:content、placeholder",
      "对齐 / 链接 / 代码块 / 清除格式 / 字体",
    ],
  },
  {
    id: "inline-compose",
    title: "行内自行拼装",
    description: "自管 Editor 生命周期，按需挂载 UndoRedo、标题、格式、列表等工具栏组件。",
    routeName: "inline-compose",
    tags: ["Editor", "buildExtensions"],
    highlights: [
      "按需挂载工具栏组件（含 Align / Link 等）",
      "toolbar 开关驱动 resolveInlineGates + buildExtensions",
      "编辑/预览与 Full 行内能力对齐",
    ],
  },
  {
    id: "multi-instance",
    title: "多实例隔离",
    description:
      "同页并排两个 YanivEditor，分别切换 locale / appearance / colorMode，验证实例级 i18n 与外观互不影响。",
    routeName: "multi-instance",
    tags: ["locale", "appearance", "isolation"],
    highlights: [
      "A 中文 + 亮色 Custom，B English + 暗色 Custom",
      "实时探测 data-color-mode 与 --ye-primary",
      "架构验收：scoped locale + useEditorAppearance 实例 Map",
    ],
  },
];

export function getDemoEntry(id: DemoEntry["id"]): DemoEntry | undefined {
  return DEMO_ENTRIES.find((e) => e.id === id);
}
