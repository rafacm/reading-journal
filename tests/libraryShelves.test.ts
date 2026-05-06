import assert from "node:assert/strict";
import test from "node:test";
import { buildNoteGroups, buildRatingGroups } from "../src/lib/libraryShelves";
import type { Book, BookNote } from "../src/types";

test("groups favorite books above ratings without duplicating them", () => {
  const groups = buildRatingGroups([
    makeBook({ id: "favorite-five", title: "Favorite Five", rating: 5, is_favorite: true }),
    makeBook({ id: "regular-five", title: "Regular Five", rating: 5 }),
    makeBook({ id: "four-star", title: "Four Star", rating: 4 }),
    makeBook({ id: "unrated", title: "Unrated", rating: null }),
  ]);

  assert.deepEqual(
    groups.map((group) => ({
      name: group.name,
      books: group.books.map((book) => book.id),
    })),
    [
      { name: "Favorites", books: ["favorite-five"] },
      { name: "5 Stars", books: ["regular-five"] },
      { name: "4 Stars", books: ["four-star"] },
      { name: "Unrated", books: ["unrated"] },
    ],
  );
});

test("groups notes by label and puts favorite quotes first", () => {
  const book = makeBook({ id: "book-1", title: "Book One" });
  const groups = buildNoteGroups(
    [
      makeNote({
        id: "regular-quote",
        label: "quote",
        content: "Regular quote",
        note_date: "2026-05-06",
      }),
      makeNote({
        id: "favorite-quote",
        label: "quote",
        content: "Favorite quote",
        is_favorite: true,
        note_date: "2026-05-01",
      }),
      makeNote({ id: "review", label: "review", content: "Review" }),
      makeNote({ id: "note", label: "note", content: "Note" }),
    ],
    [book],
  );

  assert.deepEqual(
    groups.map((group) => ({
      name: group.name,
      notes: group.notes.map((note) => note.id),
    })),
    [
      { name: "Quotes", notes: ["favorite-quote", "regular-quote"] },
      { name: "Reviews", notes: ["review"] },
      { name: "Notes", notes: ["note"] },
    ],
  );
});

function makeBook(overrides: Partial<Book>): Book {
  return {
    id: "book-1",
    title: "Book",
    authors: ["Author"],
    status: "Finished",
    rating: null,
    is_favorite: false,
    user_id: "user-1",
    created_at: "2026-05-01T08:00:00Z",
    ...overrides,
  };
}

function makeNote(overrides: Partial<BookNote>): BookNote {
  return {
    id: "note-1",
    user_id: "user-1",
    book_id: "book-1",
    label: "note",
    title: null,
    quote_speaker: null,
    content: "Note",
    page_start: null,
    is_favorite: false,
    note_date: "2026-05-01",
    created_at: "2026-05-01T08:00:00Z",
    updated_at: "2026-05-01T08:00:00Z",
    ...overrides,
  };
}
