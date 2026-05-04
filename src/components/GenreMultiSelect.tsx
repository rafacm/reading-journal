import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BOOK_GENRES, isAllowedGenre } from "@/lib/bookGenres";
import { cn } from "@/lib/utils";

interface GenreMultiSelectProps {
  value: string[];
  onChange: (genres: string[]) => void;
  disabled?: boolean;
}

export default function GenreMultiSelect({
  value,
  onChange,
  disabled = false,
}: GenreMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedGenres = value ?? [];
  const legacyGenres = selectedGenres.filter((genre) => !isAllowedGenre(genre));

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function toggleGenre(genre: string) {
    if (selectedGenres.includes(genre)) {
      onChange(selectedGenres.filter((item) => item !== genre));
      return;
    }

    onChange([...selectedGenres, genre]);
  }

  function removeGenre(genre: string) {
    onChange(selectedGenres.filter((item) => item !== genre));
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        className="h-auto min-h-9 w-full justify-between gap-2 px-3 py-2 text-left font-normal"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
      >
        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {selectedGenres.length > 0 ? (
            selectedGenres.map((genre) => (
              <Badge key={genre} variant="secondary" className="max-w-full">
                <span className="truncate">{genre}</span>
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No genres selected</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Button>

      {open && (
        <div
          id={listId}
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {BOOK_GENRES.map((genre) => {
            const selected = selectedGenres.includes(genre);

            return (
              <button
                key={genre}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  selected && "font-medium"
                )}
                onClick={() => toggleGenre(genre)}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-sm border border-input">
                  {selected && <Check className="h-3 w-3" />}
                </span>
                <span>{genre}</span>
              </button>
            );
          })}

          {legacyGenres.length > 0 && (
            <div className="mt-1 border-t border-border pt-1">
              {legacyGenres.map((genre) => (
                <div
                  key={genre}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground"
                >
                  <span className="truncate">{genre}</span>
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                    onClick={() => removeGenre(genre)}
                    aria-label={`Remove ${genre}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
