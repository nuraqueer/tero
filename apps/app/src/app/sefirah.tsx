import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, space } from '@tero/ui';
import { base64UrlToBytes, bytesToBase64Url, openPost, randomBytes, sealPost } from '@tero/crypto';
import { Button } from '@/components/Button';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useFullSession } from '@/lib/session';
import {
  SefirahMessages,
  probeNativeMessages,
  probeNativeMessagePersistence,
} from '@/lib/sefirah-mls';
import { NativeSefirah, probeNativePrimary } from '@/lib/sefirah-native';

/** Development diagnostic only. No real chat or membership UI is being migrated. */
export default function SefirahDevelopment() {
  const session = useFullSession();
  const [status, setStatus] = useState('Tor is stopped.');
  const [packet, setPacket] = useState('');
  const [incoming, setIncoming] = useState('');
  const [expectedOwner, setExpectedOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [messageStatus, setMessageStatus] = useState('Native message bridge not tested.');
  const active = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);
  if (!session || process.env.EXPO_PUBLIC_SEFIRAH_EXPERIMENTAL !== 'enabled') return null;
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    try {
      await work();
    } catch {
      if (mounted.current)
        setStatus(
          'Connection failed. Nothing was sent through Cloudflare. Lock and unlock to start a fresh native session if needed.',
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const publish = () =>
    run(async () => {
      if (!session.sefirah) throw new Error('native build required');
      setStatus('Connecting to Tor. The first connection may take several minutes.');
      const contact = await session.sefirah.start(session.identity);
      const key = randomBytes(32);
      try {
        const object = sealPost(
          key,
          session.identity.secretKey,
          'Sefirah private exchange from a native device.',
          Date.now() + 60 * 60_000,
        );
        await session.sefirah.offer(object);
        if (mounted.current) {
          setPacket(JSON.stringify({ contact, id: object.id, key: bytesToBase64Url(key) }));
          setStatus(
            'Encrypted development post offered through Tor. Onion publication can take time. Keep this session open and copy the packet privately to the other device.',
          );
        }
      } finally {
        key.fill(0);
      }
    });
  const checkPrimary = () =>
    run(async () => {
      if (!NativeSefirah.available) {
        setStatus(
          'Native private carrier unavailable in this build. Update Tero through TestFlight.',
        );
        return;
      }
      const controller = new AbortController();
      active.current = controller;
      setStatus(
        'Checking a synthetic self retrieval through Tor. Keep the app open; bootstrap can take several minutes.',
      );
      try {
        await probeNativePrimary(controller.signal);
        if (mounted.current)
          setStatus(
            'PASS: native onion bootstrap, encrypted offer, self retrieval and verification. This is a synthetic route check, not two-device chat delivery.',
          );
      } finally {
        if (active.current === controller) active.current = null;
      }
    });
  const receive = () =>
    run(async () => {
      if (!session.sefirah || !session.peers || incoming.length > 8192)
        throw new Error('native build required');
      const data = JSON.parse(incoming) as { contact?: unknown; id?: unknown; key?: unknown };
      // Pin against an independently supplied DID, never the owner declared by the packet.
      session.peers.add(data.contact, expectedOwner.trim());
      const peer = session.peers.find(expectedOwner.trim());
      const key = typeof data.key === 'string' ? base64UrlToBytes(data.key) : null;
      if (!peer || !key || key.length !== 32 || typeof data.id !== 'string')
        throw new Error('invalid packet');
      try {
        setStatus('Connecting through Tor to the pinned peer.');
        await session.sefirah.start(session.identity);
        const controller = new AbortController();
        active.current = controller;
        const object = await session.sefirah.get(
          peer,
          expectedOwner.trim(),
          data.id,
          controller.signal,
        );
        const post = openPost(key, object, expectedOwner.trim(), Date.now());
        if (!post) throw new Error('verification failed');
        if (mounted.current) setStatus(`Verified encrypted peer post: ${post.text}`);
      } finally {
        key.fill(0);
        active.current = null;
      }
    });
  return (
    <Page>
      <ScreenHeader title="Sefirah development" />
      <View style={styles.content}>
        <Text style={styles.body}>
          MLS check uses synthetic accounts on this device. It does not send network messages or
          access your account keys.
        </Text>
        <Button
          label="Check native message encryption"
          disabled={!session.messages || busy}
          onPress={() => {
            try {
              probeNativeMessages();
              probeNativeMessagePersistence();
              setMessageStatus(
                SefirahMessages.queueAvailable
                  ? 'PASS: encryption, saved handshake, reopened state, acknowledged queue, inbox and replay rejection.'
                  : 'PASS: encryption, saved handshake, reopened state, inbox and replay rejection.',
              );
            } catch {
              setMessageStatus('Native message check failed. No account data was used.');
            }
          }}
        />
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {messageStatus}
        </Text>
        <Text style={styles.body}>
          Native private carrier experiment. Share these packets only with your intended test peer.
          No real member content or automatic fallback.
        </Text>
        <Text selectable style={styles.body}>
          Your expected peer identity: {session.identity.did}
        </Text>
        {!session.sefirah && (
          <Text style={styles.body}>
            This build has no native private carrier. Use the latest Sefirah TestFlight or Android
            development build. Expo Go cannot run this transport.
          </Text>
        )}
        {session.peersError && (
          <Text style={styles.body}>Private contact storage is unavailable.</Text>
        )}
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {status}
        </Text>
        <Button
          label="Check native private route"
          onPress={checkPrimary}
          disabled={busy || !NativeSefirah.available}
        />
        <Button
          label="Start Tor and offer test post"
          onPress={publish}
          disabled={busy || !session.sefirah}
        />
        {packet ? (
          <Text selectable style={styles.packet}>
            {packet}
          </Text>
        ) : null}
        <TextInput
          accessibilityLabel="Expected peer DID from trusted invitation"
          placeholder="Expected peer DID from trusted invitation"
          value={expectedOwner}
          onChangeText={setExpectedOwner}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={160}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Private test packet"
          placeholder="Paste the private test packet"
          value={incoming}
          onChangeText={setIncoming}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          maxLength={8192}
          style={styles.input}
        />
        <Button
          label="Fetch and verify through Tor"
          onPress={receive}
          disabled={busy || !session.sefirah || !session.peers}
        />
        <Button label="Lock and stop Sefirah" onPress={session.lock} kind="secondary" />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  body: { color: colors.slate, fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  packet: { color: colors.textSecondary, fontFamily: fonts.mark, fontSize: 11, lineHeight: 17 },
  input: {
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.md,
    color: colors.slate,
    fontFamily: fonts.body,
    minHeight: 52,
  },
});
