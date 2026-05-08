import { RouterProvider } from "react-router-dom";
import { AuthProvider, ThemeProvider } from "@/context";
import BookFinishedCelebration from "@/components/BookFinishedCelebration";
import { router } from "@/lib/router";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouterProvider router={router} />
        <BookFinishedCelebration />
      </AuthProvider>
    </ThemeProvider>
  );
}
