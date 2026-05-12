import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  LayoutDashboard,
  Library,
  Search,
  BarChart3,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { BooksProvider } from "@/context/BooksContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { useAuth, useProfile } from "@/context";
import { cn } from "@/lib/utils";
import readingJournalLogo from "@/assets/reading-journal-logo.png";

const AddBookDialog = lazy(() => import("./AddBookDialog"));

const navLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/library", label: "Library", icon: Library },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

function isActiveRoute(pathname: string, to: string): boolean {
  return to === "/" ? pathname === "/" : pathname.startsWith(to);
}

function getDisplayName(
  profile: ReturnType<typeof useProfile>["profile"],
  email?: string | null,
): string {
  const name = [profile?.first_name, profile?.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  return name || email || "Profile";
}

function getSettingsPath(): string {
  if (typeof window === "undefined") return "/settings/profile";
  return window.matchMedia("(min-width: 768px)").matches ? "/settings/profile" : "/settings";
}

type ProfileMenuProps = {
  profile: ReturnType<typeof useProfile>["profile"];
  email?: string | null;
  displayName: string;
  open: boolean;
  dropdownRef: React.RefObject<HTMLDivElement>;
  onToggle: () => void;
  onNavigate: (path: string) => void;
  onSignOut: () => void;
};

type AppHeaderProps = {
  pathname: string;
  onAddBookClick: () => void;
  profileMenuProps: ProfileMenuProps;
};

type AppShellProps = {
  pathname: string;
  addBookOpen: boolean;
  onAddBookOpenChange: (open: boolean) => void;
  appHeaderProps: AppHeaderProps;
};

function AppLayoutContent() {
  const { signOut, user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const displayName = getDisplayName(profile, user?.email);

  useEffect(() => {
    if (!avatarMenuOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [avatarMenuOpen]);

  function navigateFromAvatarMenu(path: string) {
    setAvatarMenuOpen(false);
    navigate(path);
  }

  async function signOutFromAvatarMenu() {
    setAvatarMenuOpen(false);
    await signOut();
  }

  const profileMenuProps: ProfileMenuProps = {
    profile,
    email: user?.email,
    displayName,
    open: avatarMenuOpen,
    dropdownRef,
    onToggle: () => setAvatarMenuOpen((open) => !open),
    onNavigate: navigateFromAvatarMenu,
    onSignOut: () => void signOutFromAvatarMenu(),
  };

  return (
    <AppShell
      pathname={location.pathname}
      addBookOpen={addBookOpen}
      onAddBookOpenChange={setAddBookOpen}
      appHeaderProps={{
        pathname: location.pathname,
        onAddBookClick: () => setAddBookOpen(true),
        profileMenuProps,
      }}
    />
  );
}

function AppShell({
  pathname,
  addBookOpen,
  onAddBookOpenChange,
  appHeaderProps,
}: AppShellProps) {
  return (
    <>
      <div className="min-h-svh flex flex-col">
        <AppHeader {...appHeaderProps} />

        {/* Page content */}
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6 pb-20 md:pb-6">
          <Outlet />
        </main>

        <MobileNav pathname={pathname} />
      </div>

      <Suspense fallback={null}>
        {addBookOpen && (
          <AddBookDialog open={addBookOpen} onOpenChange={onAddBookOpenChange} />
        )}
      </Suspense>
    </>
  );
}

function AppHeader({
  pathname,
  onAddBookClick,
  profileMenuProps,
}: AppHeaderProps) {
  return (
    /* Top header */
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-4 px-4">
        {/* Logo / app name */}
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-foreground"
        >
          <img
            src={readingJournalLogo}
            alt="Reading Journal logo"
            className="h-6 w-6 rounded-sm object-cover dark:brightness-0 dark:invert"
          />
          <span className="hidden sm:inline">Reading Journal</span>
        </Link>

        <DesktopNav pathname={pathname} />

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={onAddBookClick}
            aria-label="Add book"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" asChild>
            <Link to="/search" aria-label="Search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="icon" variant="ghost" aria-label="Groups" title="Groups" asChild>
            <Link to="/groups">
              <Users className="h-5 w-5" />
            </Link>
          </Button>
          <ProfileMenu {...profileMenuProps} />
        </div>
      </div>
    </header>
  );
}

function DesktopNav({ pathname }: { pathname: string }) {
  return (
    /* Desktop nav links */
    <nav className="hidden md:flex items-center gap-1 ml-2">
      {navLinks.map(({ to, label }) => {
        const active = isActiveRoute(pathname, to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  return (
    /* Mobile bottom nav */
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t bg-background md:hidden">
      {navLinks.map(({ to, label, icon: Icon }: { to: string; label: string; icon: LucideIcon }) => {
        const active = isActiveRoute(pathname, to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
              active
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileMenu({
  profile,
  email,
  displayName,
  open,
  dropdownRef,
  onToggle,
  onNavigate,
  onSignOut,
}: ProfileMenuProps) {
  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        size="icon"
        variant="ghost"
        className="rounded-full"
        onClick={onToggle}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ProfileAvatar profile={profile} email={email} className="h-7 w-7 text-xs" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="border-b px-3 py-2">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {email && (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => onNavigate("/profile")}
          >
            Profile
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => onNavigate(getSettingsPath())}
          >
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={onSignOut}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  return (
    <BooksProvider>
      <ProfileProvider>
        <AppLayoutContent />
      </ProfileProvider>
    </BooksProvider>
  );
}
