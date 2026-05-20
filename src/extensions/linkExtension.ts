/**
 * Shared Link extension factory — used by Full and Inline extension builders
 */
import { Link } from "@tiptap/extension-link";

import { normalizeSafeUrl } from "@/utils/safeUrl";

export function createLinkExtension() {
  return Link.configure({
    openOnClick: true,
    protocols: ["http", "https", "mailto", "tel"],
    isAllowedUri: (url) => normalizeSafeUrl(url) !== null,
    HTMLAttributes: {
      target: "_blank",
      rel: "noopener noreferrer",
    },
  });
}
