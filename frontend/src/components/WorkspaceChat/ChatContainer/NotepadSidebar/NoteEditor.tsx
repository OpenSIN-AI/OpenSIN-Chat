// SPDX-License-Identifier: MIT
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import { UndoRedo } from "@tiptap/extensions";
import Bold from "@tiptap/extension-bold";
import Blockquote from "@tiptap/extension-blockquote";
import BulletList from "@tiptap/extension-bullet-list";
import CodeExtension from "@tiptap/extension-code";
import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Italic from "@tiptap/extension-italic";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextAlign from "@tiptap/extension-text-align";
import Youtube from "@tiptap/extension-youtube";
import {
  ArrowCounterClockwise,
  ArrowClockwise,
  CheckSquare,
  Code,
  Image as ImageIcon,
  Link as LinkIcon,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  Table as TableIcon,
  TextB,
  TextHOne,
  TextHTwo,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
  YoutubeLogo,
} from "@phosphor-icons/react";

const LinkCard = Node.create({
  name: "linkCard",
  group: "block",
  atom: true,
  addAttributes() {
    return { href: { default: "" }, title: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "a[data-link-card]" }];
  },
  renderHTML({ HTMLAttributes }) {
    let host = HTMLAttributes.href;
    try {
      host = new URL(HTMLAttributes.href).hostname.replace(/^www\./, "");
    } catch {
      /* Keep URL. */
    }
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-link-card": "true",
        target: "_blank",
        rel: "noopener noreferrer",
        class: "notepad-link-card",
      }),
      [
        "span",
        { class: "notepad-link-card-title" },
        HTMLAttributes.title || host,
      ],
      ["span", { class: "notepad-link-card-url" }, host],
    ];
  },
});

const emptyDocument = { type: "doc", content: [{ type: "paragraph" }] };

export function parseNoteContent(content?: string) {
  if (!content) return emptyDocument;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "doc") return parsed;
  } catch {
    // Legacy plain text note.
  }
  return {
    type: "doc",
    content: content.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : undefined,
    })),
  };
}

interface NoteEditorProps {
  content: string;
  editable?: boolean;
  placeholder: string;
  onChange?: (value: { content: string; plainText: string }) => void;
}

function ToolButton({
  active = false,
  label,
  onClick,
  children,
  disabled = false,
}: any) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-none transition-colors ${
        active
          ? "bg-theme-text-primary text-theme-bg-primary"
          : "bg-transparent text-theme-text-secondary hover:bg-theme-bg-tertiary hover:text-theme-text-primary"
      } disabled:cursor-not-allowed disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

