import { createFileRoute } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';
import { useRuntimeCapabilities } from '@/hooks/use-runtime';

export const Route = createFileRoute('/_app/messages')({ component: RouteComponent });

function RouteComponent() {
  const runtime = useRuntimeCapabilities();

  const description = runtime.isPending
    ? 'Checking the encrypted messaging capabilities on this device.'
    : runtime.isError
      ? 'The native messaging status could not be verified. No conversation will be opened.'
      : !runtime.data.native
        ? 'Encrypted native messaging is not yet available in the browser.'
        : !runtime.data.identityVaultReady
          ? 'This build does not yet have a migrated identity vault. Your existing conversations remain in the previous app.'
          : !runtime.data.peerTransportReady
            ? 'Your local identity is available, but authenticated peer delivery is not ready.'
            : 'The local runtime is available. Conversation storage and membership checks must be connected before messages can open.';

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <ContentView.Section>
        <ContentView.H1>Messages</ContentView.H1>
        <ContentView.P>Private conversations belong to you and the people you trust.</ContentView.P>
      </ContentView.Section>
      <ContentUnavailableView
        title="Conversations are not connected"
        description={description}
      />
    </div>
  );
}
