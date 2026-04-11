import { createBrowserRouter } from "react-router-dom";

function Dashboard() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
    </div>
  );
}

function Library() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Library</h1>
    </div>
  );
}

function Login() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">Login</h1>
    </div>
  );
}

function NotFound() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold">404 — Page Not Found</h1>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/library",
    element: <Library />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
