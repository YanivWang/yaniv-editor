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
    landing: {
      hero: {
        subtitle: "面向 Vue 3 的生产级 AI 富文本编辑器",
        starGithub: "在 GitHub 上 Star",
        openSource: "🔥 开源",
        tryDemo: "在线体验",
        viewGithub: "在 GitHub 查看",
      },
      stats: {
        themes: "主题",
        features: "功能",
        languages: "语言",
        free: "免费",
      },
      features: {
        title: "为什么选择 Yaniv Editor？",
        themes: {
          title: "5 款精美主题",
          description: "从 Notion 风格到 Word 风格，每款主题均完美支持深色模式。",
        },
        ai: {
          title: "AI 赋能",
          description: "智能写作辅助：续写、润色、翻译与摘要。",
        },
        darkMode: {
          title: "完美深色模式",
          description: "明暗主题无缝切换，每个细节在两种模式下都表现出色。",
        },
        wordMode: {
          title: "Word 模式",
          description: "专业 A4 纸张布局，支持自动分页的文档编辑体验。",
        },
        i18n: {
          title: "国际化就绪",
          description: "内置简体中文、繁体中文与英文支持。",
        },
      },
      themes: {
        title: "探索主题",
        subtitle: "为你的应用选择最合适的主题",
        word: { name: "Word", description: "专业文档风格，A4 布局" },
        notion: { name: "Notion", description: "现代、无干扰的写作体验" },
        github: { name: "GitHub", description: "开发者友好的 Markdown 风格" },
        typora: { name: "Typora", description: "优雅的阅读与写作体验" },
        default: { name: "默认", description: "简洁极简设计" },
      },
      tech: {
        title: "基于现代技术构建",
      },
      cta: {
        title: "准备开始？",
        subtitle: "通过 npm 安装，几分钟内即可构建出色的编辑器",
        copyTitle: "复制到剪贴板",
        tryDemo: "在线体验",
      },
      footer: {
        text: "由开源社区用 ❤️ 打造",
        github: "GitHub",
        issues: "Issues",
        license: "MIT 许可证",
      },
    },
  },
};
