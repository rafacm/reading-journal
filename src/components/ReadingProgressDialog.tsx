import { useState, type ReactNode } from "react";
import ReadingProgressPanel from "@/components/ReadingProgressPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Book } from "@/types";

interface ReadingProgressDialogProps {
  book: Book;
  trigger: ReactNode;
  onProgressSaved: (newCurrentPage: number) => Promise<void> | void;
}

export default function ReadingProgressDialog({
  book,
  trigger,
  onProgressSaved,
}: ReadingProgressDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Update progress</DialogTitle>
        </DialogHeader>
        <ReadingProgressPanel
          book={book}
          defaultExpanded
          hideTrigger
          onCancel={() => setOpen(false)}
          onProgressSaved={async (newPage) => {
            await onProgressSaved(newPage);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
