# ROADMAP 1

## ✅ Change 1 — Login button opens modal
~~the login button in the settings sidebar when not authenticated should open the modal, now it redirects to the homepage.~~

**Done:** replaced `<a href="/account">` with a button that opens `SignInModal` in-place.

---

## Change 2 — Regenerate stash signature
there should be a button for regenerating the signature of a stash (if you have enough access to this write operation). this should be doable even for unclaimed stashes.
there should only be one signature per stash, the old links should no longer allow the user to access the stash as the signature changed.
update the history of stashes if the user has the entry in their browser so the signature is valid for their next accesses
let the user know when the signature was regenerated if they try to access an stash and are unable to. you will have to store a timestamp of when the signature was refreshed last.
claimed stashes accessed by the user that claimed them should not require the signature.
clicking the share button should still give the user a full url containing the signature.
users should not be able to refresh the signature when accessing a claimed stash of a different user, only their claimer should be able to do it

**Plan:**
- Backend: new migration adds `signature_refreshed_at TIMESTAMPTZ` to `stashes`
- Backend: `RegenerateStashSignatureUseCase` regenerates `secret_key`, sets timestamp, returns new signature
- Backend: new endpoint `POST /stashes/{stashId}/regenerate-signature`, guarded by `requireClaimerOrUnclaimed`
- Backend: when signature validation fails, include `signatureRefreshedAt` in error response body (new `SIGNATURE_REGENERATED` error code)
- Frontend: button in settings panel (claimer or unclaimed owner)
- Frontend: on success, update `sessionStorage sig:{stashId}` and localStorage stash history
- Frontend: error page shows "URL was last changed on [date]" using the timestamp from the error response
- Note: claimer bypassing signature is already handled by account-based token acquisition

---

## ✅ Change 3 — Dark mode on auth/error pages
~~the page that users see when they don't have the correct signature in the url is fully white theme, not well integrated with the theme selector.~~

**Done:** fixed `text-slate-500` missing `dark:text-slate-400` on loading spinner text (two instances).

---

## ✅ Change 4 — Walkthrough login step
~~the walkthrough should also include a step mentioning the button to login and what pros they get for doing so~~

**Done:** added a desktop-only step targeting `#lp-account-button` between the Settings and Share steps, explaining cross-device recovery, private stashes, and visitor permissions.

---

## Change 5 — Stashes modal: search, sort, pagination
the stashes page for a signed-in user should show the date it was created and last updated.
it should allow sorting by visibility type, name and date of creation/date of modification
it should look modern, having a header that you can click for switching the sort type
it should have a small search box for filtering by name
it should be paginated by the backend. the search/sorting should be performed in the backend, not the frontend.
the page size should be 20 by default, the pagination in the frontend should be virtualized so if the user scrolls to the bottom, more entries should load (if there are more entries) - similar to how the scroll list for the links sidebar works

**Plan:**
- Backend: new endpoint `GET /account/stashes?search=&sort=name|createdAt|updatedAt|visibility&dir=asc|desc&page=0&size=20`
- Backend: paginated jOOQ query with ILIKE search and ORDER BY; response includes `createdAt`, `updatedAt`
- Frontend: replace `StashesModal` static list with `useInfiniteQuery` + `IntersectionObserver` scroll
- Frontend: debounced search input, clickable sort headers with asc/desc indicator
- Frontend: show `createdAt` and `updatedAt` on each stash card

---

## ✅ Change 6 — Modal scroll lock
~~when scrolling through a modal (what's new, login, etc) you should not be able to scroll the background. now when I scroll in the what's new page for example, I was able to accidentally scroll the background page while also scrolling the what's new page~~

**Done:** created `useScrollLock` hook; applied to `SignInModal`, `WhatsNewModal`, `StashesModal`, `BulkImportModal`, `ClaimStashModal`.
