import type { DirectoryGrant, ProfileEnvelope } from '@tero/crypto';
export type DiscoveryMember = {
  did: string;
  sequence: number;
  arcana: number | null;
  profile: ProfileEnvelope | null;
  needsGrant: boolean;
};
export type DiscoveryPage = {
  directory: string | null;
  grants: DirectoryGrant[];
  selfProfile: ProfileEnvelope | null;
  members: DiscoveryMember[];
  cursor: string | null;
};
export type ConnectionSummary = { peer: string; state: 'incoming' | 'outgoing' | 'accepted' };
export type ConnectionAction = 'request' | 'accept' | 'remove';
