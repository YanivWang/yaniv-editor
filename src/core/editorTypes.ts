/**
 * Yaniv Editor Types
 * @description Full Editor public API types
 */
import type { TemplateItem } from "@/components/editor/template/templates";
import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";
import type { MentionItem } from "@/extensions/mention";
import type { AiProvider, AiStorageMode } from "@/features/ai/config/types";

import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/vue-3";

/** 集成方通过 YanivEditor `ai-config` 注入的 AI 配置（不写入 localStorage） */
export interface YanivEditorAiConfig {
  provider: AiProvider;
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeout?: number;
  enabled?: boolean;
  /** @default 'memory' */
  storageMode?: AiStorageMode;
  /** 是否显示工具栏「AI 设置」菜单项；有 ai-config 时默认 false */
  showSettings?: boolean;
  /**
   * 未配置 API Key 时是否走**模拟 AI 流**（演示用）。可以单独传，不必同时给 `provider`。
   *
   * ⚠ 这是接入方**唯一真正可用**的演示开关。构建期 `VITE_AI_DEMO_MODE` 对**已发布的 npm 包
   * 无效**——vite 在库构建时就把 `import.meta.env.VITE_*` 静态替换成字面量，冻结的是发布者
   * 机器上的值（`0.3.0` 因此把 demo 模式恒开发了出去，见 CHANGELOG 0.3.1 / 0.3.2）。
   */
  demoMode?: boolean;
  /**
   * 送进 AI 上下文的文档全文字符上限，超出即截断并提示用户。
   *
   * 单位是**字符**不是 token：项目同时支持 openai / aliyun / ollama 且模型可配，
   * 各家 tokenizer 不同，没有统一换算。默认 8000，按实际用的模型调整；
   * 传 0 或负数关闭这个保护（超长文档可能让请求 400 失败）。
   * @default 8000
   */
  documentContextLimit?: number;
}

export interface GalleryImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export type MediaUploadHandler = (file: File) => Promise<string>;

export type EditorMode = "edit" | "preview";
export type EditorPreset = "basic" | "full" | "notion";

/**
 * 能力级功能覆盖。
 * @description preset 提供默认能力，features 只负责显式覆盖能力开关。
 */
export interface FeatureConfig {
  /** 是否启用图片扩展、粘贴图片与上下文工具栏 */
  image?: boolean;
  /** 是否启用视频扩展与上下文工具栏 */
  video?: boolean;
  /** 是否启用表格功能 */
  table?: boolean;
  /** 是否注册数学公式扩展 */
  math?: boolean;
  /** 是否注册 AI 相关扩展 */
  ai?: boolean;
  /** 是否注册格式刷扩展 */
  formatPainter?: boolean;
  /** 标题锚点 UniqueID + 目录（TableOfContents）扩展 */
  outline?: boolean;
  /** 查找替换扩展 */
  searchReplace?: boolean;
  /** 强化 Office/WPS HTML 粘贴 */
  officePaste?: boolean;
  /** 是否启用斜杠命令菜单（输入 / 弹出块类型选择） */
  slashCommand?: boolean;
  /** 是否启用左侧六点拖拽手柄（块添加、菜单与拖拽排序） */
  dragHandle?: boolean;
}

/**
 * 编辑器 Props
 */
export interface YanivEditorProps {
  /** 运行状态：编辑或内容展示 */
  mode?: EditorMode;
  /** Full Editor 功能方案 */
  preset?: EditorPreset;
  /** 视觉外观 */
  appearance?: EditorAppearance;
  /** custom 外观的 CSS 变量（实例级，不污染全局） */
  customAppearanceVars?: Record<string, string>;
  /**
   * 浮层 z-index 基准值，映射为编辑器根节点上的 `--ye-z-base`。
   * 宿主页面有高层级 UI（如 Ant Design Modal）时可提高此值；默认 1000。
   */
  zIndexBase?: number;
  /** 亮色、暗色或跟随系统 */
  colorMode?: EditorColorMode;
  /** 初始内容 — HTML 字符串或 ProseMirror JSON（type: doc） */
  initialContent?: string | JSONContent;
  /** 能力开关覆盖 */
  features?: FeatureConfig;
  /** 图片上传函数；未传时本地上传回退为 `blob:` 对象 URL（刷新即失效，仅供预览） */
  uploadImage?: MediaUploadHandler;
  /** 视频上传函数；未传时本地上传回退为 `blob:` 对象 URL（刷新即失效，仅供预览） */
  uploadVideo?: MediaUploadHandler;
  /** 外部图库图片源；未传时图库从当前文档收集图片 */
  galleryImages?: GalleryImage[];
  /** 自定义模板列表，会追加到内置模板后面 */
  customTemplates?: TemplateItem[];
  /**
   * `@` 提及的候选项（页面 / 人员）；slashCommand 能力开启时生效。
   * 未传时使用内置占位示例数据。变更不触发 session 重建（扩展经 getter 现取）。
   */
  mentionItems?: MentionItem[];
  /** 语言设置 */
  locale?: string;
  /** 大纲面板初始是否展开；outline 能力开启时生效，默认 false */
  defaultOutlineExpanded?: boolean;
  /**
   * 集成方注入的 AI 配置；传入后完全托管（忽略 localStorage 与 .env），默认隐藏「AI 设置」
   */
  aiConfig?: YanivEditorAiConfig;
}

/**
 * 编辑器暴露的方法
 */
export interface YanivEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
