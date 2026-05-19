import type { DemoMessages } from "./types";

export const demoEnUS: DemoMessages = {
  demo: {
    appTitle: "Yaniv Editor Examples",
    subtitle: {
      fullEditor: "Full editor example with theme switching",
      inlinePlugins: "Inline editor with hot-swappable feature plugins",
    },
    nav: {
      fullEditor: "Full Editor",
      inlinePlugins: "Inline + Plugins",
    },
    navAriaLabel: "Examples",
    theme: {
      dark: "Dark",
      light: "Light",
      switchToDark: "Switch to Dark",
      switchToLight: "Switch to Light",
    },
    themePreset: {
      default: "Default Style",
      word: "Word Style",
      notion: "Notion Style",
      github: "GitHub Style",
      typora: "Typora Style",
      custom: "Custom",
    },
    themeMode: {
      light: "Light",
      dark: "Dark",
      auto: "System",
    },
    locale: {
      enUS: "English",
      zhCN: "简体中文",
      zhTW: "繁體中文",
    },
    inline: {
      sampleContent: `<h2>Inline Editor</h2>
<p>A <strong>compact</strong> rich-text editor built for <em>embedded surfaces</em>—comment boxes, chat bubbles, table cells, and card descriptions—without the weight of a full-page editor.</p>
<h3>Pluggable Toolbar</h3>
<p>The <strong>Feature Plugins</strong> panel on the right supports <strong>hot-swapping</strong>: toggle plugins and the toolbar above updates <em>instantly</em>. Try Minimal / Writer / Standard / Full presets, or mix your own set.</p>
<ul>
  <li><strong>Text format</strong>: bold, italic, underline, strikethrough</li>
  <li><strong>Headings &amp; lists</strong>: multi-level titles, bullet, numbered, and task lists</li>
  <li><strong>Font size &amp; alignment</strong>: fine-tune paragraph layout</li>
  <li><strong>Links &amp; code blocks</strong>: insert hyperlinks or highlighted code snippets</li>
</ul>
<blockquote>
  <p><strong>Tip:</strong> Enable Alignment, Link, or Code Block from the panel, then select text to use those tools.</p>
</blockquote>
<p>Keep editing below to feel how <strong>lightweight and customizable</strong> inline editing can be—trim tools to the scenario and keep the UI clean.</p>`,
      emptyToolbar: "Toggle plugins from the panel to add toolbar features",
      stats: "{characters} characters · {words} words",
      pluginsActive: "{enabled}/{total} plugins active",
      panel: {
        title: "Feature Plugins",
        allOn: "All On",
        allOff: "All Off",
      },
      presets: {
        minimal: "Minimal",
        writer: "Writer",
        standard: "Standard",
        full: "Full",
      },
      plugins: {
        undoRedo: { name: "Undo / Redo", description: "History navigation" },
        heading: { name: "Heading", description: "H1-H6 titles" },
        textFormat: { name: "Text Format", description: "Bold, italic, underline, strike" },
        fontSize: { name: "Font Size", description: "Adjust text size" },
        list: { name: "Lists", description: "Bullet, numbered, task list" },
        align: { name: "Alignment", description: "Left, center, right, justify" },
        link: { name: "Link", description: "Insert hyperlinks" },
        codeBlock: { name: "Code Block", description: "Syntax highlighted code" },
        formatClear: { name: "Clear Format", description: "Remove all formatting" },
      },
    },
  },
};
