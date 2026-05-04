ALTER TABLE public.book_notes
ADD COLUMN IF NOT EXISTS page_start integer,
ADD COLUMN IF NOT EXISTS page_end integer;

ALTER TABLE public.book_notes
DROP CONSTRAINT IF EXISTS book_notes_page_start_valid,
ADD CONSTRAINT book_notes_page_start_valid
  CHECK (page_start IS NULL OR page_start > 0);

ALTER TABLE public.book_notes
DROP CONSTRAINT IF EXISTS book_notes_page_end_valid,
ADD CONSTRAINT book_notes_page_end_valid
  CHECK (page_end IS NULL OR page_end > 0);

ALTER TABLE public.book_notes
DROP CONSTRAINT IF EXISTS book_notes_page_range_valid,
ADD CONSTRAINT book_notes_page_range_valid
  CHECK (page_end IS NULL OR (page_start IS NOT NULL AND page_end >= page_start));
