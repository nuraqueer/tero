import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import {
  directoryId,
  directoryHandleTag,
  normalizeHandle,
  grantDirectoryKey,
  openDirectoryKey,
  openMemberProfile,
  randomBytes,
  sealMemberProfile,
  type MemberProfile,
  type ProfileEnvelope,
} from '@tero/crypto';
import type { ConnectionAction, ConnectionSummary, DiscoveryMember } from '@tero/protocol';
import { ApiError } from './api';
import { useFullSession } from './session';

export type DiscoveredMember = DiscoveryMember & {
  details: MemberProfile | null;
  invalid: boolean;
};
type Snapshot = {
  members: DiscoveredMember[];
  self: MemberProfile | null;
  selfEnvelope: ProfileEnvelope | null;
  connections: ConnectionSummary[];
  cursor: string | null;
  ready: boolean;
};
const empty: Snapshot = {
  members: [],
  self: null,
  selfEnvelope: null,
  connections: [],
  cursor: null,
  ready: false,
};
type DiscoveryValue = Snapshot & {
  loading: boolean;
  error: boolean;
  refresh: (more?: boolean) => Promise<void>;
  checkHandle: (handle: string) => Promise<boolean>;
  save: (profile: MemberProfile) => Promise<void>;
  connect: (peer: string, action: ConnectionAction) => Promise<void>;
};
const DiscoveryContext = createContext<DiscoveryValue | null>(null);

/** Lives around the unlocked stack; lock removes keys and decrypted profiles. */
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const session = useFullSession();
  const identity = session?.identity;
  const api = session?.api;
  const admitted = session?.member === true && session.connection === 'connected';
  const role = session?.role;
  const [snapshot, setSnapshot] = useState<Snapshot>(empty);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const key = useRef<Uint8Array | null>(null);
  const live = useRef(true);
  const busy = useRef(false);
  const current = useRef(snapshot);
  useEffect(() => {
    current.current = snapshot;
  }, [snapshot]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      key.current?.fill(0);
      key.current = null;
    };
  }, []);

  const refresh = useCallback(
    async (more = false) => {
      if (!admitted || !identity || !api || busy.current) return;
      const client = api();
      if (!client) return;
      busy.current = true;
      setLoading(true);
      setError(false);
      try {
        const cursor = more ? current.current.cursor : null;
        let page = await client.discoveryPage(cursor ?? '');
        if (!live.current) return;
        if (!page.directory && role === 'fool') {
          const candidate = randomBytes(32);
          try {
            await client.grantDirectory(grantDirectoryKey(identity, identity.did, candidate));
          } catch (cause) {
            if (!(cause instanceof ApiError) || cause.code !== 'conflict') throw cause;
          } finally {
            candidate.fill(0);
          }
          page = await client.discoveryPage(cursor ?? '');
          if (!live.current) return;
        }
        if (key.current && page.directory !== directoryId(key.current)) {
          key.current.fill(0);
          key.current = null;
        }
        if (!key.current && page.directory) {
          for (const grant of page.grants) {
            const opened = openDirectoryKey(identity, grant, page.directory);
            if (opened) {
              key.current = opened;
              break;
            }
          }
        }
        const secret = key.current;
        if (secret) {
          // A signed self grant acknowledges receipt; other members then stop forwarding.
          if (!page.grants.some((grant) => grant.sender === identity.did))
            await client.grantDirectory(grantDirectoryKey(identity, identity.did, secret));
          for (const member of page.members) {
            if (!live.current) return;
            if (member.did !== identity.did && member.needsGrant)
              await client.grantDirectory(grantDirectoryKey(identity, member.did, secret));
          }
        }
        const relation = await client.connections();
        if (!live.current) return;
        const members = page.members.map((member) => {
          const details =
            secret && member.profile ? openMemberProfile(secret, member.profile, member.did) : null;
          return { ...member, details, invalid: !!secret && !!member.profile && !details };
        });
        const self =
          secret && page.selfProfile
            ? openMemberProfile(secret, page.selfProfile, identity.did)
            : null;
        setSnapshot((previous) => ({
          members: more
            ? [...previous.members.filter((m) => !members.some((n) => n.did === m.did)), ...members]
            : members,
          self,
          selfEnvelope: page.selfProfile,
          connections: relation.connections,
          cursor: page.cursor,
          ready: !!secret,
        }));
      } catch {
        if (live.current) setError(true);
      } finally {
        busy.current = false;
        if (live.current) setLoading(false);
      }
    },
    [admitted, identity, api, role],
  );

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      clearTimeout(initial);
      subscription.remove();
    };
  }, [refresh]);

  const checkHandle = useCallback(
    async (handle: string) => {
      const client = api?.();
      const normalized = normalizeHandle(handle);
      if (!key.current || !client || !admitted || !normalized || !live.current)
        throw new Error('directory unavailable');
      const result = await client.handleAvailable(
        directoryId(key.current),
        directoryHandleTag(key.current, normalized),
      );
      if (!live.current) throw new Error('directory unavailable');
      return result.available;
    },
    [api, admitted],
  );
  const save = async (profile: MemberProfile) => {
    const client = api?.();
    if (!identity || !key.current || !client || !admitted) throw new Error('directory unavailable');
    const envelope = sealMemberProfile(
      identity,
      key.current,
      profile,
      (current.current.selfEnvelope?.revision ?? 0) + 1,
    );
    await client.saveProfile(envelope);
    if (!live.current) return;
    current.current = { ...current.current, self: profile, selfEnvelope: envelope };
    setSnapshot(current.current);
    await refresh();
  };
  const connect = async (peer: string, action: ConnectionAction) => {
    const client = api?.();
    if (!client || !admitted) throw new Error('directory unavailable');
    await client.connect(peer, action);
    if (live.current) await refresh();
  };
  return (
    <DiscoveryContext value={{ ...snapshot, loading, error, refresh, checkHandle, save, connect }}>
      {children}
    </DiscoveryContext>
  );
}
export function useDiscovery() {
  const value = useContext(DiscoveryContext);
  if (!value) throw new Error('discovery requires an unlocked session');
  return value;
}
