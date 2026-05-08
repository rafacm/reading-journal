import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BOOK_FINISHED_EVENT, launchBookFinishedConfetti } from "@/lib/confetti";

export default function BookFinishedCelebration() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleBookFinished() {
      setOpen(true);
      launchBookFinishedConfetti();
    }

    window.addEventListener(BOOK_FINISHED_EVENT, handleBookFinished);
    return () => {
      window.removeEventListener(BOOK_FINISHED_EVENT, handleBookFinished);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Yeah! You've finished the book!</DialogTitle>
          <DialogDescription>
            Nice work. This book is now marked as finished.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
