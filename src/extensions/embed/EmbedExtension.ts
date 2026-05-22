import { Node, mergeAttributes } from "@tiptap/core";

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

function resolveIframeSrc(url: string): string {
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/i);
  if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
  if (/vimeo\.com/i.test(url)) {
    const id = url.split("/").pop();
    return id ? `https://player.vimeo.com/video/${id}` : url;
  }
  return url;
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
        card.href = node.attrs.url ?? "#";
        card.target = "_blank";
        card.rel = "noopener noreferrer";

        if (node.attrs.image) {
          const image = document.createElement("img");
          image.className = "embed-block__image";
          image.src = node.attrs.image;
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
        dom.replaceChildren();
        const iframe = document.createElement("iframe");
        iframe.className = "embed-block__iframe";
        iframe.src = resolveIframeSrc(node.attrs.url ?? "");
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
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
