import type { BookNote, BookNoteLabel } from "@/types";

export interface CreateBookNoteInput {
  bookId: string;
  userId: string;
  label: BookNoteLabel;
  title?: string;
  content: string;
}

export interface BookNoteFieldsInput {
  label: BookNoteLabel;
  title?: string;
  content: string;
}

export interface NormalizedBookNoteInput {
  book_id: string;
  user_id: string;
  label: BookNoteLabel;
  title: string | null;
  content: string;
}

export interface NormalizedBookNoteFields {
  label: BookNoteLabel;
  title: string | null;
  content: string;
}

export interface UpdateBookNoteInput extends BookNoteFieldsInput {
  noteId: string;
}

export function normalizeBookNoteFields(
  input: BookNoteFieldsInput,
): NormalizedBookNoteFields {
  const content = input.content.trim();

  if (!content) {
    throw new Error("Note content is required");
  }

  return {
    label: input.label,
    title: input.title?.trim() || null,
    content,
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
