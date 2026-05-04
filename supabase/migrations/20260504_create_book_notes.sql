CREATE TABLE IF NOT EXISTS public.book_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (label IN ('quote', 'review', 'note')),
  title text,
  content text NOT NULL CHECK (length(btrim(content)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS book_notes_user_id_idx ON public.book_notes(user_id);
CREATE INDEX IF NOT EXISTS book_notes_book_id_idx ON public.book_notes(book_id);
CREATE INDEX IF NOT EXISTS book_notes_book_created_at_idx ON public.book_notes(book_id, created_at DESC);

ALTER TABLE public.book_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "book_notes: owner select"
  ON public.book_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "book_notes: owner insert"
  ON public.book_notes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.books
      WHERE books.id = book_notes.book_id
        AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "book_notes: owner update"
  ON public.book_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.books
      WHERE books.id = book_notes.book_id
        AND books.user_id = auth.uid()
    )
  );

CREATE POLICY "book_notes: owner delete"
  ON public.book_notes FOR DELETE
  USING (auth.uid() = user_id);
