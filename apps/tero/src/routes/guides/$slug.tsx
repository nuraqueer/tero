import { createFileRoute, Link } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';
import { publicGuide } from '../../lib/guide-catalog';

export const Route = createFileRoute('/guides/$slug')({ component: RouteComponent });

function RouteComponent() {
  const { slug } = Route.useParams();
  const guide = publicGuide(slug);
  if (!guide) {
    return <ContentUnavailableView title="Guide unavailable" description="This guide has not been published." />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-9 px-6 py-10">
      <Link to="/guides">All guides</Link>
      <ContentView.Section>
        <ContentView.H1>{guide.title}</ContentView.H1>
        <ContentView.P>{guide.summary}</ContentView.P>
        {guide.content.note && <ContentView.P>{guide.content.note}</ContentView.P>}
      </ContentView.Section>
      {guide.content.sections.map((section) => (
        <ContentView.Section key={section.id}>
          <ContentView.H2>{section.heading}</ContentView.H2>
          {section.paragraphs.map((paragraph, index) => (
            <ContentView.P key={`${section.id}-${index}`}>{paragraph}</ContentView.P>
          ))}
        </ContentView.Section>
      ))}
    </main>
  );
}
