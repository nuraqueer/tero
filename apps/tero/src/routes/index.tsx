import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { buttonStyle } from '@passui/react/button';
import { ContentView } from '@passui/react/content-view';

export const Route = createFileRoute('/')({ component: RouteComponent });

function RouteComponent() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-20 px-6 py-8 sm:px-10 md:py-12">
      <header className="flex items-center justify-between">
        <ContentView.H2>Tero</ContentView.H2>
        <Link to="/gathering" className={buttonStyle({ variant: 'ghost', size: 'sm' })}>
          Explore the preview
        </Link>
      </header>
      <ContentView.Section className="max-w-3xl gap-8 py-12 md:py-20">
        <ContentView.Span>Connection, on your terms</ContentView.Span>
        <ContentView.H1>A safer place to find your people.</ContentView.H1>
        <ContentView.P>
          Tero is being built for trusted community, practical support and private conversations.
          The network is designed to put people first and keep sensitive information in their
          control.
        </ContentView.P>
        <Link
          to="/gathering"
          className={buttonStyle({ variant: 'accent', className: 'self-start' })}
        >
          View the app preview
        </Link>
        <ContentView.Span>
          The new application is in active development. The preview does not connect to private
          accounts or encrypted peer data yet.
        </ContentView.Span>
      </ContentView.Section>
      <div className="grid gap-4 pb-10 sm:grid-cols-3">
        <ContentView className="p-6">
          <ContentView.Section>
            <ContentView.H2>Trusted circles</ContentView.H2>
            <ContentView.P>Build connections through people you know.</ContentView.P>
          </ContentView.Section>
        </ContentView>
        <ContentView className="p-6">
          <ContentView.Section>
            <ContentView.H2>Community support</ContentView.H2>
            <ContentView.P>Find ways to ask, offer and share useful resources.</ContentView.P>
          </ContentView.Section>
        </ContentView>
        <ContentView className="p-6">
          <ContentView.Section>
            <ContentView.H2>Private by design</ContentView.H2>
            <ContentView.P>
              Peer-first networking and end-to-end encryption are core goals.
            </ContentView.P>
          </ContentView.Section>
        </ContentView>
      </div>
    </main>
  );
}
