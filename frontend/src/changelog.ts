export interface ChangelogEntry {
  version: number;
  date: Date;
  items: string[];
}

export const LATEST_VERSION = 6;

export const changelog: ChangelogEntry[] = [
  {
    version: 6,
    date: new Date('2026-03-20'),
    items: [
      'AI Summary — every link now gets an AI-generated structured summary with key takeaways, main content, and notable details',
      'Link preview now has three modes: Live, Archive snapshot, and AI Summary — switch between them with the tab bar',
      'Organise links into nested folders — create, rename, move, and delete folders from the sidebar',
      'Revisit button — re-fetches the screenshot and refreshes the AI summary for a link in one click',
      'AI provider settings — sign in and connect your own API key (OpenRouter, OpenAI, Anthropic, or OpenCode) or use the free built-in provider; only one provider is active at a time',
      'Preview mode preference is remembered — if you switch to AI Summary, the next link you open will start in AI Summary too',
      'Non-embeddable sites no longer silently redirect to archive view — instead you see a clear message explaining why and buttons to switch to Archive or AI Summary',
      'Bulk import now supports nested folder targeting — imported links land in the selected folder',
    ],
  },
  {
    version: 5,
    date: new Date('2026-03-15'),
    items: [
      'Regenerate your pouch URL — rotate the signed link to invalidate old shared links',
      'Visitors using a stale link now see when the URL was last changed',
      'Your pouches modal now supports search, sort, and infinite scroll pagination',
      'Read-only visitor UX — cleaner experience when a pouch is in read-only mode',
      'What\'s New moved to the homepage for easier discovery',
      'Several signed-in UX improvements: sign-in now opens in a modal instead of leaving the page, the walkthrough includes a step explaining account benefits, scrolling inside modals no longer scrolls the background, and auth/error pages now respect dark mode',
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
