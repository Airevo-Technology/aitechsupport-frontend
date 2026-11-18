// Turns Quill's semantic HTML back into email-safe HTML: Quill drops inline
// `style` attributes, but mail clients need them (no external CSS). The defaults
// below mirror the seeded templates (backend alembic a1b2c3d4e5f6 / app/core/email.py).

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const STYLES: Record<string, string> = {
  p: `margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.65;color:#334155;`,
  h1: `margin:0 0 14px;font-family:${FONT};font-size:20px;font-weight:700;line-height:1.3;color:#0f172a;`,
  h2: `margin:0 0 12px;font-family:${FONT};font-size:17px;font-weight:700;line-height:1.35;color:#0f172a;`,
  ul: `margin:0 0 14px;padding-left:22px;font-family:${FONT};font-size:15px;line-height:1.65;color:#334155;`,
  ol: `margin:0 0 14px;padding-left:22px;font-family:${FONT};font-size:15px;line-height:1.65;color:#334155;`,
  li: `margin:0 0 6px;`,
  a: `color:#4f46e5;text-decoration:underline;`,
};

/** Class Quill's raw-HTML block embed uses; unwrapped on output. */
export const RAW_HTML_CLASS = "ql-rawhtml";

export function emailize(quillHtml: string): string {
  const doc = new DOMParser().parseFromString(`<body>${quillHtml}</body>`, "text/html");
  const root = doc.body;

  // Raw blocks (e.g. the CTA button table) go back out exactly as they came in.
  root.querySelectorAll(`.${RAW_HTML_CLASS}`).forEach((el) => {
    const frag = doc.createDocumentFragment();
    while (el.firstChild) frag.appendChild(el.firstChild);
    el.replaceWith(frag);
  });

  // Quill 2 emits every list as <ol> with a per-item data-list type.
  root.querySelectorAll("ol").forEach((ol) => {
    const first = ol.querySelector("li");
    if (first?.getAttribute("data-list") === "bullet") {
      const ul = doc.createElement("ul");
      while (ol.firstChild) ul.appendChild(ol.firstChild);
      ol.replaceWith(ul);
    }
  });
  root.querySelectorAll(".ql-ui").forEach((el) => el.remove());

  // Quill turns an element's own inline colour/weight into wrapper tags. Drop a wrapper that is the
  // block's only child and merely repeats what the block already says; keep it if it differs.
  const hex = (c: string): string => {
    const m = c.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    return m ? "#" + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, "0")).join("") : c.trim().toLowerCase();
  };
  const unwrap = (el: Element) => {
    const frag = doc.createDocumentFragment();
    while (el.firstChild) frag.appendChild(el.firstChild);
    el.replaceWith(frag);
  };
  root.querySelectorAll("p,h1,h2").forEach((block) => {
    const only = block.children.length === 1 && block.childNodes.length === 1 ? block.children[0] : null;
    if (!only) return;
    const tag = block.tagName.toLowerCase();
    const target = /color:\s*(#[0-9a-f]{6})/i.exec(STYLES[tag])?.[1]?.toLowerCase();
    const styleAttr = (only.getAttribute("style") ?? "").trim();
    const own = /^color:\s*([^;]+);?$/i.exec(styleAttr)?.[1];
    const sameColour = !styleAttr || (!!own && hex(own) === target);
    if (only.tagName === "STRONG" && tag !== "p" && sameColour) unwrap(only); // headings are already bold
    else if (only.tagName === "SPAN" && own && hex(own) === target) unwrap(only);
  });

  const apply = (el: Element) => {
    const base = STYLES[el.tagName.toLowerCase()];
    if (base && !el.getAttribute("style")) el.setAttribute("style", base);
    el.removeAttribute("class");
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
    el.removeAttribute("data-list");
  };
  root.querySelectorAll("*").forEach(apply);

  // Links keep their destination safe in clients that open in-app.
  root.querySelectorAll("a[href]").forEach((a) => {
    if (!a.getAttribute("target")) a.setAttribute("target", "_blank");
    a.removeAttribute("rel");
  });

  // Trim empty paragraphs at either end (Quill always keeps a trailing one).
  const isEmpty = (el: Element | null) => !!el && el.tagName === "P" && !el.textContent?.trim() && !el.querySelector("img,table");
  while (isEmpty(root.lastElementChild)) root.lastElementChild!.remove();
  while (isEmpty(root.firstElementChild)) root.firstElementChild!.remove();

  return root.innerHTML;
}
