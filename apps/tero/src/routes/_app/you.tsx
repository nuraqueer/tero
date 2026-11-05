import { createFileRoute } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';
import { useRuntimeCapabilities } from '@/hooks/use-runtime';

export const Route = createFileRoute('/_app/you')({ component: RouteComponent });

function RouteComponent() {
  const runtime = useRuntimeCapabilities();
  const title = runtime.isError
    ? 'Native services could not be verified'
    : runtime.isPending
      ? 'Checking device capabilities'
      : runtime.data.identityVaultReady
        ? 'Identity vault available'
        : 'No local identity loaded';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <ContentView.Section>
        <ContentView.H1>You</ContentView.H1>
        <ContentView.P>
          Your identity, your security, your contribution to the network.
        </ContentView.P>
      </ContentView.Section>
      <ContentUnavailableView
        title={title}
        description={
          runtime.data?.native
            ? 'The native shell is running. Encrypted identity storage and peer transport are not yet connected.'
            : 'Your profile and contribution history require the native encrypted identity vault.'
        }
      />
    </div>
  );
}
