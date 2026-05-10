DO $$
DECLARE
  rating_check text;
  uses_scaled_ratings boolean;
BEGIN
  SELECT pg_get_constraintdef(oid)
  INTO rating_check
  FROM pg_constraint
  WHERE conrelid = 'books'::regclass
    AND conname = 'books_rating_check';

  uses_scaled_ratings :=
    COALESCE(rating_check, '') LIKE '%10%'
    OR EXISTS (
      SELECT 1
      FROM books
      WHERE rating > 5
    );

  ALTER TABLE books
  DROP CONSTRAINT IF EXISTS books_rating_check;

  IF uses_scaled_ratings THEN
    UPDATE books
    SET rating = CEIL(rating / 2.0)::smallint
    WHERE rating IS NOT NULL;
  END IF;

  ALTER TABLE books
  ADD CONSTRAINT books_rating_check CHECK (rating BETWEEN 1 AND 5);
END $$;
