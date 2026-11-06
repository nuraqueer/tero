import { createFileRoute, Link } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';
import { guideLanguages, isGuideLocale, publicGuide } from '../../lib/guide-catalog';

export const Route = createFileRoute('/guides/$slug')({
  validateSearch: (search: Record<string, unknown>) => ({
    lang: isGuideLocale(search.lang) ? search.lang : 'en' as const,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  const { lang } = Route.useSearch();
  const guide = publicGuide(slug);
  if (!guide) {
    return <ContentUnavailableView title="Guide unavailable" description="This guide has not been published." />;
  }

  const content = guide.content[lang];

  return (
    <main lang={lang} className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-9 px-6 py-10">
      <Link to="/guides">All guides</Link>
      <nav aria-label="Guide language" className="flex flex-wrap gap-3 text-sm">
        {guideLanguages.map((language) => (
          <Link
            key={language.code}
            to="/guides/$slug"
            params={{ slug }}
            search={{ lang: language.code }}
            aria-current={lang === language.code ? 'page' : undefined}
            className={lang === language.code ? 'font-semibold underline underline-offset-4' : 'underline-offset-4 hover:underline'}
          >
            {language.label}
          </Link>
        ))}
      </nav>
      <ContentView.Section>
        <ContentView.H1>{guide.title}</ContentView.H1>
        <ContentView.P>{guide.summary}</ContentView.P>
        {lang !== 'en' && <ContentView.P>Translation pending native-language review.</ContentView.P>}
        {content.note && <ContentView.P>{content.note}</ContentView.P>}
      </ContentView.Section>
      {content.sections.map((section) => (
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
