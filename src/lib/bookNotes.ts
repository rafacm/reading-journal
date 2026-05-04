import type { BookNote, BookNoteLabel } from "@/types";

export interface CreateBookNoteInput {
  bookId: string;
  userId: string;
  label: BookNoteLabel;
  title?: string;
  content: string;
  pageStart?: string | number | null;
  pageEnd?: string | number | null;
}

export interface BookNoteFieldsInput {
  label: BookNoteLabel;
  title?: string;
  content: string;
  pageStart?: string | number | null;
  pageEnd?: string | number | null;
}

export interface NormalizedBookNoteInput {
  book_id: string;
  user_id: string;
  label: BookNoteLabel;
  title: string | null;
  content: string;
  page_start: number | null;
  page_end: number | null;
}

export interface NormalizedBookNoteFields {
  label: BookNoteLabel;
  title: string | null;
  content: string;
  page_start: number | null;
  page_end: number | null;
}

export interface UpdateBookNoteInput extends BookNoteFieldsInput {
  noteId: string;
}

function normalizePageValue(
  value: string | number | null | undefined,
  fieldLabel: string,
): number | null {
  if (value === null || value === undefined) return null;

  const normalizedValue = typeof value === "string" ? value.trim() : value;
  if (normalizedValue === "") return null;

  const page =
    typeof normalizedValue === "number" ? normalizedValue : Number(normalizedValue);

  if (!Number.isInteger(page) || page < 1) {
    throw new Error(`${fieldLabel} must be a whole page number greater than 0`);
  }

  return page;
}

export function formatBookNotePageRange(
  note: Pick<BookNote, "page_start" | "page_end">,
): string | null {
  if (!note.page_start) return null;
  if (!note.page_end || note.page_end === note.page_start) return `p. ${note.page_start}`;
  return `pp. ${note.page_start}-${note.page_end}`;
}

export function normalizeBookNoteFields(
  input: BookNoteFieldsInput,
): NormalizedBookNoteFields {
  const content = input.content.trim();
  const pageStart = normalizePageValue(input.pageStart, "Start page");
  const pageEnd = normalizePageValue(input.pageEnd, "End page");

  if (!content) {
    throw new Error("Note content is required");
  }

  if (pageEnd && !pageStart) {
    throw new Error("Add a start page before adding an end page");
  }

  if (pageStart && pageEnd && pageEnd < pageStart) {
    throw new Error("End page must be the same as or after the start page");
  }

  return {
    label: input.label,
    title: input.title?.trim() || null,
    content,
    page_start: pageStart,
    page_end: pageEnd && pageEnd !== pageStart ? pageEnd : null,
  };
}

export function normalizeBookNoteInput(
  input: CreateBookNoteInput,
): NormalizedBookNoteInput {
  return {
    book_id: input.bookId,
    user_id: input.userId,
    ...normalizeBookNoteFields(input),
  };
}

export async function fetchBookNotes(bookId: string): Promise<BookNote[]> {
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase
    .from("book_notes")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BookNote[];
}

export async function createBookNote(
  input: CreateBookNoteInput,
): Promise<BookNote> {
  const { supabase } = await import("./supabase");
  const payload = normalizeBookNoteInput(input);
  const { data, error } = await supabase
    .from("book_notes")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as BookNote;
}

export async function updateBookNote(
  input: UpdateBookNoteInput,
): Promise<BookNote> {
  const { supabase } = await import("./supabase");
  const payload = normalizeBookNoteFields(input);
  const { data, error } = await supabase
    .from("book_notes")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.noteId)
    .select()
    .single();

  if (error) throw error;
  return data as BookNote;
}

export async function deleteBookNote(noteId: string): Promise<void> {
  const { supabase } = await import("./supabase");
  const { error } = await supabase.from("book_notes").delete().eq("id", noteId);

  if (error) throw error;
}