export default function NoteEditor({
  content,
  editable = true,
  placeholder,
  onChange,
}: NoteEditorProps) {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [insertOpen, setInsertOpen] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const editor = useEditor(
    {
      extensions: [
        // TipTap v3: undo/redo is not bundled unless UndoRedo is registered.
        // Without it, toolbar `editor.can().undo()` throws and breaks "add note".
        UndoRedo,
        Document,
        Paragraph,
        Text,
        Bold,
        Italic,
        Strike,
        Underline,
        CodeExtension,
        CodeBlock,
        Blockquote,
        BulletList,
        OrderedList,
        ListItem,
        Heading.configure({ levels: [1, 2, 3] }),
        HorizontalRule,
        HardBreak,
        Link.configure({
          openOnClick: !editable,
          autolink: true,
          defaultProtocol: "https",
        }),
        Image.configure({ allowBase64: true }),
        Placeholder.configure({ placeholder }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Youtube.configure({
          nocookie: true,
          modestBranding: true,
          controls: true,
        }),
        LinkCard,
      ],
      content: parseNoteContent(content),
      editable,
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: "notepad-prose min-h-full outline-none",
          "aria-label": placeholder,
        },
        handleKeyDown(_view, event) {
          if (
            event.key === "/" &&
            !event.isComposing &&
            event.keyCode !== 229
          ) {
            window.setTimeout(() => setSlashOpen(true), 0);
          }
          if (event.key === "Escape") setSlashOpen(false);
          return false;
        },
        handlePaste(view, event) {
          const file = Array.from(event.clipboardData?.files || []).find(
            (item) => item.type.startsWith("image/"),
          );
          if (file) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = () =>
              editor
                ?.chain()
                .focus()
                .setImage({ src: String(reader.result), alt: file.name })
                .run();
            reader.readAsDataURL(file);
            return true;
          }
          const text = event.clipboardData?.getData("text/plain")?.trim();
          if (
            !text ||
            !/^https?:\/\/\S+$/i.test(text) ||
            !view.state.selection.empty
          )
            return false;
          if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(text)) {
            event.preventDefault();
            editor?.chain().focus().setYoutubeVideo({ src: text }).run();
            return true;
          }
          return false;
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        onChange?.({
          content: JSON.stringify(currentEditor.getJSON()),
          plainText: currentEditor.getText({ blockSeparator: "\n" }),
        });
      },
    },
    [editable],
  );

  const insertLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href || "";
    const url = window.prompt(t('notepad.prompt.linkUrl','Link-URL'), previous);
    if (url === null) return;
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
  }, [editor]);

  const insertMedia = useCallback(
    (kind: "image" | "youtube") => {
      if (!editor) return;
      const url = window.prompt(
        kind === "youtube" ? t('notepad.prompt.youtubeUrl','YouTube-URL') : t('notepad.prompt.imageUrl','Bild-URL'),
      );
      if (!url) return;
      if (kind === "youtube")
        editor.chain().focus().setYoutubeVideo({ src: url }).run();
      else editor.chain().focus().setImage({ src: url }).run();
      setInsertOpen(false);
    },
    [editor],
  );

  const insertLinkCard = useCallback(() => {
    if (!editor) return;
    const url = window.prompt(t('notepad.prompt.linkPreviewUrl','Link für Vorschaukarte'));
    if (!url || !/^https?:\/\//i.test(url)) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: "linkCard", attrs: { href: url } })
      .run();
    setInsertOpen(false);
    setSlashOpen(false);
  }, [editor]);

  const runSlashCommand = (
    command:
      "text" | "h1" | "h2" | "todo" | "image" | "youtube" | "link" | "table",
  ) => {
    if (!editor) return;
    const { from } = editor.state.selection;
    editor
      .chain()
      .focus()
      .deleteRange({ from: Math.max(0, from - 1), to: from })
      .run();
    if (command === "text") editor.chain().focus().setParagraph().run();
    if (command === "h1")
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    if (command === "h2")
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    if (command === "todo") editor.chain().focus().toggleTaskList().run();
    if (command === "image") insertMedia("image");
    if (command === "youtube") insertMedia("youtube");
    if (command === "link") insertLinkCard();
    if (command === "table")
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    setSlashOpen(false);
  };

  const uploadImage = (file?: File) => {
    if (!file || !file.type.startsWith("image/") || file.size > 400_000) return;
    const reader = new FileReader();
    reader.onload = () =>
      editor
        ?.chain()
        .focus()
        .setImage({ src: String(reader.result), alt: file.name })
        .run();
    reader.readAsDataURL(file);
    setInsertOpen(false);
  };

  if (!editor)
    return <div className="flex-1 animate-pulse bg-theme-bg-secondary" />;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-theme-bg-primary">
      {editable && (
        <div
          className="relative flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-theme-modal-border px-2 py-1.5"
          role="toolbar"
          aria-label={t('notepad.toolbar.format','Text formatieren')}
        >
          <ToolButton
            label={t('notepad.toolbar.undo','Rückgängig')}
            disabled={!editor.can().chain().focus().undo().run()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <ArrowCounterClockwise size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.redo','Wiederholen')}
            disabled={!editor.can().chain().focus().redo().run()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <ArrowClockwise size={15} />
          </ToolButton>
          <span className="mx-1 h-4 w-px shrink-0 bg-theme-modal-border" />
          <ToolButton
            label={t('notepad.toolbar.heading1','Überschrift 1')}
            active={editor.isActive("heading", { level: 1 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <TextHOne size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.heading2','Überschrift 2')}
            active={editor.isActive("heading", { level: 2 })}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <TextHTwo size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.bold','Fett')}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <TextB size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.italic','Kursiv')}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <TextItalic size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.underline','Unterstrichen')}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <TextUnderline size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.strikethrough','Durchgestrichen')}
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <TextStrikethrough size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.bulletList','Aufzählung')}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <ListBullets size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.orderedList','Nummerierte Liste')}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListNumbers size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.todo','Todo')}
            active={editor.isActive("taskList")}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            <CheckSquare size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.blockquote','Zitat')}
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quotes size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.codeBlock','Codeblock')}
            active={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code size={15} />
          </ToolButton>
          <ToolButton
            label={t('notepad.toolbar.link','Link')}
            active={editor.isActive("link")}
            onClick={insertLink}
          >
            <LinkIcon size={15} />
          </ToolButton>
          <div className="relative">
            <ToolButton
              label={t('notepad.toolbar.insertContent','Inhalt einfügen')}
              active={insertOpen}
              onClick={() => setInsertOpen((value) => !value)}
            >
              +
            </ToolButton>
            {insertOpen && (
              <div className="absolute left-0 top-9 z-50 w-44 rounded-lg border border-theme-modal-border bg-theme-bg-secondary p-1 shadow-xl">
                <button
                  className="notepad-menu-item"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImageIcon size={15} /> {t('notepad.insert.uploadImage','Bild hochladen')}
                </button>
                <button
                  className="notepad-menu-item"
                  onClick={() => insertMedia("image")}
                >
                  <ImageIcon size={15} /> {t('notepad.insert.imageUrl','Bild-URL')}
                </button>
                <button
                  className="notepad-menu-item"
                  onClick={() => insertMedia("youtube")}
                >
                  <YoutubeLogo size={15} /> YouTube
                </button>
                <button className="notepad-menu-item" onClick={insertLinkCard}>
                  <LinkIcon size={15} /> {t('notepad.insert.linkPreview','Link-Vorschau')}
                </button>
                <button
                  className="notepad-menu-item"
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run();
                    setInsertOpen(false);
                  }}
                >
                  <TableIcon size={15} /> {t('notepad.insert.table','Tabelle')}
                </button>
                <button
                  className="notepad-menu-item"
                  onClick={() => {
                    editor.chain().focus().setHorizontalRule().run();
                    setInsertOpen(false);
                  }}
                >
                  <Minus size={15} /> {t('notepad.insert.divider','Trennlinie')}
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={(event) => uploadImage(event.target.files?.[0])}
          />
        </div>
      )}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <EditorContent
          editor={editor}
          className="h-full overflow-y-auto px-5 py-4"
        />
        {editable && slashOpen && (
          <div
            className="absolute left-5 top-3 z-40 grid w-52 gap-1 rounded-xl border border-theme-modal-border bg-theme-bg-secondary p-1.5 shadow-xl"
            role="menu"
            aria-label={t('notepad.slash.insertBlock','Block einfügen')}
          >
            <button
              className="notepad-menu-item"
              onClick={() => runSlashCommand("text")}
            >
              {t('notepad.slash.text','Text')}
            </button>
            <button
              className="notepad-menu-item"
              onClick={() => runSlashCommand("h1")}
            >
              <TextHOne size={15} /> {t('notepad.slash.heading1','Überschrift 1')}
            </button>
            <button
              className="notepad-menu-item"
              onClick={() => runSlashCommand("h2")}
            >
              <TextHTwo size={15} /> {t('notepad.slash.heading2','Überschrift 2')}
            </button>
            <button
              className="notepad-menu-item"
              onClick={() => runSlashCommand("todo")}
            >
              <CheckSquare size={15} /> {t('notepad.slash.todo','Todo')}
            </button>
            <button
              className="notepad-menu-item"
              onClick={() => runSlashCommand("image")}
            >
              <ImageIcon size={15} /> {t('notepad.slash.image','Bild')}
            </button>
            <button
              className="notepad-menu-item"
              onClick={() => runSlashCommand("link")}
            >
              <LinkIcon size={15} /> {t('notepad.slash.linkPreview','Link-Vorschau')}
            </button>
            <button
              className="notepad-menu-item"
              onClick={() => runSlashCommand("youtube")}
            >
              <YoutubeLogo size={15} /> {t('notepad.slash.youtube','YouTube')}
            </button>
            <button
              className="notepad-menu-item"
              onClick={() => runSlashCommand("table")}
            >
              <TableIcon size={15} /> {t('notepad.slash.table','Tabelle')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
