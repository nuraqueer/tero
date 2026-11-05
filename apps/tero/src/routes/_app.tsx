import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router';
import { HomeIcon, PersonIcon, SupportIcon, InboxIcon, PeopleIcon } from '@passui/react/icons';
import { ContentView } from '@passui/react/content-view';

export const Route = createFileRoute('/_app')({ component: RouteComponent });

function RouteComponent() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const tabs = [
    { to: '/gathering', label: 'Gathering', icon: HomeIcon },
    { to: '/circles', label: 'Circles', icon: PeopleIcon },
    { to: '/messages', label: 'Messages', icon: InboxIcon },
    { to: '/help', label: 'Help', icon: SupportIcon },
    { to: '/you', label: 'You', icon: PersonIcon },
  ] as const;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col pb-20 md:flex-row md:gap-8 md:pb-0">
      <nav
        aria-label="Tero navigation"
        className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-separator bg-background/95 px-2 py-3 backdrop-blur-lg md:sticky md:top-0 md:h-dvh md:w-52 md:shrink-0 md:flex-col md:justify-start md:border-r md:border-t-0 md:px-4 md:py-8"
      >
        <Link to="/" className="mb-8 hidden md:block">
          <ContentView.H2>Tero</ContentView.H2>
        </Link>
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-current={pathname === to ? 'page' : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 text-label-secondary transition-colors hover:bg-fill hover:text-label aria-[current=page]:bg-fill aria-[current=page]:text-label md:w-full md:flex-none md:flex-row md:gap-3 md:px-3 md:py-3"
          >
            <Icon size={20} aria-hidden="true" />
            <ContentView.Span>{label}</ContentView.Span>
          </Link>
        ))}
      </nav>
      <main id="content" className="min-w-0 flex-1 px-5 py-8 sm:px-8 md:py-12">
        <Outlet />
      </main>
    </div>
  );
}
