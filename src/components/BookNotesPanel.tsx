import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bold,
  Italic,
  List,
  MessageSquarePlus,
  Pencil,
  Quote,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context";
import {
  createBookNote,
  deleteBookNote,
  fetchBookNotes,
  formatBookNotePageRange,
  updateBookNote,
} from "@/lib/bookNotes";
import {
  noteMarkdownToEditorHtml,
  parseNoteMarkdown,
  type NoteBlockNode,
  type NoteInlineNode,
} from "@/lib/noteFormatting";
import { cn } from "@/lib/utils";
import type { Book, BookNote, BookNoteLabel } from "@/types";

interface BookNotesPanelProps {
  book: Book;
}

const NOTE_LABELS: BookNoteLabel[] = ["quote", "review", "note"];

const LABEL_STYLES: Record<BookNoteLabel, string> = {
  quote: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  review:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  note: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
};

function formatNoteDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function labelText(label: BookNoteLabel): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function inlineNodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/\u00a0/g, " ");
  }

  if (!(node instanceof HTMLElement)) return "";

  const children = Array.from(node.childNodes).map(inlineNodeToMarkdown).join("");
  const tagName = node.tagName.toLowerCase();

  if (tagName === "br") return "\n";
  if (tagName === "strong" || tagName === "b") return `**${children}**`;
  if (tagName === "em" || tagName === "i") return `*${children}*`;
  return children;
}

function blockNodeToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return inlineNodeToMarkdown(node);
  if (!(node instanceof HTMLElement)) return "";

  const tagName = node.tagName.toLowerCase();

  if (tagName === "blockquote") {
    const quote = Array.from(node.childNodes).map(inlineNodeToMarkdown).join("").trim();
    if (!quote) return "";
    return quote
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  if (tagName === "ul" || tagName === "ol") {
    return Array.from(node.children)
      .filter((child) => child.tagName.toLowerCase() === "li")
      .map((child) => Array.from(child.childNodes).map(inlineNodeToMarkdown).join("").trim())
      .filter((item) => item)
      .map((item) => `- ${item}`)
      .join("\n");
  }

  if (tagName === "div" || tagName === "p") {
    return Array.from(node.childNodes).map(inlineNodeToMarkdown).join("").trim();
  }

  return Array.from(node.childNodes).map(inlineNodeToMarkdown).join("").trim();
}

function editorHtmlToMarkdown(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;

  return Array.from(container.childNodes)
    .map(blockNodeToMarkdown)
    .filter((block) => block.trim())
    .join("\n")
    .trim();
}

function renderInlineNodes(nodes: NoteInlineNode[]): ReactNode {
  return nodes.map((node, index) => {
    if (node.type === "text") {
      return node.text.split("\n").map((line, lineIndex) => (
        <span key={`${index}-${lineIndex}`}>
          {lineIndex > 0 && <br />}
          {line}
        </span>
      ));
    }

    if (node.type === "bold") {
      return <strong key={index}>{renderInlineNodes(node.children)}</strong>;
    }

    return <em key={index}>{renderInlineNodes(node.children)}</em>;
  });
}

function renderNoteBlock(block: NoteBlockNode, index: number): ReactNode {
  if (block.type === "quote") {
    return (
      <blockquote key={index} className="border-l-2 border-border pl-3 italic">
        {renderInlineNodes(block.children)}
      </blockquote>
    );
  }

  if (block.type === "list") {
    return (
      <ul key={index} className="list-disc space-y-1 pl-5">
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInlineNodes(item)}</li>
        ))}
      </ul>
    );
  }

  return <p key={index}>{renderInlineNodes(block.children)}</p>;
}

