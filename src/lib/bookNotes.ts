import type { BookNote, BookNoteLabel } from "@/types";

export interface CreateBookNoteInput {
  bookId: string;
  userId: string;
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

export function normalizeBookNoteInput(
  input: CreateBookNoteInput,
): NormalizedBookNoteInput {
  const content = input.content.trim();

  if (!content) {
    throw new Error("Note content is required");
  }

  return {
    book_id: input.bookId,
    user_id: input.userId,
    label: input.label,
    title: input.title?.trim() || null,
    content,
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
