import { useEffect, useRef } from 'react';
import { Link } from '../types';
import { stashApi } from '../services/api';

interface UseStashEventsOptions {
  stashId: string;
  signature: string;
  onLinkUpdated: (link: Link) => void;
}

/**
 * Opens an SSE connection to /api/stashes/{stashId}/events and calls
 * onLinkUpdated whenever a `link-updated` event is received.
 *
 * Before opening the SSE connection, a short-lived ticket is fetched via
 * POST /api/stashes/{stashId}/sse-ticket (authenticated with X-Stash-Signature).
 * The ticket is then passed as the `?ticket=` query parameter on the EventSource
 * URL, keeping the permanent HMAC signature out of server access logs.
 *
 * Tickets are valid for 15 minutes — longer than the 10-minute SSE connection
 * timeout — so that the browser's native EventSource auto-reconnect succeeds
 * without requiring a new ticket exchange.
 *
 * The connection is automatically closed when the component unmounts or when
 * stashId / signature change.
 */
export function useStashEvents({ stashId, signature, onLinkUpdated }: UseStashEventsOptions): void {
  // Keep the latest callback in a ref so the effect doesn't need to re-subscribe
  // when only the callback identity changes (e.g. inline arrow functions).
  const callbackRef = useRef(onLinkUpdated);
  useEffect(() => {
    callbackRef.current = onLinkUpdated;
  });

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    stashApi
      .createSseTicket(stashId, signature)
      .then((res) => {
        if (cancelled) return;

        const ticket = res.data.ticket;
        const url = `/api/stashes/${stashId}/events?ticket=${encodeURIComponent(ticket)}`;
        es = new EventSource(url);

        es.addEventListener('link-updated', (event: MessageEvent) => {
          try {
            const link: Link = JSON.parse(event.data);
            callbackRef.current(link);
          } catch (err) {
            console.error('[useStashEvents] Failed to parse link-updated event:', err);
          }
        });

        es.onerror = (err) => {
          // EventSource will automatically attempt to reconnect on transient errors.
          // Log at debug level to avoid noise in the console.
          console.debug('[useStashEvents] SSE connection error (will retry):', err);
        };
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useStashEvents] Failed to obtain SSE ticket:', err);
        }
      });

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [stashId, signature]);
}
