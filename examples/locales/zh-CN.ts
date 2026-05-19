import type { DemoMessages } from "./types";

export const demoZhCN: DemoMessages = {
  demo: {
    appTitle: "Yaniv Editor 示例",
    subtitle: {
      fullEditor: "完整编辑器示例，支持主题与设备预览",
      inlinePlugins: "行内编辑器与可热插拔功能插件",
    },
    nav: {
      fullEditor: "完整编辑器",
      inlinePlugins: "行内 + 插件",
    },
    navAriaLabel: "示例导航",
    theme: {
      dark: "深色",
      light: "浅色",
      switchToDark: "切换到深色模式",
      switchToLight: "切换到浅色模式",
    },
    themePreset: {
      word: "Word 风格",
      notion: "Notion 风格",
      github: "GitHub 风格",
      typora: "Typora 风格",
    },
    locale: {
      enUS: "English",
      zhCN: "简体中文",
      zhTW: "繁體中文",
    },
    autoDemo: {
      play: "观看自动演示",
      stop: "停止",
      replay: "重新播放",
    },
    device: {
      desktop: "桌面",
      tablet: "平板 (iPad)",
      mobile: "手机 (iPhone)",
    },
    inline: {
      title: "行内编辑器",
      subtitle: "紧凑型行内编辑器，支持功能插件热插拔",
      emptyToolbar: "在右侧面板开启插件以显示工具栏功能",
      stats: "{characters} 字符 · {words} 词",
      pluginsActive: "{enabled}/{total} 个插件已启用",
      panel: {
        title: "功能插件",
        allOn: "全部开启",
        allOff: "全部关闭",
      },
      presets: {
        minimal: "精简",
        writer: "写作",
        standard: "标准",
        full: "完整",
      },
      plugins: {
        undoRedo: { name: "撤销 / 重做", description: "历史记录导航" },
        heading: { name: "标题", description: "H1-H6 标题" },
        textFormat: { name: "文本格式", description: "粗体、斜体、下划线、删除线" },
        fontSize: { name: "字号", description: "调整文字大小" },
        list: { name: "列表", description: "无序、有序、任务列表" },
        align: { name: "对齐", description: "左对齐、居中、右对齐、两端对齐" },
        link: { name: "链接", description: "插入超链接" },
        codeBlock: { name: "代码块", description: "语法高亮代码" },
        formatClear: { name: "清除格式", description: "移除所有格式" },
      },
    },
  },
};
