# Issue 110: Notes Tab

Book details now have a `Notes` tab instead of the previous `Journal` placeholder.

The feature lets a signed-in user create book-specific note entries and save them to Supabase. Each entry belongs to one book and one user, so notes stay private through Row Level Security.

## What Is New

- The Book Details `Journal` tab was renamed to `Notes`.
- The tab now shows an `Add entry` button near the top.
- Clicking `Add entry` opens a compose-style panel with:
  - optional title field
  - large writing area
  - formatting toolbar
  - label controls
  - `Save` and `Cancel` actions
- Entries can be labeled as:
  - `quote`
  - `review`
  - `note`
- Saved entries appear in the Notes tab with their label, optional title, content, and saved date.

## Formatting Toolbar

The first version uses a normal textarea instead of a full rich text editor.

Toolbar buttons insert simple Markdown-style text:

- Bold inserts `**text**`
- Italic inserts `*text*`
- Quote inserts `> `
- List inserts `- `

This keeps the implementation small and understandable while still giving users quick writing helpers. The content is stored as plain text.

## Supabase Persistence

A new `book_notes` table stores the entries:

| Column | Purpose |
|--------|---------|
| `id` | Unique note id |
| `user_id` | Owner of the note |
| `book_id` | Book the note belongs to |
| `label` | `quote`, `review`, or `note` |
| `title` | Optional entry title |
| `content` | Required note text |
| `created_at` | When the note was created |
| `updated_at` | Reserved for future editing support |

The migration also adds indexes for fetching notes by user, by book, and newest-first by book.

## Security

Row Level Security is enabled on `book_notes`.

Policies allow users to:

- select only their own notes
- insert notes only as themselves
- attach notes only to books they own
- update or delete only their own notes

The current UI only supports creating and listing notes. Update and delete policies are included so the table is ready for future edit/delete features without changing the security model later.

## App Code

The implementation adds:

- `BookNote` and `BookNoteLabel` TypeScript types
- `src/lib/bookNotes.ts` for fetching and creating notes
- `src/components/BookNotesPanel.tsx` for the Notes tab UI
- a small `Textarea` ref-forwarding update so toolbar buttons can keep the cursor in the writing area

## Validation

The feature was checked with:

- `npm test`
- `npm run typecheck`
- `npm run build`
- local browser testing of creating and displaying note entries

## Future Improvements

Possible follow-up work:

- edit saved notes
- delete saved notes
- render Markdown formatting visually
- add search or filters inside the Notes tab
