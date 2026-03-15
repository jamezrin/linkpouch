export interface ChangelogEntry {
  version: number;
  date: Date;
  items: string[];
}

export const LATEST_VERSION = 5;

export const changelog: ChangelogEntry[] = [
  {
    version: 5,
    date: new Date('2026-03-15'),
    items: [
      'Regenerate your pouch URL — rotate the signed link to invalidate old shared links',
      'Visitors using a stale link now see when the URL was last changed',
      'Your pouches modal now supports search, sort, and infinite scroll pagination',
      'Read-only visitor UX — cleaner experience when a pouch is in read-only mode',
      'What\'s New moved to the homepage for easier discovery',
    ],
  },
  {
    version: 4,
    date: new Date('2026-03-12'),
    items: [
      'Optional account linking — sign in with GitHub, Google, Discord, or X to attach pouches to an account',
      'Claim any pouch you have the signed URL for and keep it linked across devices',
      'Manage your linked pouches at /account — open, disown, or add more at any time',
    ],
  },
  {
    version: 3,
    date: new Date('2026-03-10'),
    items: [
      'Interactive walkthrough for new pouches — guides you through adding links, searching, bulk actions, and more',
      'A second walkthrough appears the first time you open a link preview, explaining live vs archive mode and screenshots',
    ],
  },
  {
    version: 2,
    date: new Date('2026-03-09'),
    items: [
      'Paste a URL anywhere on the page to instantly add it — no need to click the input first',
      'Add link input and button are now a single combined control for a cleaner look',
      'Bulk import button updated to a more descriptive file icon',
      'Refreshing screenshots now asks for confirmation before proceeding',
    ],
  },
  {
    version: 1,
    date: new Date('2026-03-08'),
    items: [
      'First stable release of Linkpouch',
      'Create anonymous link pouches — no account needed, access via a signed URL',
      'Add, remove, and reorder links with drag-and-drop',
      'Automatic page previews: title, description, favicon, and screenshot fetched in the background',
      'Full-text search across all links in a pouch',
      'Bulk import up to 100 URLs at once by pasting or uploading a .txt file',
      'Password-protect a pouch to restrict access',
      'Recent pouches history saved locally for quick access',
      'Share a pouch with a single link',
      'Light and dark theme',
      'What\'s New — in-app changelog so you always know what changed',
      'Fixed layout jumps on mobile when the address bar shows and hides',
      'Screenshot modal now stays within the visible screen area on mobile',
    ],
  },
];
