"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type QuillType from "quill";
import "quill/dist/quill.snow.css";
import { emailize, RAW_HTML_CLASS } from "@/lib/emailStyles";

export type EmailBodyEditorHandle = { insertText: (text: string) => void };

type Props = {
  /** Initial HTML. Not re-read after mount — remount (change `key`) to load new content. */
  initialHtml: string;
  /** Called with email-safe HTML, only when the user edits (never on load). */
  onChange: (html: string) => void;
};

let registered = false;

/* Quill's blot/format registry is untyped (`Quill.import` returns unknown), so a few `any`s are unavoidable here. */
/* eslint-disable @typescript-eslint/no-explicit-any */

/** One-time Quill setup: a table-preserving block + `{variable}` placeholders as link targets. */
function setup(Quill: typeof QuillType) {
  if (registered) return;
  registered = true;

  const BlockEmbed = Quill.import("blots/block/embed") as any;
  class RawHtmlBlot extends BlockEmbed {
    static blotName = "rawhtml";
    static tagName = "div";
    static className = RAW_HTML_CLASS;
    static create(value: string) {
      const node = super.create() as HTMLElement;
      node.setAttribute("contenteditable", "false");
      node.innerHTML = value;
      return node;
    }
    static value(node: HTMLElement) {
      return node.innerHTML;
    }
  }
  Quill.register(RawHtmlBlot as any, true);

  // Quill rewrites unknown link targets to "about:blank"; keep {placeholders}.
  const Link = Quill.import("formats/link") as any;
  const sanitize = Link.sanitize.bind(Link);
  Link.sanitize = (url: string) => (/^\{[a-z_]+\}$/i.test(url.trim()) ? url.trim() : sanitize(url));
}

/* eslint-enable @typescript-eslint/no-explicit-any */

const EmailBodyEditor = forwardRef<EmailBodyEditorHandle, Props>(function EmailBodyEditor({ initialHtml, onChange }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<QuillType | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useImperativeHandle(ref, () => ({
    insertText(text: string) {
      const q = quillRef.current;
      if (!q) return;
      q.focus();
      const at = q.getSelection()?.index ?? Math.max(q.getLength() - 1, 0);
      q.insertText(at, text, "user");
      q.setSelection(at + text.length, 0, "silent");
    },
  }));

  useEffect(() => {
    let disposed = false;
    let instance: QuillType | null = null;
    const host = hostRef.current;

    (async () => {
      const { default: Quill } = await import("quill");
      if (disposed || !hostRef.current) return;
      setup(Quill);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Delta = Quill.import("delta") as any;
      const el = hostRef.current;
      el.innerHTML = "";
      const mount = document.createElement("div");
      el.appendChild(mount);

      instance = new Quill(mount, {
        theme: "snow",
        placeholder: "Write the email…",
        modules: {
          toolbar: [
            [{ header: [1, 2, false] }],
            ["bold", "italic", "underline"],
            ["link"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["clean"],
          ],
          // Tables (e.g. the CTA button) can't be edited visually — keep them intact as blocks.
          clipboard: {
            matchers: [["table", (node: HTMLElement) => new Delta().insert({ rawhtml: node.outerHTML })]],
          },
        },
      });
      quillRef.current = instance;

      instance.setContents(instance.clipboard.convert({ html: initialHtml }), "silent");
      instance.history.clear();

      instance.on("text-change", (_d, _o, source) => {
        if (source !== "user" || !quillRef.current) return;
        onChangeRef.current(emailize(quillRef.current.root.innerHTML));
      });
    })();

    return () => {
      disposed = true;
      quillRef.current = null;
      instance?.off("text-change");
      if (host) host.innerHTML = "";
    };
    // initialHtml is intentionally read once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={hostRef}
      className={[
        "overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-slate-700",
        "[&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200",
        "[&_.ql-container]:border-0 [&_.ql-container]:text-[15px]",
        "[&_.ql-editor]:min-h-[260px] [&_.ql-editor]:bg-white [&_.ql-editor]:text-slate-700",
        // literal on purpose (must equal RAW_HTML_CLASS): Tailwind can't see interpolated class names
        "[&_.ql-rawhtml]:my-2 [&_.ql-rawhtml]:rounded-md [&_.ql-rawhtml]:border [&_.ql-rawhtml]:border-dashed [&_.ql-rawhtml]:border-slate-300 [&_.ql-rawhtml]:p-2 [&_.ql-rawhtml]:select-none",
      ].join(" ")}
    />
  );
});

export default EmailBodyEditor;
