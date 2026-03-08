export interface ChangelogEntry {
  version: number;
  date: string;
  items: string[];
}

export const LATEST_VERSION = 1;

export const changelog: ChangelogEntry[] = [
  {
    version: 1,
    date: 'March 8, 2026',
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
