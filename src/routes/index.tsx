import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@passui/react/button';
import { ContentView } from '@passui/react/content-view';

export const Route = createFileRoute('/')({ component: RouteComponent });

function RouteComponent() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <ContentView.Section>
        <ContentView.H1>Tero</ContentView.H1>
        <ContentView.P>
          The native foundation is in progress. Existing accounts and community features remain in
          the current test application.
        </ContentView.P>
      </ContentView.Section>
      <Button disabled>Continue</Button>
    </main>
  );
}
