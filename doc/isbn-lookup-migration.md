# ISBN Lookup: Migrate from Open Library to Google Books + Bookcover API

## Problem

The Open Library ISBN metadata API frequently fails to find books, returning null for many valid ISBNs. This makes the barcode scanner and manual ISBN lookup unreliable.

## Solution

Replace Open Library with two more reliable services:

- **Google Books API** for metadata (title, author, page count, genre, language) -- no API key required for basic usage
- **bookcover.longitood.com** for cover images -- free API that aggregates covers from multiple sources

Both requests are fired in parallel via `Promise.all`, so total lookup time is roughly half of the old approach (which made 3 sequential requests to Open Library).

### New module: `src/lib/bookLookup.ts`

Replaces `src/lib/openLibrary.ts` with the same exported interface:

- `BookLookupResult` -- same shape as the old `OpenLibraryBookData` (title, author, totalPages, genre, language, format, coverUrl)
- `fetchBookByISBN(isbn)` -- returns `Promise<BookLookupResult | null>`

**Google Books endpoint:** `GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`
- Extracts `title`, `authors[0]`, `pageCount`, `categories[0]`, `language` from `items[0].volumeInfo`
- Maps ISO 639-1 language codes to app values (en -> English, es -> Spanish, de -> German)
- Format is omitted (Google Books doesn't provide reliable binding info; user selects manually)

**Bookcover endpoint:** `GET https://bookcover.longitood.com/bookcover?isbn={isbn}`
- Returns `{ "url": "..." }` with a direct link to the cover image
- Wrapped in `.catch(() => null)` so cover failure never blocks the lookup

### Consumer changes

- `src/components/AddBookDialog.tsx` -- import path changed from `@/lib/openLibrary` to `@/lib/bookLookup` (single line change; no logic changes needed)
- `src/components/BookDetailModal.tsx` -- external link updated from Open Library to Google Books (`https://books.google.com/books?vid=ISBN{isbn}`)

### Deleted

- `src/lib/openLibrary.ts` -- no longer referenced

## Testing

Verified with three ISBNs covering different scenarios:

| ISBN | Title | Author | Language | Pages | Cover |
|------|-------|--------|----------|-------|-------|
| 9788420674629 | Odisea | Homero | Spanish | -- | Yes |
| 9781805331957 | Close to the Machine | Ellen Ullman | English | -- | Yes |
| 978-0-307-39099-8 | The Master Switch | Tim Wu | English | 385 | Yes |
