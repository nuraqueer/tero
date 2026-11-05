import { createFileRoute } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';

export const Route = createFileRoute('/_app/messages')({ component: RouteComponent });

function RouteComponent() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <ContentView.Section>
        <ContentView.H1>Messages</ContentView.H1>
        <ContentView.P>Private conversations belong to you and the people you trust.</ContentView.P>
      </ContentView.Section>
      <ContentUnavailableView
        title="Conversations are not connected"
        description="Messages remain unavailable until the local encrypted mailbox is integrated."
      />
    </div>
  );
}
