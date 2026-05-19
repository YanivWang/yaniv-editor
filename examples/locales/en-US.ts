import type { DemoMessages } from "./types";

export const demoEnUS: DemoMessages = {
  demo: {
    appTitle: "Yaniv Editor Examples",
    subtitle: {
      fullEditor: "Full editor example with themes and device preview",
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
      word: "Word Style",
      notion: "Notion Style",
      github: "GitHub Style",
      typora: "Typora Style",
    },
    locale: {
      enUS: "English",
      zhCN: "简体中文",
      zhTW: "繁體中文",
    },
    autoDemo: {
      play: "Watch Auto Demo",
      stop: "Stop",
      replay: "Replay Demo",
    },
    device: {
      desktop: "Desktop",
      tablet: "Tablet (iPad)",
      mobile: "Mobile (iPhone)",
    },
    inline: {
      title: "Inline Editor",
      subtitle: "Compact inline editor with hot-swappable feature plugins",
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
