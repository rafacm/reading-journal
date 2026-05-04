import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBookNoteInput } from "../src/lib/bookNotes";

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
