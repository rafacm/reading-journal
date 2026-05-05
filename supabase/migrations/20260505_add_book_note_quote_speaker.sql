ALTER TABLE public.book_notes
ADD COLUMN IF NOT EXISTS quote_speaker text;
