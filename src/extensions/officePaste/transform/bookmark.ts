import { parseStyleAttribute, unwrapNode } from "../utils";

export function transformRemoveBookmarks(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const bookmarks = doc.querySelectorAll('[style*="mso-bookmark:"]');
  bookmarks.forEach((node) => {
    const bookmark = parseStyleAttribute(node)["mso-bookmark"];
    if (!bookmark) return;
    const bookmarkLink = Array.from(doc.querySelectorAll("a[name]")).find(
      (el) => el.getAttribute("name") === bookmark,
    );
    if (bookmarkLink) unwrapNode(bookmarkLink);
    unwrapNode(node);
  });

  return doc.documentElement.outerHTML;
}
