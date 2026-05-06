import { sortBookNotes } from "@/lib/bookNotes";
import type { Book, BookNote, BookNoteLabel } from "@/types";

export type BookGroup = {
  name: string;
  books: Book[];
};

export type LibraryNote = BookNote & {
  book: Book;
};

export type NoteGroup = {
  name: string;
  notes: LibraryNote[];
};

const STAR_RATINGS = [5, 4, 3, 2, 1];

const NOTE_GROUPS: Array<{ label: BookNoteLabel; name: string }> = [
  { label: "quote", name: "Quotes" },
  { label: "review", name: "Reviews" },
  { label: "note", name: "Notes" },
];

export function sortBooksByTitle(books: Book[]) {
  return [...books].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }),
  );
}

export function buildRatingGroups(books: Book[]): BookGroup[] {
  const groups: BookGroup[] = [];
  const favoriteBooks = sortBooksByTitle(books.filter((book) => book.is_favorite));

  if (favoriteBooks.length > 0) {
    groups.push({ name: "Favorites", books: favoriteBooks });
  }

  STAR_RATINGS.forEach((rating) => {
    const ratedBooks = sortBooksByTitle(
      books.filter((book) => !book.is_favorite && book.rating === rating),
    );

    if (ratedBooks.length > 0) {
      groups.push({
        name: `${rating} ${rating === 1 ? "Star" : "Stars"}`,
        books: ratedBooks,
      });
    }
  });

  const unratedBooks = sortBooksByTitle(
    books.filter((book) => !book.is_favorite && book.rating == null),
  );

  if (unratedBooks.length > 0) {
    groups.push({ name: "Unrated", books: unratedBooks });
  }

  return groups;
}

export function mergeNotesWithBooks(notes: BookNote[], books: Book[]): LibraryNote[] {
  const booksById = new Map(books.map((book) => [book.id, book]));

  return notes.flatMap((note) => {
    const book = booksById.get(note.book_id);
    return book ? [{ ...note, book }] : [];
  });
}

export function sortLibraryNotes(notes: LibraryNote[]): LibraryNote[] {
  return (sortBookNotes(notes) as LibraryNote[]).sort((a, b) => {
    if (a.label === "quote" && b.label === "quote" && a.is_favorite !== b.is_favorite) {
      return a.is_favorite ? -1 : 1;
    }

    return 0;
  });
}

export function buildNoteGroups(notes: BookNote[], books: Book[]): NoteGroup[] {
  const libraryNotes = mergeNotesWithBooks(notes, books);

  return NOTE_GROUPS.map(({ label, name }) => ({
    name,
    notes: sortLibraryNotes(libraryNotes.filter((note) => note.label === label)),
  })).filter((group) => group.notes.length > 0);
}
