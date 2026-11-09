import { createFileRoute } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';
import { TabView } from '@passui/react/tab-view';

export const Route = createFileRoute('/_app/help')({ component: RouteComponent });

function RouteComponent() {
  const boards = [
    { value: 'aid', label: 'Mutual aid' },
    { value: 'jobs', label: 'Opportunities' },
    { value: 'skills', label: 'Skills' },
    { value: 'stories', label: 'Stories' },
  ] as const;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <ContentView.Section>
        <ContentView.H1>Help</ContentView.H1>
        <ContentView.P>
          Ask for support and offer what you can, within your trusted network.
        </ContentView.P>
      </ContentView.Section>
      <TabView options={boards} defaultValue="aid" label="Community help boards" align="start">
        {(board) => (
          <ContentUnavailableView
            title={`${boards.find((item) => item.value === board)?.label} is offline`}
            description="Private listings require an established encrypted peer session."
          />
        )}
      </TabView>
    </div>
  );
}
