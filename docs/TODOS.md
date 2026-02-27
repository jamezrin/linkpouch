# Todos

Ideas and planned improvements for Linkpouch, roughly ordered by priority.

---

## Done

- [x] **Security hardening** — Addressed IDOR, SSRF, auth bypass, CORS misconfigurations, missing security headers, and Kubernetes NetworkPolicies. Full details in `IMPLEMENTATION_PLAN_SECURITY.md`.
- [x] **Rename stash by clicking the name** — Inline editing of the stash name directly from the header breadcrumb; no separate settings page needed.
- [x] **Archive.org fallback with toggle** — The preview panel runs an embeddability check (`/api/embeddable-check`) in parallel with the live iframe load. If the site blocks embedding via `X-Frame-Options` or `CSP`, the panel automatically switches to the Wayback Machine view. A live/archive toggle button lets users switch manually at any time.
- [x] **Archive snapshot picker** — Dropdown calendar showing available Wayback Machine captures by year, month, and day, powered by a proxied CDX API endpoint (avoids CORS).
- [x] **Improve search** — PostgreSQL FTS with a weighted `tsvector` (title ranked highest, then description, URL, and page content) combined with a trigram `ILIKE` fallback for URL substring matches. Results are ranked by `ts_rank`.
- [x] **Improve landing page** — Features grid, "How it works" section, FAQ, roadmap, and a footer CTA. Includes references to the archive.org integration.
- [x] **Multi-select and bulk delete** — Checkboxes appear on hover; selecting one or more links reveals an action bar with delete and screenshot-refresh buttons. Bulk delete fires all deletions in parallel and refreshes the list on completion.
- [x] **Drag-and-drop link reordering** — Powered by `@dnd-kit`. Dragging a selected group moves all selected links together. Order is persisted to the backend via `PATCH /stashes/{id}/links`.

---

## Pending

- [ ] **Fix batch screenshot refresh** — The bulk "refresh screenshot" action reuses a single `useMutation` instance and calls `.mutate()` in a loop, which causes each call to overwrite the previous mutation state. Only the last result is reliably tracked. This should either use `Promise.all` (like batch delete does) or issue a dedicated batch endpoint on the backend.

- [ ] **Per-link indexing status indicator** — Show a visual state on each link card reflecting where it is in the indexing pipeline. Suggested states: *pending* (amber dot, just added), *indexed* (green dot, metadata and screenshot available), *failed* (red dot, scraper encountered an error). Currently the only indicator is a green dot when a screenshot exists; there is no `status` field on the `Link` model yet. This requires a backend schema change and an API update.

- [ ] **Automatic metadata refresh after indexing** — After a link is added, the page shows it without title, favicon, or screenshot until the user manually reloads. Implement polling (e.g. refetch every few seconds while any link is in a pending state) or a push mechanism (SSE or WebSockets) so that metadata and screenshots appear automatically when the indexer finishes.

- [ ] **Move the "add link" form to the bottom of the sidebar** — The add-link input is currently pinned to the top of the sidebar, above the link list. Moving it below the list (or pinning it to the bottom) is a more natural placement and leaves the top of the sidebar free for search or filters.

- [ ] **Bulk link import** — Allow pasting a newline-separated list of URLs, or dropping a browser bookmarks HTML export, to add many links at once. Useful for migrating from other bookmark managers. Requires a new backend endpoint to accept a batch of URLs and publish a `link.added` event for each one.

- [ ] **Screenshot timestamp in the full-screen modal** — The `screenshotGeneratedAt` timestamp is already stored in the database and returned by the API, but it is never displayed. Show it as a small caption below the screenshot in the modal (e.g. "Captured 3 days ago") so users know how fresh the snapshot is.

- [ ] **Mobile-responsive stash page** — The landing page (`HomePage`) is fully responsive with Tailwind breakpoints, but the stash access page (`StashAccessPage`) uses a fixed 320 px sidebar and has no responsive layout at all. On small screens the sidebar and preview panel should stack vertically, and the preview panel could be hidden behind a toggle.

- [ ] **Keyboard navigation and accessibility** — Add keyboard controls for the link list: arrow keys to move focus, `Space` to toggle selection, `Shift+Click` / `Shift+Arrow` for range selection, `Ctrl+A` to select all, `Escape` to clear selection. Also audit ARIA roles, labels, and focus management for screen reader compatibility.

- [ ] **Scalability improvements** — The indexer currently runs as a single consumer in a Redis Streams consumer group. The groundwork for horizontal scaling is already in place (consumer groups, `XAUTOCLAIM` for stale message recovery), but the Playwright browser per-worker model is heavy. Evaluate a shared browser pool or a separate screenshot queue to make scaling more efficient.

- [ ] **Multiple archival sources** — The preview panel currently only falls back to Wayback Machine (archive.org). Add support for additional archival services — archive.is (archive.today), Google Cache, and others — and let users pick their preferred source from a dropdown. Each service has different coverage, so offering alternatives significantly improves the chance of finding a working archived copy of any given page. The embeddability check and CDX proxy logic would need to be extended per provider, and the snapshot picker UI should become provider-aware.

- [ ] **Password-protected stashes** — Optional passphrase on top of the signed URL, stored as a bcrypt hash. Useful for sensitive collections that might be shared with a wider audience via the signed URL.

- [ ] **Optional OAuth login** — Allow users to sign in via an OAuth provider (GitHub, Google, etc.) to associate stashes with an account. This would enable listing and recovering stashes across devices, without making authentication mandatory for the core anonymous flow.
