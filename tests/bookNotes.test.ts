import assert from "node:assert/strict";
import test from "node:test";
import {
  formatBookNotePageRange,
  normalizeBookNoteFields,
  normalizeBookNoteInput,
} from "../src/lib/bookNotes";

test("normalizes book note title and content before insert", () => {
  assert.deepEqual(
    normalizeBookNoteInput({
      bookId: "book-1",
      userId: "user-1",
      label: "quote",
      title: "  Favorite line  ",
      content: "  This stayed with me.  ",
    }),
    {
      book_id: "book-1",
      user_id: "user-1",
      label: "quote",
      title: "Favorite line",
      content: "This stayed with me.",
      page_start: null,
      page_end: null,
    },
  );
});

test("stores blank book note title as null", () => {
  assert.equal(
    normalizeBookNoteInput({
      bookId: "book-1",
      userId: "user-1",
      label: "note",
      title: "   ",
      content: "A regular note",
    }).title,
    null,
  );
});

test("rejects blank book note content", () => {
  assert.throws(
    () =>
      normalizeBookNoteInput({
        bookId: "book-1",
        userId: "user-1",
        label: "review",
        content: "   ",
      }),
    /Note content is required/,
  );
});

test("normalizes editable book note fields", () => {
  assert.deepEqual(
    normalizeBookNoteFields({
      label: "review",
      title: "  Final thoughts  ",
      content: "  Strong ending.  ",
    }),
    {
      label: "review",
      title: "Final thoughts",
      content: "Strong ending.",
      page_start: null,
      page_end: null,
    },
  );
});

test("normalizes a single source page", () => {
  assert.deepEqual(
    normalizeBookNoteFields({
      label: "quote",
      content: "Important line.",
      pageStart: "42",
      pageEnd: "",
    }),
    {
      label: "quote",
      title: null,
      content: "Important line.",
      page_start: 42,
      page_end: null,
    },
  );
});

test("normalizes a source page range", () => {
  assert.deepEqual(
    normalizeBookNoteFields({
      label: "note",
      content: "This section matters.",
      pageStart: "42",
      pageEnd: "45",
    }),
    {
      label: "note",
      title: null,
      content: "This section matters.",
      page_start: 42,
      page_end: 45,
    },
  );
});

test("rejects invalid source page ranges clearly", () => {
  assert.throws(
    () =>
      normalizeBookNoteFields({
        label: "note",
        content: "Bad range.",
        pageStart: "45",
        pageEnd: "42",
      }),
    /End page must be the same as or after the start page/,
  );
});

test("rejects an end page without a start page clearly", () => {
  assert.throws(
    () =>
      normalizeBookNoteFields({
        label: "quote",
        content: "Missing start.",
        pageEnd: "45",
      }),
    /Add a start page before adding an end page/,
  );
});

test("formats source page labels", () => {
  assert.equal(formatBookNotePageRange({ page_start: null, page_end: null }), null);
  assert.equal(formatBookNotePageRange({ page_start: 42, page_end: null }), "p. 42");
  assert.equal(formatBookNotePageRange({ page_start: 42, page_end: 45 }), "pp. 42-45");
});
