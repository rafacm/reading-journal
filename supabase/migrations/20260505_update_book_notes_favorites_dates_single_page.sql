ALTER TABLE public.book_notes
ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS note_date date;

UPDATE public.book_notes
SET note_date = created_at::date
WHERE note_date IS NULL;

ALTER TABLE public.book_notes
ALTER COLUMN note_date SET DEFAULT CURRENT_DATE,
ALTER COLUMN note_date SET NOT NULL;

ALTER TABLE public.book_notes
DROP CONSTRAINT IF EXISTS book_notes_page_range_valid,
DROP CONSTRAINT IF EXISTS book_notes_page_end_valid;

ALTER TABLE public.book_notes
DROP COLUMN IF EXISTS page_end;

CREATE INDEX IF NOT EXISTS book_notes_book_note_date_idx
  ON public.book_notes(book_id, note_date DESC, created_at DESC);
