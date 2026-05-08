import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useBooksContext } from "@/context/BooksContext";
import { useSeries } from "@/hooks/useSeries";
import { fetchAllBookNotes, formatBookNotePageRange } from "@/lib/bookNotes";
import {
  parseNoteMarkdown,
  type NoteBlockNode,
  type NoteInlineNode,
} from "@/lib/noteFormatting";
import {
  buildMultiValueGroups,
  buildNoteGroups,
  buildRatingGroups,
  buildSeriesGroups,
  buildShelfValueSummaries,
  buildSingleValueGroups,
  countUniqueBookValues,
  filterBooksByShelfValue,
  filterNotesByShelfValue,
  sortBooksByTitle,
  type BookGroup,
  type LibraryValueShelf,
  type LibraryNote,
  type NoteGroup,
  type ShelfValueSummary,
} from "@/lib/libraryShelves";
import { cn } from "@/lib/utils";
import BookCard from "@/components/BookCard";
import type { Book, BookNote } from "@/types";

type LibraryView =
  | "all"
  | "tbr"
  | "reading"
  | "finished"
  | "wishlist"
  | "dnf"
  | "series"
  | "authors"
  | "genres"
  | "rating"
  | "notes"
  | "languages"
  | "format"
  | "belongs-to";

type PrimaryShelf = {
  value: LibraryView;
  label: string;
  matches: (book: Book) => boolean;
  emptyMessage: string;
};

type CategoryShelf = {
  value: LibraryValueShelf;
  label: string;
};

const SHELF_VALUE_PREVIEW_LIMIT = 10;

const primaryShelves: PrimaryShelf[] = [
  {
    value: "all",
    label: "All Books",
    matches: () => true,
    emptyMessage: "No books yet. Tap + to add one.",
  },
  {
    value: "tbr",
    label: "To Be Read",
    matches: (book) => ["Wishlist", "Not Started", "Up Next"].includes(book.status),
    emptyMessage: "No books in your reading list.",
  },
  {
    value: "reading",
    label: "Currently Reading",
    matches: (book) => book.status === "Reading",
    emptyMessage: "No books are currently in progress.",
  },
  {
    value: "finished",
    label: "Finished",
    matches: (book) => book.status === "Finished",
    emptyMessage: "No finished books yet.",
  },
  {
    value: "wishlist",
    label: "Wishlist",
    matches: (book) => book.status === "Wishlist",
    emptyMessage: "No wishlist books yet.",
  },
  {
    value: "dnf",
    label: "DNF",
    matches: (book) => book.status === "DNF",
    emptyMessage: "No DNF books yet.",
  },
];

const categoryShelves: CategoryShelf[] = [
  { value: "series", label: "Series" },
  { value: "authors", label: "Authors" },
  { value: "genres", label: "Genres" },
  { value: "rating", label: "Rating" },
  { value: "notes", label: "Notes" },
  { value: "languages", label: "Languages" },
  { value: "format", label: "Format" },
  { value: "belongs-to", label: "Belongs to" },
];

const validViews = new Set<LibraryView>([
  ...primaryShelves.map((shelf) => shelf.value),
  ...categoryShelves.map((shelf) => shelf.value),
]);

function isLibraryView(value: string | null): value is LibraryView {
  return value !== null && validViews.has(value as LibraryView);
}

function viewPath(view: LibraryView) {
  return `/library?view=${view}`;
}

function valueListPath(view: LibraryValueShelf) {
  return `/library?view=${view}&list=all`;
}

function valuePath(view: LibraryValueShelf, value: string) {
  return `/library?view=${view}&value=${encodeURIComponent(value)}`;
}

function focusedValuePath(view: LibraryValueShelf, value: string) {
  return `/library?view=${view}&list=all&value=${encodeURIComponent(value)}`;
}

