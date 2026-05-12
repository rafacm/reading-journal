import { Bookmark } from "lucide-react";

export default function Shelves() {
  return (
    <div className="mx-auto flex min-h-[50svh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Bookmark className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-heading font-medium leading-snug">Shelves are coming soon</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Custom shelves will live here later. For now, use My Books, status views, Series,
          and Authors to browse your library.
        </p>
      </div>
    </div>
  );
}
