/**
 * Yaniv Editor Types
 * @description Full Editor public API types
 */
import type { TemplateItem } from "@/components/editor/template/templates";
import type { EditorAppearance, EditorColorMode } from "@/configs/editorConfig";
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
  /** 图片上传函数；未传时本地上传回退为 DataURL */
  uploadImage?: MediaUploadHandler;
  /** 视频上传函数；未传时本地上传回退为 DataURL */
  uploadVideo?: MediaUploadHandler;
  /** 外部图库图片源；未传时图库从当前文档收集图片 */
  galleryImages?: GalleryImage[];
  /** 自定义模板列表，会追加到内置模板后面 */
  customTemplates?: TemplateItem[];
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
