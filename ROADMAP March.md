# ROADMAP 1

## ✅ Change 1 — Login button opens modal
~~the login button in the settings sidebar when not authenticated should open the modal, now it redirects to the homepage.~~

**Done:** replaced `<a href="/account">` with a button that opens `SignInModal` in-place.

---

## ✅ Change 2 — Regenerate stash signature
~~there should be a button for regenerating the signature of a stash (if you have enough access to this write operation). this should be doable even for unclaimed stashes.
there should only be one signature per stash, the old links should no longer allow the user to access the stash as the signature changed.
update the history of stashes if the user has the entry in their browser so the signature is valid for their next accesses
let the user know when the signature was regenerated if they try to access an stash and are unable to. you will have to store a timestamp of when the signature was refreshed last.
claimed stashes accessed by the user that claimed them should not require the signature.
clicking the share button should still give the user a full url containing the signature.
users should not be able to refresh the signature when accessing a claimed stash of a different user, only their claimer should be able to do it~~

**Done:** added `signature_refreshed_at` column (migration `9z_`); `POST /stashes/{id}/regenerate-signature` rotates the HMAC secret key and returns a new `signedUrl`; stale-signature errors return `401 SIGNATURE_REGENERATED` with the rotation timestamp; settings panel shows "Regenerate URL" button for claimer/unclaimed; error page displays the rotation date; sessionStorage + localStorage history updated on success.

---

## ✅ Change 3 — Dark mode on auth/error pages
~~the page that users see when they don't have the correct signature in the url is fully white theme, not well integrated with the theme selector.~~

**Done:** fixed `text-slate-500` missing `dark:text-slate-400` on loading spinner text (two instances).

---

## ✅ Change 4 — Walkthrough login step
~~the walkthrough should also include a step mentioning the button to login and what pros they get for doing so~~

**Done:** added a desktop-only step targeting `#lp-account-button` between the Settings and Share steps, explaining cross-device recovery, private stashes, and visitor permissions.

---

## ✅ Change 5 — Stashes modal: search, sort, pagination
~~the stashes page for a signed-in user should show the date it was created and last updated.
it should allow sorting by visibility type, name and date of creation/date of modification
it should look modern, having a header that you can click for switching the sort type
it should have a small search box for filtering by name
it should be paginated by the backend. the search/sorting should be performed in the backend, not the frontend.
the page size should be 20 by default, the pagination in the frontend should be virtualized so if the user scrolls to the bottom, more entries should load (if there are more entries) - similar to how the scroll list for the links sidebar works~~

**Done:** added `GET /account/stashes?search=&sort=name|createdAt|updatedAt&dir=asc|desc&page=0&size=20` backed by a jOOQ query with ILIKE search and ORDER BY; `StashesModal` rewritten with `useInfiniteQuery`, debounced search input (300ms), clickable sort headers with chevron indicators, and `IntersectionObserver` sentinel for infinite scroll; stash cards show `createdAt` and `updatedAt`.

---

## ✅ Change 6 — Modal scroll lock
~~when scrolling through a modal (what's new, login, etc) you should not be able to scroll the background. now when I scroll in the what's new page for example, I was able to accidentally scroll the background page while also scrolling the what's new page~~

**Done:** created `useScrollLock` hook; applied to `SignInModal`, `WhatsNewModal`, `StashesModal`, `BulkImportModal`, `ClaimStashModal`.

---

## ✅ Change 7 — Relocate "What's New" to homepage + auto-open on version bump
the "What's new" button in the header feels out of place there. move it out of the header entirely and surface it on the homepage instead, integrated naturally with the existing content. the modal should also pop open automatically the next time the user visits the homepage if they were on an older version of the app last time.

- remove the what's new button (and its notification badge) from both the desktop header and the mobile hamburger menu
- add a "What's New" entry near the top of the homepage — a good fit would be a slim dismissible banner or a small chip/pill just below the hero section that only appears when the user is on the homepage. it should show the current version and feel consistent with the existing homepage style (indigo accent, dark mode support)
- on homepage mount, if `hasUnseen` is true (i.e. `LATEST_VERSION > getSeenVersion()`), open `WhatsNewModal` automatically and call `markSeen()` so it only fires once per version
- the homepage entry/banner should still allow the user to reopen the modal manually even after auto-dismissal (i.e. `markSeen` does not hide the element, only the badge/auto-open behavior)

**Plan:**
- Frontend: remove `WhatsNew` button and badge from `App.tsx` (both desktop and mobile menu sections); keep `whatsNewOpen` state + modal mount point since `HomePage` will drive it via a callback prop or shared state
- Frontend: in `HomePage.tsx`, read `useChangelog()`; on mount, if `hasUnseen`, call the open handler and `markSeen()`
- Frontend: add a slim "What's New in v{LATEST_VERSION}" chip/banner below the hero headline — visible only when on the homepage, styled with indigo accent, links/buttons to open the modal
- Frontend: the chip/banner is always shown (not gated on `hasUnseen`) so returning users can still access the changelog; only the auto-open and the dot badge are gated on unseen state

---

## ✅ Change 8 — Read-only visitor UX hardening
when a visitor opens a stash where `linkPermissions === 'READ_ONLY'` (and they are not the claimer), the UI currently still invites them to add links, lets them open settings, and lets them click the title to start an edit that will just fail with a backend error. all of that should be cleaned up.

- **empty state text**: change "No links yet — paste one below" to something neutral like "No links have been added yet" so it does not prompt the visitor to do something they cannot do
- **"add some examples" button**: hide the `DemoButton` entirely when `!canWrite`; the condition that gates it should include the write check alongside the existing `features.demoButton` guard
- **settings button**: hide the settings gear button (both desktop and mobile) when the visitor cannot write and is not the claimer — there is nothing actionable for a read-only visitor inside the settings panel, so showing the button is misleading. use `isClaimerToken` as the gate (the claimer can always configure; pure visitors cannot)
- **title click-to-edit**: when `!canWrite`, remove the pointer cursor, the hover colour, the `title="Click to rename"` tooltip, and make `handleNameClick` a no-op so clicking the title does nothing

**Plan:**
- Frontend (`StashAccessPage.tsx`): add `canWrite` to the empty-state text condition — render the neutral copy when `!canWrite && !isSearching`; suppress `DemoButton` when `!canWrite`
- Frontend (`App.tsx`): expose `isClaimerToken` (or the derived `canWrite`) through `StashContext` or as a prop so `App.tsx` can read it; gate the settings button render on `isClaimerToken` (both desktop `lp-settings-button` and mobile menu equivalent)
- Frontend (`App.tsx`): in the title span, conditionally apply `cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400` and `onClick={handleNameClick}` only when `canWrite`; when read-only, render a plain non-interactive span with the same text styling
