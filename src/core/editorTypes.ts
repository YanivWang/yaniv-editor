/**
 * TiptapPro Tenant Editor Types
 * @description 编辑器类型定义（支持版本配置）
 */
import type { JSONContent } from "@tiptap/core";
import type { Editor } from "@tiptap/vue-3";

/**
 * 版本类型
 */
export type EditorVersion = "basic" | "advanced" | "premium";

/**
 * 编辑器功能配置
 */
export interface FeatureConfig {
  /** 是否启用表格功能 */
  table?: boolean;
  /** 是否注册数学公式扩展（默认 true；false 时移除公式能力） */
  math?: boolean;
  /** 是否注册 AI 相关扩展（默认 true；也可由 versionConfig.features.ai 关闭） */
  ai?: boolean;
  /** 是否注册格式刷扩展（默认随版本：basic 为 false，advanced/premium 为 true；可显式覆盖） */
  formatPainter?: boolean;
  /** 标题锚点 UniqueID + 目录（TableOfContents）扩展；进阶版默认开，协作中会由扩展层跳过 */
  outline?: boolean;
  /** 查找替换扩展 */
  searchReplace?: boolean;
  /** 强化 Office/WPS HTML 粘贴；默认开启，显式 false 关闭 */
  officePaste?: boolean;
  /** 是否启用表格工具栏（默认关闭，需显式开启） */
  tableToolbar?: boolean;
  /** 是否启用@提及功能 */
  mention?: boolean;
  /** 是否启用斜杠命令菜单（输入 / 弹出块类型选择） */
  slashCommand?: boolean;
  /** 是否启用悬浮框功能 */
  floatingMenu?: boolean;
  /** 是否启用图片工具栏功能 */
  image?: boolean;
  /** 是否启用链接悬浮框功能 */
  linkBubbleMenu?: boolean;
  /** 是否启用头部导航 */
  headerNav?: boolean;
  /** 是否启用底部导航 */
  footerNav?: boolean;
  /** 底部状态栏是否显示常用快捷键说明（与缩放、字数并列）；默认 true */
  statusShortcutHints?: boolean;
}

/**
 * 版本配置接口
 */
export interface VersionConfig {
  /** 版本类型（基础版/进阶版/高级版） */
  version?: EditorVersion;
  /** 功能开关配置 */
  features?: {
    /** 基础版功能 */
    basic?: boolean;
    /** 进阶版功能 */
    advanced?: boolean;
    /** AI功能 */
    ai?: boolean;
    /** 头部导航 */
    headerNav?: boolean;
    /** 底部导航 */
    footerNav?: boolean;
    /** 预览模式 */
    previewMode?: boolean;
  };
}

/**
 * 编辑器 Props
 */
export interface TiptapProEditorProps {
  /** 版本配置 */
  version?: EditorVersion;
  /** 版本配置对象（与 version 二选一） */
  versionConfig?: VersionConfig;
  /** 缩放条位置：底部固定或工具栏下方 */
  zoomBarPlacement?: "bottom" | "belowToolbar";
  /** 是否为只读模式 */
  readonly?: boolean;
  /** 是否为预览模式（无头部/底部导航，不可编辑，不可点击） */
  previewMode?: boolean;
  /** 文档ID(用于加载和保存以及协同房间) */
  documentId?: string;
  /** 初始内容 - 可以是 HTML 字符串或 JSON 对象（ProseMirror 格式） */
  initialContent?: string | object;
  /** 表格悬浮框显示模式：1=聚焦显示；2=单元格选中显示 */
  tableMenuShowMode?: 1 | 2;
  /** 功能配置（兼容旧版） */
  features?: FeatureConfig;
  /** 语言设置 */
  locale?: string;
}

/**
 * 编辑器实例引用
 */
export interface EditorInstance {
  editor: Editor | null;
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}

/**
 * 编辑器暴露的方法
 */
export interface TiptapProEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
