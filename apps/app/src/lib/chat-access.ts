import { publicKeyFromDid } from '@tero/crypto';
import type { Api } from './api';

export class ChatAccessError extends Error {}

/** Recheck server state; a cached row or route parameter is not authorization. */
export async function requireAcceptedContact(
  client: Pick<Api, 'connections'>,
  own: string,
  peer: string,
) {
  if (own === peer || !publicKeyFromDid(peer)) throw new ChatAccessError('Invalid chat contact');
  const { connections } = await client.connections();
  if (
    !connections.some((connection) => connection.peer === peer && connection.state === 'accepted')
  )
    throw new ChatAccessError('Contact connection required');
}
