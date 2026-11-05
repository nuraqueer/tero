import { createFileRoute } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';

export const Route = createFileRoute('/_app/you')({ component: RouteComponent });

function RouteComponent() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <ContentView.Section>
        <ContentView.H1>You</ContentView.H1>
        <ContentView.P>
          Your identity, your security, your contribution to the network.
        </ContentView.P>
      </ContentView.Section>
      <ContentUnavailableView
        title="No local identity loaded"
        description="Your profile and contribution history will appear once the Rust identity vault is available."
      />
    </div>
  );
}
