import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  List,
  MessageSquarePlus,
  Quote,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context";
import { createBookNote, fetchBookNotes } from "@/lib/bookNotes";
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

export default function BookNotesPanel({ book }: BookNotesPanelProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [label, setLabel] = useState<BookNoteLabel>("note");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }

  function closeComposer() {
    setIsComposerOpen(false);
    resetComposer();
  }

  function insertMarkdown(prefix: string, suffix = "") {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((current) => `${current}${prefix}${suffix}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);
    const next = `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`;
    const cursor = start + prefix.length + selected.length + suffix.length;

    setContent(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSave() {
    if (!user || !content.trim()) return;

    try {
      setSaving(true);
      setErrorMsg(null);
      const note = await createBookNote({
        bookId: book.id,
        userId: user.id,
        label,
        title,
        content,
      });
      setNotes((current) => [note, ...current]);
      closeComposer();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setSaving(false);
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
          onClick={() => {
            setErrorMsg(null);
            setIsComposerOpen(true);
          }}
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
              onClick={() => insertMarkdown("**", "**")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Italic"
              title="Italic"
              onClick={() => insertMarkdown("*", "*")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Quote"
              title="Quote"
              onClick={() => insertMarkdown("> ")}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="List"
              title="List"
              onClick={() => insertMarkdown("- ")}
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
            <Label htmlFor="note-content" className="sr-only">
              Note content
            </Label>
            <Textarea
              id="note-content"
              ref={textareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write your note..."
              className="min-h-40 resize-y border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t p-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={closeComposer}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || !content.trim()}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
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
          {notes.map((note) => (
            <article key={note.id} className="rounded-lg border p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className={LABEL_STYLES[note.label]}>
                  {labelText(note.label)}
                </Badge>
                <time className="text-xs text-muted-foreground" dateTime={note.created_at}>
                  {formatNoteDate(note.created_at)}
                </time>
              </div>
              {note.title && (
                <h3 className="mb-1 text-sm font-heading leading-snug font-medium">
                  {note.title}
                </h3>
              )}
              <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                {note.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
