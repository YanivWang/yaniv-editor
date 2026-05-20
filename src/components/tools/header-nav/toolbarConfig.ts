/**
 * Toolbar Configuration - 工具栏配置类型
 * @description 定义工具栏工具的显示配置
 *
 * 自然换行工具带信息架构：
 * 编辑 | 字体 | 段落 | 插入（链接表图视 | 代码公式）| 文档（Word模板图库）| 工具 | 智能
 */

/**
 * 工具栏工具配置接口
 */
export interface ToolbarToolsConfig {
  /** 是否显示文本格式工具（粗体、斜体、下划线、删除线） */
  textFormat?: boolean;
  /** 是否显示颜色选择器（文本颜色、背景颜色） */
  colorPicker?: boolean;
  /** 是否显示标题下拉菜单 */
  heading?: boolean;
  /** 是否显示列表工具（有序、无序、任务列表） */
  list?: boolean;
  /** 是否显示对齐工具 */
  align?: boolean;
  /** 是否显示图片上传工具 */
  image?: boolean;
  /** 是否显示视频上传工具 */
  video?: boolean;
  /** 是否显示代码块工具 */
  codeBlock?: boolean;
  /** 是否显示链接工具 */
  link?: boolean;
  /** 是否显示表格工具 */
  table?: boolean;
  /** 是否显示撤销/重做工具 */
  undoRedo?: boolean;
  /** 是否显示清除格式工具 */
  clearFormat?: boolean;
  /** 是否显示字体工具 */
  font?: boolean;
  /** 是否显示下标/上标工具 */
  subscriptSuperscript?: boolean;
  /** 是否显示数学公式工具 */
  math?: boolean;
  /** 是否显示格式刷工具 */
  formatPainter?: boolean;
  /** 是否显示 Word 导入/导出工具 */
  word?: boolean;
  /** 是否显示模板插入工具 */
  template?: boolean;
  /** 是否显示图库工具 */
  gallery?: boolean;
  /** 是否显示AI工具 */
  ai?: boolean;
  /** 是否显示查找与替换 */
  searchReplace?: boolean;
  /** 是否显示大纲侧栏开关 */
  outline?: boolean;
}

/**
 * 精简工具栏（基础排版）
 */
export const COMPACT_TOOLBAR_CONFIG: ToolbarToolsConfig = {
  textFormat: true,
  colorPicker: true,
  heading: true,
  list: true,
  align: true,
  image: true,
  video: false,
  codeBlock: false,
  link: false,
  table: false,
  undoRedo: true,
  clearFormat: true,
  font: false,
  subscriptSuperscript: false,
  math: false,
  formatPainter: false,
  word: false,
  template: false,
  gallery: false,
  ai: true,
  searchReplace: false,
  outline: false,
};

/**
 * 完整工具栏
 */
export const FULL_TOOLBAR_CONFIG: ToolbarToolsConfig = {
  textFormat: true,
  colorPicker: true,
  heading: true,
  list: true,
  align: true,
  image: true,
  video: true,
  codeBlock: true,
  link: true,
  table: true,
  undoRedo: true,
  clearFormat: true,
  font: true,
  subscriptSuperscript: true,
  math: true,
  formatPainter: true,
  word: true,
  template: true,
  gallery: true,
  ai: true,
  searchReplace: true,
  outline: true,
};
