import { createFileRoute } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';
import { TabView } from '@passui/react/tab-view';

export const Route = createFileRoute('/_app/circles')({ component: RouteComponent });

function RouteComponent() {
  const sections = [
    { value: 'network', label: 'Network' },
    { value: 'contacts', label: 'Contacts' },
    { value: 'spaces', label: 'Spaces' },
    { value: 'following', label: 'Following' },
  ] as const;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <ContentView.Section>
        <ContentView.H1>Circles</ContentView.H1>
        <ContentView.P>
          Discover people, manage trusted contacts, and share in spaces.
        </ContentView.P>
      </ContentView.Section>
      <TabView options={sections} defaultValue="network" label="Circles sections" align="start">
        {(section) => (
          <ContentUnavailableView
            title={`No ${section} to show`}
            description="Your encrypted network directory will appear after your local identity and peer session are connected."
          />
        )}
      </TabView>
    </div>
  );
}