function EmptyLibraryView({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <BookOpen className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function BooksGrid({ books, onBook }: { books: Book[]; onBook: (b: Book) => void }) {
  if (books.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 lg:gap-3">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onClick={onBook} textSize="compact" />
      ))}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 lg:gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

function groupCountLabel(count: number) {
  return `${count} book${count !== 1 ? "s" : ""}`;
}

function itemCountLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatNoteDate(value: string): string {
  const dateValue = value.includes("T") ? value : `${value}T00:00:00`;

  return new Date(dateValue).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function noteGroupCountLabel(count: number) {
  return `${count} entr${count === 1 ? "y" : "ies"}`;
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

function LibraryShelfList({
  activeView,
  selectedValue,
  showFocusedShelfList,
  expandedShelf,
  onToggleShelf,
  counts,
  categoryCounts,
  shelfValues,
  mobile = false,
}: {
  activeView?: LibraryView;
  selectedValue?: string;
  showFocusedShelfList: boolean;
  expandedShelf?: LibraryValueShelf;
  onToggleShelf: (shelf: LibraryValueShelf) => void;
  counts: Partial<Record<LibraryView, number>>;
  categoryCounts: Partial<Record<LibraryView, number>>;
  shelfValues: Partial<Record<LibraryValueShelf, ShelfValueSummary[]>>;
  mobile?: boolean;
}) {
  const focusedShelf = categoryShelves.find(
    (shelf) => showFocusedShelfList && shelf.value === activeView
  );

  if (focusedShelf) {
    const values = shelfValues[focusedShelf.value] ?? [];

    return (
      <nav className="space-y-3" aria-label={`${focusedShelf.label} values`}>
        <Button variant="ghost" size="sm" className="justify-start px-2" asChild>
          <Link to="/library">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Library
          </Link>
        </Button>

        <div className="px-2">
          <p className="text-xs font-medium uppercase tracking-wide text-foreground">
            {focusedShelf.label}
          </p>
        </div>

        <div className="space-y-1">
          {values.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No values yet</p>
          ) : (
            values.map((value) => (
              <Link
                key={value.name}
                to={focusedValuePath(focusedShelf.value, value.name)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  selectedValue === value.name
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{value.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{value.count}</span>
              </Link>
            ))
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav className="space-y-4" aria-label="Library views">
      <div className="space-y-1">
        {primaryShelves.map((shelf) => {
          const active = activeView === shelf.value;

          return (
            <Link
              key={shelf.value}
              to={viewPath(shelf.value)}
              className={cn(
                "flex items-center rounded-lg transition-colors",
                mobile ? "gap-2 px-3 py-2 text-sm" : "gap-3 px-3 py-2 text-sm",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span className="min-w-0">{shelf.label}</span>
              <span
                className={cn(
                  "text-muted-foreground",
                  mobile ? "text-sm" : "ml-auto text-xs"
                )}
              >
                {counts[shelf.value] ?? 0}
              </span>
              {mobile && (
                <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="space-y-1 pt-3">
        <p
          className={cn(
            "px-3 font-medium uppercase tracking-wide text-foreground",
            mobile ? "pb-1 pt-2 text-xs" : "text-xs"
          )}
        >
          Categories
        </p>
        {categoryShelves.map((shelf) => {
          const active = activeView === shelf.value;
          const count = categoryCounts[shelf.value];
          const expanded = expandedShelf === shelf.value;
          const values = shelfValues[shelf.value] ?? [];
          const previewValues = values.slice(0, SHELF_VALUE_PREVIEW_LIMIT);
          const hiddenValueCount = Math.max(values.length - SHELF_VALUE_PREVIEW_LIMIT, 0);
          const showingFullShelf = showFocusedShelfList && active && !selectedValue;

          return (
            <div key={shelf.value} className="space-y-1">
              <button
                type="button"
                onClick={() => onToggleShelf(shelf.value)}
                className={cn(
                  "flex w-full items-center rounded-lg text-left transition-colors",
                  mobile ? "gap-2 px-3 py-2 text-sm" : "px-3 py-2 text-sm",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                aria-expanded={expanded}
              >
                <span className={cn("min-w-0", !mobile && "flex-1")}>{shelf.label}</span>
                {count !== undefined && (
                  <span className={cn("text-muted-foreground", mobile ? "text-sm" : "text-xs")}>
                    {count}
                  </span>
                )}
                {expanded ? (
                  <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
                )}
              </button>

              {expanded && (
                <div className="space-y-1 pl-4">
                  {previewValues.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No values yet</p>
                  ) : (
                    previewValues.map((value) => {
                      const valueActive = active && selectedValue === value.name;

                      return (
                        <Link
                          key={value.name}
                          to={valuePath(shelf.value, value.name)}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors",
                            valueActive
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate">{value.name}</span>
                          <span className="shrink-0 text-muted-foreground">{value.count}</span>
                        </Link>
                      );
                    })
                  )}
                  {hiddenValueCount > 0 && !showingFullShelf && (
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-3 text-xs" asChild>
                      <Link to={valueListPath(shelf.value)}>View all</Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

function GroupedBooksView({
  groups,
  onBook,
}: {
  groups: BookGroup[];
  onBook: (book: Book) => void;
}) {
  if (groups.length === 0) {
    return <EmptyLibraryView message="No books yet." />;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.name} className="space-y-3">
          <div>
            <h3 className="font-heading leading-snug font-medium">{group.name}</h3>
            <p className="text-xs text-muted-foreground">{groupCountLabel(group.books.length)}</p>
          </div>
          <Separator />
          <BooksGrid books={group.books} onBook={onBook} />
        </section>
      ))}
    </div>
  );
}

function LibraryNoteCard({ note, onBook }: { note: LibraryNote; onBook: (book: Book) => void }) {
  const pageLabel = formatBookNotePageRange(note);
  const visibleDate = note.note_date ?? note.created_at;
  const noteMetadata = (
    <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
      {note.label === "quote" && note.is_favorite && (
        <Heart className="h-4 w-4 fill-rose-500 text-rose-500" aria-label="Favorite quote" />
      )}
      <time dateTime={visibleDate}>{formatNoteDate(visibleDate)}</time>
    </div>
  );

  return (
    <button
      type="button"
      onClick={() => onBook(note.book)}
      className="block w-full rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted/50 dark:bg-card"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-heading font-medium leading-snug">{note.book.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {note.book.authors.join(", ")}
          </p>
        </div>
        {noteMetadata}
      </div>

      {note.label === "quote" ? (
        <div className="grid grid-cols-[3rem_1fr] gap-x-4">
          <div className="flex flex-col items-center">
            <div
              aria-hidden="true"
              className="font-serif text-5xl leading-none text-sky-600 dark:text-sky-400"
            >
              “
            </div>
            <div className="-mt-3 w-px flex-1 bg-sky-500 dark:bg-sky-400" />
          </div>
          <div className="min-w-0">
            <FormattedNoteContent
              markdown={note.content}
              className="line-clamp-4 font-serif text-sm italic leading-6 text-foreground"
            />
            {(note.quote_speaker || pageLabel) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {note.quote_speaker && (
                  <span className="font-serif text-sm italic text-muted-foreground">
                    - {note.quote_speaker}
                  </span>
                )}
                {pageLabel && (
                  <span className="text-xs font-medium text-muted-foreground">{pageLabel}</span>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {note.title && (
            <p className="mb-1 text-sm font-medium leading-snug text-foreground">{note.title}</p>
          )}
          <FormattedNoteContent
            markdown={note.content}
            className="line-clamp-4 text-sm leading-6 text-foreground"
          />
          {pageLabel && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>{pageLabel}</span>
            </div>
          )}
        </>
      )}
    </button>
  );
}

function GroupedNotesView({
  groups,
  onBook,
}: {
  groups: NoteGroup[];
  onBook: (book: Book) => void;
}) {
  if (groups.length === 0) {
    return <EmptyLibraryView message="No notes yet." />;
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.name} className="space-y-3">
          <div>
            <h3 className="font-heading leading-snug font-medium">{group.name}</h3>
            <p className="text-xs text-muted-foreground">{noteGroupCountLabel(group.notes.length)}</p>
          </div>
          <Separator />
          <div className="space-y-3">
            {group.notes.map((note) => (
              <LibraryNoteCard key={note.id} note={note} onBook={onBook} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function getViewLabel(view: LibraryView) {
  return (
    primaryShelves.find((shelf) => shelf.value === view)?.label ??
    categoryShelves.find((shelf) => shelf.value === view)?.label ??
    "Library"
  );
}

export default function Library() {
  const { books, loading: booksLoading, error, reload } = useBooksContext();
  const { series, loading: seriesLoading } = useSeries();
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [expandedShelf, setExpandedShelf] = useState<LibraryValueShelf | undefined>();
  const mobileShelfListRef = useRef<HTMLDivElement>(null);
  const desktopShelfListRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const viewParam = searchParams.get("view");
  const listParam = searchParams.get("list");
  const valueParam = searchParams.get("value")?.trim() || undefined;
  const hasExplicitView = isLibraryView(viewParam);
  const activeView = hasExplicitView ? viewParam : undefined;
  const contentView = activeView ?? "all";
  const isNotesView = contentView === "notes";
  const activeCategoryShelf = categoryShelves.find((shelf) => shelf.value === contentView);
  const activeValueShelf = activeCategoryShelf?.value;
  const selectedValue = activeValueShelf ? valueParam : undefined;
  const showFocusedShelfList = Boolean(activeValueShelf && listParam === "all");
  const shouldLoadNotes = isNotesView || expandedShelf === "notes";
  const loading = booksLoading || seriesLoading || (isNotesView && notesLoading);
  const contentHeading = getViewLabel(contentView);

  useEffect(() => {
    if (viewParam && !isLibraryView(viewParam)) {
      navigate("/library", { replace: true });
    }
  }, [navigate, viewParam]);

  useEffect(() => {
    if (activeValueShelf && selectedValue) {
      setExpandedShelf(activeValueShelf);
    }
  }, [activeValueShelf, selectedValue]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (selectedValue) return;
      const clickTarget = event.target as Node;
      const clickedInsideShelfList =
        mobileShelfListRef.current?.contains(clickTarget) ||
        desktopShelfListRef.current?.contains(clickTarget);

      if (!clickedInsideShelfList) {
        setExpandedShelf(undefined);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [selectedValue]);

  useEffect(() => {
    if (!shouldLoadNotes || notesLoaded) return;

    let isMounted = true;
    setNotesLoading(true);
    setNotesError(null);

    fetchAllBookNotes()
      .then((data) => {
        if (!isMounted) return;
        setNotes(data);
        setNotesLoaded(true);
      })
      .catch((fetchError: unknown) => {
        if (!isMounted) return;
        setNotesLoaded(true);
        setNotesError(fetchError instanceof Error ? fetchError.message : "Could not load notes.");
      })
      .finally(() => {
        if (isMounted) setNotesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [notesLoaded, shouldLoadNotes]);

  function openBook(book: Book) {
    navigate(`/books/${book.id}`);
  }

  function retryNotes() {
    setNotesLoaded(false);
    setNotesError(null);
  }

  function toggleShelf(shelf: LibraryValueShelf) {
    setExpandedShelf((currentShelf) => (currentShelf === shelf ? undefined : shelf));
    navigate(viewPath(shelf));
  }

  const primaryCounts = useMemo(
    () =>
      primaryShelves.reduce(
        (counts, shelf) => ({
          ...counts,
          [shelf.value]: books.filter(shelf.matches).length,
        }),
        {} as Partial<Record<LibraryView, number>>
      ),
    [books]
  );

  const categoryCounts = useMemo(
    () => ({
      series: series.filter((item) => books.some((book) => book.series_id === item.id)).length,
      authors: countUniqueBookValues(books, (book) => book.authors),
      genres: countUniqueBookValues(books, (book) => book.genres),
      rating: buildRatingGroups(books).length,
      notes: notesLoaded ? notes.length : undefined,
      languages: new Set(books.map((book) => book.language).filter(Boolean)).size,
      format: new Set(books.map((book) => book.format).filter(Boolean)).size,
      "belongs-to": new Set(books.map((book) => book.belongs_to).filter(Boolean)).size,
    }),
    [books, notes.length, notesLoaded, series]
  );

  const shelfValues = useMemo(
    () =>
      categoryShelves.reduce(
        (values, shelf) => ({
          ...values,
          [shelf.value]: buildShelfValueSummaries({
            shelf: shelf.value,
            books,
            series,
            notes,
          }),
        }),
        {} as Partial<Record<LibraryValueShelf, ShelfValueSummary[]>>
      ),
    [books, notes, series]
  );

  const activePrimaryShelf = primaryShelves.find((shelf) => shelf.value === contentView);
  const visibleBooks = useMemo(() => {
    if (!activePrimaryShelf) return [];
    return sortBooksByTitle(books.filter(activePrimaryShelf.matches));
  }, [activePrimaryShelf, books]);

  const filteredBooks = useMemo(() => {
    if (!activeValueShelf || !selectedValue || activeValueShelf === "notes") return [];
    return filterBooksByShelfValue({
      shelf: activeValueShelf,
      value: selectedValue,
      books,
      series,
    });
  }, [activeValueShelf, books, selectedValue, series]);

  const groupedBooks = useMemo(() => {
    if (contentView === "series") return buildSeriesGroups(books, series);
    if (contentView === "authors") return buildMultiValueGroups(books, (book) => book.authors);
    if (contentView === "genres") return buildMultiValueGroups(books, (book) => book.genres);
    if (contentView === "rating") return buildRatingGroups(books);
    if (contentView === "languages") return buildSingleValueGroups(books, (book) => book.language);
    if (contentView === "format") return buildSingleValueGroups(books, (book) => book.format);
    if (contentView === "belongs-to") {
      return buildSingleValueGroups(books, (book) => book.belongs_to);
    }
    return [];
  }, [contentView, books, series]);

  const groupedNotes = useMemo(() => {
    if (isNotesView && selectedValue) {
      return filterNotesByShelfValue({
        value: selectedValue,
        notes,
        books,
      });
    }
    if (!isNotesView) return [];
    return buildNoteGroups(notes, books);
  }, [books, isNotesView, notes, selectedValue]);

  const displayedCountLabel = (() => {
    if (activePrimaryShelf) return itemCountLabel(visibleBooks.length, "book");
    if (selectedValue && activeValueShelf === "notes") {
      return itemCountLabel(groupedNotes.reduce((count, group) => count + group.notes.length, 0), "entry", "entries");
    }
    if (selectedValue) return itemCountLabel(filteredBooks.length, "book");
    if (contentView === "series") return itemCountLabel(categoryCounts.series ?? 0, "series", "series");
    if (contentView === "authors") return itemCountLabel(categoryCounts.authors ?? 0, "author");
    if (contentView === "genres") return itemCountLabel(categoryCounts.genres ?? 0, "genre");
    if (contentView === "rating") return itemCountLabel(books.length, "book");
    if (contentView === "notes") return itemCountLabel(notes.length, "entry", "entries");
    return itemCountLabel(books.length, "book");
  })();

  return (
    <div className="space-y-4 md:flex md:h-[calc(100svh-6.5rem)] md:min-h-0 md:flex-col">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading leading-snug font-medium">
          Library
        </h1>
        <span className="text-sm text-muted-foreground">
          {loading ? "..." : displayedCountLabel}
        </span>
      </div>

      {error && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      )}

      {notesError && isNotesView && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="text-sm text-destructive">{notesError}</p>
          <Button variant="outline" size="sm" onClick={retryNotes}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      )}

      <div className="md:hidden">
        {!hasExplicitView || showFocusedShelfList ? (
          <div ref={mobileShelfListRef}>
            <LibraryShelfList
              activeView={activeView}
              selectedValue={selectedValue}
              showFocusedShelfList={showFocusedShelfList}
              expandedShelf={expandedShelf}
              onToggleShelf={toggleShelf}
              counts={primaryCounts}
              categoryCounts={categoryCounts}
              shelfValues={shelfValues}
              mobile
            />
          </div>
        ) : (
          <Button variant="ghost" size="sm" asChild>
            <Link to="/library">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Library
            </Link>
          </Button>
        )}
      </div>

      <div
        className={cn(
          "grid gap-4 md:min-h-0 md:flex-1 md:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)]",
          !hasExplicitView && "hidden md:grid"
        )}
      >
        <aside className="hidden md:block md:min-h-0 md:overflow-y-auto md:pr-1">
          <div ref={desktopShelfListRef}>
            <LibraryShelfList
              activeView={activeView}
              selectedValue={selectedValue}
              showFocusedShelfList={showFocusedShelfList}
              expandedShelf={expandedShelf}
              onToggleShelf={toggleShelf}
              counts={primaryCounts}
              categoryCounts={categoryCounts}
              shelfValues={shelfValues}
            />
          </div>
        </aside>

        <section className="min-w-0 md:min-h-0 md:overflow-y-auto md:pr-1">
          {!selectedValue && (
            <h2 className="mb-6 text-xl font-heading font-medium leading-snug text-muted-foreground">
              {contentHeading}
            </h2>
          )}
          {loading ? (
            <LoadingGrid />
          ) : activePrimaryShelf ? (
            visibleBooks.length === 0 ? (
              <EmptyLibraryView message={activePrimaryShelf.emptyMessage} />
            ) : (
              <BooksGrid books={visibleBooks} onBook={openBook} />
            )
          ) : selectedValue && activeValueShelf && activeValueShelf !== "notes" ? (
            filteredBooks.length === 0 ? (
              <EmptyLibraryView message={`No books found for ${selectedValue}.`} />
            ) : (
              <GroupedBooksView
                groups={[{ name: selectedValue, books: filteredBooks }]}
                onBook={openBook}
              />
            )
          ) : isNotesView ? (
            notesError ? null : <GroupedNotesView groups={groupedNotes} onBook={openBook} />
          ) : (
            <GroupedBooksView groups={groupedBooks} onBook={openBook} />
          )}
        </section>
      </div>
    </div>
  );
}
