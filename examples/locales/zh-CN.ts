import type { DemoMessages } from "./types";

export const demoZhCN: DemoMessages = {
  demo: {
    appTitle: "Yaniv Editor 示例",
    subtitle: {
      fullEditor: "完整编辑器示例，支持主题切换",
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
      default: "默认风格",
      word: "Word 风格",
      notion: "Notion 风格",
      github: "GitHub 风格",
      typora: "Typora 风格",
      custom: "自定义",
    },
    themeMode: {
      light: "浅色",
      dark: "深色",
      auto: "跟随系统",
    },
    locale: {
      enUS: "English",
      zhCN: "简体中文",
      zhTW: "繁體中文",
    },
    inline: {
      sampleContent: `<h2>行内编辑器</h2>
<p>这是一款<strong>紧凑型</strong>富文本编辑器，专为<em>嵌入场景</em>设计——评论框、聊天气泡、表格单元格、卡片描述等，无需整页编辑器也能完成格式化写作。</p>
<h3>可插拔工具栏</h3>
<p>右侧「功能插件」面板支持<strong>实时热插拔</strong>：开启或关闭插件后，上方工具栏会<em>即时更新</em>。试试「精简 / 写作 / 标准 / 完整」预设，或自由组合你需要的功能。</p>
<ul>
  <li><strong>文本格式</strong>：粗体、斜体、下划线、删除线</li>
  <li><strong>标题与列表</strong>：多级标题，无序 / 有序 / 任务列表</li>
  <li><strong>字号与对齐</strong>：灵活控制段落排版</li>
  <li><strong>链接与代码块</strong>：插入超链接或高亮代码片段</li>
</ul>
<blockquote>
  <p><strong>提示：</strong>在右侧面板开启「对齐」「链接」「代码块」等插件后，选中文字即可使用对应工具。</p>
</blockquote>
<p>在下方继续编辑，体验<strong>轻量、可定制</strong>的行内编辑——按场景裁剪工具，保持界面整洁。</p>`,
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