function FormattedNoteContent({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const blocks = parseNoteMarkdown(markdown);

  return (
    <div className={cn("space-y-2 whitespace-normal", className)}>
      {blocks.map(renderNoteBlock)}
    </div>
  );
}

export default function BookNotesPanel({ book }: BookNotesPanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [label, setLabel] = useState<BookNoteLabel>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pageStart, setPageStart] = useState("");
  const [pageEnd, setPageEnd] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  async function loadNotes() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchBookNotes(book.id);
      setNotes(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await fetchBookNotes(book.id);
        if (!cancelled) setNotes(data);
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : "Failed to load notes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [book.id]);

  function resetComposer() {
    setLabel("note");
    setTitle("");
    setContent("");
    setPageStart("");
    setPageEnd("");
    setEditingNoteId(null);
  }

  function closeComposer() {
    setIsComposerOpen(false);
    resetComposer();
  }

  function syncEditorFromMarkdown(markdown: string) {
    window.requestAnimationFrame(() => {
      if (!editorRef.current) return;
      editorRef.current.innerHTML = noteMarkdownToEditorHtml(markdown);
      editorRef.current.focus();
    });
  }

  function openCreateComposer() {
    setErrorMsg(null);
    resetComposer();
    setIsComposerOpen(true);
    syncEditorFromMarkdown("");
  }

  function openEditComposer(note: BookNote) {
    setErrorMsg(null);
    setEditingNoteId(note.id);
    setLabel(note.label);
    setTitle(note.title ?? "");
    setContent(note.content);
    setPageStart(note.page_start ? String(note.page_start) : "");
    setPageEnd(note.page_end ? String(note.page_end) : "");
    setIsComposerOpen(true);
    syncEditorFromMarkdown(note.content);
  }

  function syncMarkdownFromEditor() {
    if (!editorRef.current) return;
    setContent(editorHtmlToMarkdown(editorRef.current.innerHTML));
  }

  function runEditorCommand(command: "bold" | "italic" | "formatBlock" | "insertUnorderedList") {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    if (command === "formatBlock") {
      document.execCommand(command, false, "blockquote");
    } else {
      document.execCommand(command);
    }

    window.requestAnimationFrame(() => {
      syncMarkdownFromEditor();
    });
  }

  async function handleSave() {
    const editorContent = editorRef.current
      ? editorHtmlToMarkdown(editorRef.current.innerHTML)
      : content;
    if (!user || !editorContent.trim()) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      if (editingNoteId) {
        const note = await updateBookNote({
          noteId: editingNoteId,
          label,
          title,
          content: editorContent,
          pageStart,
          pageEnd,
        });
        setNotes((current) =>
          current.map((currentNote) =>
            currentNote.id === editingNoteId ? note : currentNote,
          ),
        );
      } else {
        const note = await createBookNote({
          bookId: book.id,
          userId: user.id,
          label,
          title,
          content: editorContent,
          pageStart,
          pageEnd,
        });
        setNotes((current) => [note, ...current]);
      }
      closeComposer();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingNoteId || deleting) return;

    const shouldDelete = window.confirm("Delete this note? This cannot be undone.");
    if (!shouldDelete) return;

    try {
      setDeleting(true);
      setErrorMsg(null);
      await deleteBookNote(editingNoteId);
      setNotes((current) =>
        current.filter((currentNote) => currentNote.id !== editingNoteId),
      );
      closeComposer();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-heading leading-snug font-medium">Notes</h2>
          <p className="text-xs text-muted-foreground">
            Keep quotes, reviews, and reading notes for this book.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={saving || deleting}
          onClick={openCreateComposer}
        >
          <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
          Add entry
        </Button>
      </div>

      {isComposerOpen && (
        <div className="mb-4 rounded-lg border bg-muted/20">
          <div className="border-b p-3">
            <Label htmlFor="note-title" className="sr-only">
              Title
            </Label>
            <Input
              id="note-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Title"
              className="border-0 bg-transparent px-0 text-base font-medium shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 border-b p-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Bold"
              title="Bold"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runEditorCommand("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Italic"
              title="Italic"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runEditorCommand("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Quote"
              title="Quote"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runEditorCommand("formatBlock")}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="List"
              title="List"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runEditorCommand("insertUnorderedList")}
            >
              <List className="h-4 w-4" />
            </Button>

            <div className="ml-1 h-5 w-px bg-border" />

            <div className="flex flex-wrap gap-1">
              {NOTE_LABELS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLabel(option)}
                  className={cn(
                    "h-7 rounded-lg border px-2 text-xs font-medium transition-colors",
                    label === option
                      ? LABEL_STYLES[option]
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {labelText(option)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3">
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="note-page-start" className="text-xs">
                  Page
                </Label>
                <Input
                  id="note-page-start"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={pageStart}
                  onChange={(event) => setPageStart(event.target.value)}
                  placeholder="42"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note-page-end" className="text-xs">
                  End page
                </Label>
                <Input
                  id="note-page-end"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={pageEnd}
                  onChange={(event) => setPageEnd(event.target.value)}
                  placeholder="45"
                />
              </div>
            </div>
            <Label htmlFor="note-content" className="sr-only">
              Note content
            </Label>
            <div
              id="note-content"
              ref={editorRef}
              role="textbox"
              aria-multiline="true"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Write your note..."
              onInput={syncMarkdownFromEditor}
              onBlur={syncMarkdownFromEditor}
              className="min-h-40 rounded-md border-0 bg-transparent px-0 py-2 text-sm leading-6 shadow-none outline-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] focus-visible:ring-0 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t p-3">
            <div>
              {editingNoteId && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  aria-label="Delete note"
                  title="Delete note"
                  disabled={saving || deleting}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving || deleting}
                onClick={closeComposer}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={saving || deleting || !content.trim()}
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <p>{errorMsg}</p>
          {!isComposerOpen && (
            <Button type="button" variant="outline" size="sm" onClick={loadNotes}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-20 animate-pulse rounded-lg bg-muted" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          No notes yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const pageRangeLabel = formatBookNotePageRange(note);

            if (note.label === "quote") {
              return (
                <article
                  key={note.id}
                  className="rounded-lg border bg-background p-3 dark:bg-card"
                >
                  <div className="grid grid-cols-[2.25rem_1fr] gap-x-3">
                    <div
                      aria-hidden="true"
                      className="text-5xl font-serif leading-none text-sky-600 dark:text-sky-400"
                    >
                      “
                    </div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        {note.title && (
                          <h3 className="mb-1 text-sm font-heading leading-snug font-medium">
                            {note.title}
                          </h3>
                        )}
                      </div>
                      <time className="text-xs text-muted-foreground" dateTime={note.created_at}>
                        {formatNoteDate(note.created_at)}
                      </time>
                    </div>

                    <div className="ml-[0.7rem] border-l border-sky-500 dark:border-sky-400" />
                    <div className="min-w-0">
                      <FormattedNoteContent
                        markdown={note.content}
                        className="font-serif text-sm italic leading-6 text-foreground"
                      />

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {pageRangeLabel && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {pageRangeLabel}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit quote"
                          title="Edit quote"
                          className="text-muted-foreground hover:text-foreground"
                          disabled={saving || deleting}
                          onClick={() => openEditComposer(note)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            }

            return (
              <article key={note.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={LABEL_STYLES[note.label]}>
                      {labelText(note.label)}
                    </Badge>
                    {pageRangeLabel && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {pageRangeLabel}
                      </span>
                    )}
                  </div>
                  <time className="text-xs text-muted-foreground" dateTime={note.created_at}>
                    {formatNoteDate(note.created_at)}
                  </time>
                </div>
                {note.title && (
                  <h3 className="mb-1 text-sm font-heading leading-snug font-medium">
                    {note.title}
                  </h3>
                )}
                <FormattedNoteContent
                  markdown={note.content}
                  className="text-sm leading-6 text-foreground"
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit note"
                    title="Edit note"
                    className="text-muted-foreground hover:text-foreground"
                    disabled={saving || deleting}
                    onClick={() => openEditComposer(note)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
