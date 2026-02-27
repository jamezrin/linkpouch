import { useEffect, useRef } from 'react';
import { Link } from '../types';

interface UseStashEventsOptions {
  stashId: string;
  signature: string;
  onLinkUpdated: (link: Link) => void;
}

/**
 * Opens an SSE connection to /api/stashes/{stashId}/events and calls
 * onLinkUpdated whenever a `link-updated` event is received.
 *
 * The native EventSource API does not support custom headers, so the
 * stash signature is passed as the `sig` query parameter — matching
 * the pattern used by ScreenshotController on the backend.
 *
 * The connection is automatically closed when the component unmounts
 * or when stashId / signature change.
 */
export function useStashEvents({ stashId, signature, onLinkUpdated }: UseStashEventsOptions): void {
  // Keep the latest callback in a ref so the effect doesn't need to re-subscribe
  // when only the callback identity changes (e.g. inline arrow functions).
  const callbackRef = useRef(onLinkUpdated);
  useEffect(() => {
    callbackRef.current = onLinkUpdated;
  });

  useEffect(() => {
    const url = `/api/stashes/${stashId}/events?sig=${encodeURIComponent(signature)}`;
    const es = new EventSource(url);

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

    return () => {
      es.close();
    };
  }, [stashId, signature]);
}
