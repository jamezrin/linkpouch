import { useCallback, useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function useOnboardingWalkthrough(stashId: string) {
  const startWalkthrough = useCallback(() => {
    const flagKey = `lp:walkthrough:new:${stashId}`;
    if (!sessionStorage.getItem(flagKey)) return;
    if (localStorage.getItem('lp:walkthrough-done')) return;
    sessionStorage.removeItem(flagKey);

    const isDesktop = window.innerWidth >= 768;

    type Step = NonNullable<Parameters<typeof driver>[0]>['steps'];
    const steps: Step = [
      {
        popover: {
          title: 'Welcome to your Pouch!',
          description:
            'This is your private bookmark collection — no account needed. Everything is tied to your URL.',
        },
      },
      {
        element: '#lp-add-link-input',
        popover: {
          title: 'Save links',
          description:
            'Paste any URL here to save it — or just press Ctrl+V anywhere on the page to instantly add a link from your clipboard.',
        },
      },
      {
        element: '#lp-search-bar',
        popover: {
          title: 'Search your links',
          description:
            'Full-text search across all your saved links — titles, descriptions, and URLs.',
        },
      },
      {
        element: '#lp-bulk-actions',
        popover: {
          title: 'Bulk actions',
          description:
            'Select multiple links by clicking their checkboxes, then delete or refresh screenshots in one go.',
        },
      },
    ];

    if (isDesktop) {
      steps.push(
        {
          element: '#lp-stash-name',
          popover: {
            title: 'Rename your Pouch',
            description: 'Click the name in the header to rename it any time.',
          },
        },
        {
          element: '#lp-settings-button',
          popover: {
            title: 'Settings',
            description:
              'Set a password to protect your Pouch, or manage other preferences.',
          },
        },
        {
          element: '#lp-share-button',
          popover: {
            title: 'Bookmark this URL',
            description:
              'This URL is your private key — bookmark it or copy it to come back any time.',
          },
        },
      );
    }

    steps.push({
      element: '#lp-empty-state',
      popover: {
        title: "You're all set!",
        description:
          "Paste a URL in the box below to save your first link — or click 'add some examples' to instantly populate your Pouch with demo content.",
      },
    });

    const driverObj = driver({
      showProgress: true,
      steps,
      onDestroyStarted: () => {
        localStorage.setItem('lp:walkthrough-done', '1');
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }, [stashId]);

  return { startWalkthrough };
}

export function usePreviewWalkthrough(activeLinkId: string | null) {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!activeLinkId) return;
    if (hasTriggeredRef.current) return;
    if (localStorage.getItem('lp:preview-walkthrough-done')) return;

    hasTriggeredRef.current = true;
    const isDesktop = window.innerWidth >= 768;

    // Delay so the preview panel has time to render before driver spots elements
    const t = setTimeout(() => {
      type Step = NonNullable<Parameters<typeof driver>[0]>['steps'];

      const steps: Step = isDesktop
        ? [
            {
              element: '#lp-preview-iframe',
              popover: {
                title: 'Live preview',
                description:
                  'The link loads right here — no need to leave the app. Blocked sites fall back to the archive automatically.',
              },
            },
            {
              element: '#lp-live-archive-toggle',
              popover: {
                title: 'Live vs Archive',
                description:
                  'Switch to Archive to browse a Wayback Machine snapshot — useful when a site is down, paywalled, or too slow. The dropdown lets you pick a specific capture date.',
              },
            },
            {
              element: '#lp-screenshot-thumb',
              popover: {
                title: 'Screenshot',
                description:
                  'A full-page screenshot is captured automatically in the background. Click it to open the full-size view.',
              },
            },
            {
              element: '#lp-preview-url-link',
              popover: {
                title: 'Open in new tab',
                description:
                  'Click the URL in the header to open the original page in a new tab.',
              },
            },
          ]
        : [
            {
              element: '#lp-preview-iframe',
              popover: {
                title: 'Live preview',
                description:
                  'The link loads right here. Blocked sites fall back to the archive automatically.',
              },
            },
            {
              element: '#lp-preview-controls-mobile',
              popover: {
                title: 'Live, Archive & Screenshot',
                description:
                  'Switch between the live page and a Wayback Machine archive snapshot. Tap the thumbnail on the right to view the full-page screenshot.',
              },
            },
          ];

      const driverObj = driver({
        showProgress: true,
        steps,
        onDestroyStarted: () => {
          localStorage.setItem('lp:preview-walkthrough-done', '1');
          driverObj.destroy();
        },
      });

      driverObj.drive();
    }, 400);

    return () => clearTimeout(t);
  }, [activeLinkId]);
}
