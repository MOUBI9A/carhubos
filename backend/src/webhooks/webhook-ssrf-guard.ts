import * as dns from 'dns';
import { isBlockedWebhookHost } from './dto/subscribe-webhook.dto';

/**
 * Closes the DNS-rebinding gap `subscribe-webhook.dto.ts` explicitly left open
 * (see its `isBlockedWebhookHost` doc + R6's "Not done" note): the DTO only
 * checks the *literal* hostname a caller typed at subscribe time. A hostname
 * like `webhook.attacker.example` can resolve to a public IP when subscribed,
 * then be repointed at `169.254.169.254` (or a rebinding DNS server can simply
 * answer differently query-to-query) by the time `sendPayload` actually fires —
 * the subscribe-time check never sees that.
 *
 * The only correct fix is to resolve and validate the SAME lookup that opens
 * the TCP connection, not two independent resolutions a moment apart (which is
 * exactly what a rebinding-capable DNS server is built to defeat). Node's
 * `http(s).Agent` accepts a custom `lookup` function used for every connect;
 * pinning it to a single DNS answer we've already validated makes the check
 * and the connection atomic from the network's point of view.
 */
export class BlockedWebhookTargetError extends Error {
  constructor(host: string, address: string) {
    super(`Webhook target ${host} resolved to a blocked address (${address})`);
    this.name = 'BlockedWebhookTargetError';
  }
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string,
  family: number,
) => void;

/**
 * A `dns.lookup`-compatible function for `http.Agent`/`https.Agent`'s `lookup`
 * option. Resolves every address for the hostname, rejects the connection
 * outright if ANY of them is loopback/link-local/private, and otherwise pins
 * the connection to the first validated address (so the agent never performs
 * a second, independent resolution that could answer differently).
 */
export function createSsrfSafeLookup(
  lookupFn: typeof dns.lookup = dns.lookup,
): (hostname: string, options: any, callback: LookupCallback) => void {
  return (hostname, options, callback) => {
    const cb: LookupCallback =
      typeof options === 'function' ? options : callback;

    lookupFn(hostname, { all: true }, (err, addresses) => {
      if (err) {
        cb(err, undefined as any, undefined as any);
        return;
      }
      const list = (
        Array.isArray(addresses) ? addresses : [addresses]
      ) as Array<{ address: string; family: number }>;

      if (list.length === 0) {
        cb(new Error(`No addresses resolved for ${hostname}`), undefined as any, undefined as any);
        return;
      }

      const blocked = list.find((entry) => isBlockedWebhookHost(entry.address));
      if (blocked) {
        cb(
          new BlockedWebhookTargetError(hostname, blocked.address),
          undefined as any,
          undefined as any,
        );
        return;
      }

      const chosen = list[0];
      cb(null, chosen.address, chosen.family);
    });
  };
}
