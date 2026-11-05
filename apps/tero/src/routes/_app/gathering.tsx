import { createFileRoute, Link } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';
import { buttonStyle } from '@passui/react/button';

export const Route = createFileRoute('/_app/gathering')({ component: RouteComponent });

function RouteComponent() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <ContentView.Section>
        <ContentView.H1>Gathering</ContentView.H1>
        <ContentView.P>A place to connect, share, and look out for each other.</ContentView.P>
      </ContentView.Section>
      <ContentView className="p-6">
        <ContentView.Section>
          <ContentView.H2>From your circles</ContentView.H2>
          <ContentView.P>Find people you trust and build your circle before sharing.</ContentView.P>
          <Link
            to="/circles"
            className={buttonStyle({ variant: 'secondary', className: 'self-start' })}
          >
            Find people
          </Link>
        </ContentView.Section>
      </ContentView>
      <ContentView.Section>
        <ContentView.H2>Community</ContentView.H2>
        <ContentUnavailableView
          title="Updates are unavailable"
          description="Community updates will appear here when your encrypted network session is available."
        />
      </ContentView.Section>
    </div>
  );
}
