import { Node, mergeAttributes } from "@tiptap/core";

import { normalizeSafeFrameUrl, normalizeSafeMediaUrl, normalizeSafeUrl } from "@/utils/safeUrl";

export type EmbedProvider = "bookmark" | "iframe";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      setEmbed: (options: {
        url: string;
        title?: string;
        description?: string;
        image?: string | null;
        provider?: EmbedProvider;
      }) => ReturnType;
    };
  }
}

function resolveEmbedProvider(url: string): EmbedProvider {
  if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com|figma\.com/i.test(url)) {
    return "iframe";
  }
  return "bookmark";
}

/**
 * 解析可嵌入的 iframe 地址；不可安全嵌入时返回 `null`（调用方降级为 bookmark 卡片）。
 *
 * `provider` 是节点属性，可由粘贴的 JSON 或 `setEmbed({ provider: "iframe" })` 直接指定，
 * 因此 `resolveEmbedProvider` 的域名判断**不能**作为安全边界——真正的边界是这里的
 * `normalizeSafeFrameUrl`（仅放行 http/https）。
 */
function resolveIframeSrc(url: string): string | null {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/i);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;

  if (/vimeo\.com/i.test(url)) {
    const id = url.split("/").pop();
    if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
  }

  return normalizeSafeFrameUrl(url);
}

export const Embed = Node.create({
  name: "embed",

  group: "block",

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      url: { default: null },
      title: { default: "" },
      description: { default: "" },
      image: { default: null },
      provider: { default: "bookmark" as EmbedProvider },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "embed",
        class: "embed-block",
      }),
    ];
  },

  addCommands() {
    return {
      setEmbed:
        (options) =>
        ({ chain }) => {
          const provider = options.provider ?? resolveEmbedProvider(options.url);
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                url: options.url,
                title: options.title ?? options.url,
                description: options.description ?? "",
                image: options.image ?? null,
                provider,
              },
            })
            .run();
        },
    };
  },

  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "embed-block embed-wrapper";
      dom.dataset.type = "embed";
      dom.contentEditable = "false";

      const renderBookmark = () => {
        dom.replaceChildren();
        const card = document.createElement("a");
        card.className = "embed-block__bookmark";
        // 未通过白名单的地址退化为不可点击的卡片，避免 javascript: 点击执行
        const safeHref = normalizeSafeUrl(String(node.attrs.url ?? ""));
        if (safeHref) {
          card.href = safeHref;
          card.target = "_blank";
          card.rel = "noopener noreferrer";
        }

        const safeImage = node.attrs.image
          ? normalizeSafeMediaUrl(String(node.attrs.image), "image")
          : null;
        if (safeImage) {
          const image = document.createElement("img");
          image.className = "embed-block__image";
          image.src = safeImage;
          image.alt = node.attrs.title || "";
          card.appendChild(image);
        }

        const body = document.createElement("div");
        body.className = "embed-block__body";

        const title = document.createElement("div");
        title.className = "embed-block__title";
        title.textContent = node.attrs.title || node.attrs.url || "";

        const description = document.createElement("div");
        description.className = "embed-block__description";
        description.textContent = node.attrs.description || node.attrs.url || "";

        body.appendChild(title);
        if (node.attrs.description) body.appendChild(description);
        card.appendChild(body);
        dom.appendChild(card);
      };

      const renderIframe = () => {
        const src = resolveIframeSrc(String(node.attrs.url ?? ""));
        // 地址不可安全嵌入时退化为 bookmark 卡片，而不是渲染一个空/危险的 iframe
        if (!src) {
          renderBookmark();
          return;
        }

        dom.replaceChildren();
        const iframe = document.createElement("iframe");
        iframe.className = "embed-block__iframe";
        iframe.src = src;
        // 第三方内容按最小权限沙箱运行：允许脚本与同源读取以便播放器工作，
        // 但禁止其导航顶层窗口、弹窗、下载与表单提交
        iframe.setAttribute(
          "sandbox",
          "allow-scripts allow-same-origin allow-presentation allow-popups-to-escape-sandbox",
        );
        // 用 setAttribute 而非 IDL 属性：部分环境（含 jsdom）不反射这两个属性到 DOM
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        iframe.setAttribute("loading", "lazy");
        // 仅保留播放所需能力；移除 accelerometer / gyroscope / clipboard-write 等传感器与剪贴板权限
        iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        iframe.allowFullscreen = true;
        iframe.title = node.attrs.title || "Embedded content";
        dom.appendChild(iframe);
      };

      if (node.attrs.provider === "iframe") {
        renderIframe();
      } else {
        renderBookmark();
      }

      dom.addEventListener("click", () => {
        const pos = typeof getPos === "function" ? getPos() : null;
        if (pos == null) return;
        editor.commands.setNodeSelection(pos);
      });

      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value != null) dom.setAttribute(key, String(value));
      });

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== "embed") return false;
          if (updatedNode.attrs.provider === "iframe") {
            renderIframe();
          } else {
            renderBookmark();
          }
          return true;
        },
      };
    };
  },
});

export { resolveEmbedProvider };
