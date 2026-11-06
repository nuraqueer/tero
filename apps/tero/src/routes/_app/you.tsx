import { createFileRoute } from '@tanstack/react-router';
import { ContentView } from '@passui/react/content-view';
import { ContentUnavailableView } from '@passui/react/content-unavailable-view';
import { buttonStyle } from '@passui/react/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRuntimeCapabilities } from '@/hooks/use-runtime';
import { isNativeIdentityUnlocked, lockNativeIdentity } from '@/services/native-identity';

export const Route = createFileRoute('/_app/you')({ component: RouteComponent });

function RouteComponent() {
  const runtime = useRuntimeCapabilities();
  const queryClient = useQueryClient();
  const identity = useQuery({
    queryKey: ['identity', 'native-unlocked'],
    queryFn: isNativeIdentityUnlocked,
    enabled: runtime.data?.native === true,
    retry: false,
    refetchOnWindowFocus: true,
  });
  const relock = useMutation({
    mutationFn: lockNativeIdentity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['identity', 'native-unlocked'] }),
  });
  const title = runtime.isError
    ? 'Native services could not be verified'
    : runtime.isPending
      ? 'Checking device capabilities'
      : identity.data === true
        ? 'Identity unlocked'
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
          identity.data === true
            ? 'Your identity is held in native memory. Device restoration and full account features are still being validated.'
            : runtime.data?.native
            ? 'The native shell is running. Encrypted identity storage and peer transport are not yet connected.'
            : 'Your profile and contribution history require the native encrypted identity vault.'
        }
      />
      {identity.data === true && (
        <ContentView.Section>
          <ContentView.H2>Device security</ContentView.H2>
          <ContentView.P>
            Locking clears the native identity and closes encrypted chat sessions on this device.
          </ContentView.P>
          <button
            type="button"
            className={buttonStyle({ variant: 'accent', className: 'self-start' })}
            disabled={relock.isPending}
            onClick={() => relock.mutate()}
          >
            {relock.isPending ? 'Locking…' : 'Lock Tero'}
          </button>
          {relock.isError && <ContentView.P>Unable to confirm device lock. Try again.</ContentView.P>}
        </ContentView.Section>
      )}
    </div>
  );
}
