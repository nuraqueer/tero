import { createFileRoute, Link } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { publicGuides } from '../../lib/guide-catalog';

export const Route = createFileRoute('/guides/')({ component: RouteComponent });

function RouteComponent() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <ContentView.Section>
        <ContentView.H1>Guides</ContentView.H1>
        <ContentView.P>Public information you can read without signing in.</ContentView.P>
      </ContentView.Section>
      <div className="flex flex-col gap-3">
        {publicGuides.map((guide) => (
          <Link key={guide.slug} to="/guides/$slug" params={{ slug: guide.slug }} className="block">
            <ContentView className="p-5">
              <ContentView.Section>
                <ContentView.H2>{guide.title}</ContentView.H2>
                <ContentView.P>{guide.summary}</ContentView.P>
              </ContentView.Section>
            </ContentView>
          </Link>
        ))}
      </div>
    </main>
  );
}
