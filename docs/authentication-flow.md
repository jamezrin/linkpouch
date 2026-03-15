# Authentication Flow

Linkpouch has two independent authentication layers that work in parallel: **account authentication** (who you are) and **stash access authentication** (whether you may access a specific stash).

---

## Account Authentication

Users sign in via OAuth (GitHub, Google, Discord, or Twitter/X). On completion the backend issues a signed **account JWT** which the frontend stores and sends on all subsequent requests that require account identity (e.g. claiming a stash, acquiring a stash access token as the owner).

Users may also use the app entirely without signing in.

---

## Stash Access Authentication

Every read/write operation on a stash or its links requires a short-lived **stash access token** (a separate JWT, distinct from the account token). The frontend acquires one via `POST /stashes/{id}/access-token`, then attaches it as a Bearer token on all stash and link requests. Tokens encode the stash version at issuance; if the stash's access-control state changes (e.g. password set, signature regenerated), outstanding tokens are immediately invalidated and clients must re-acquire.

### How a stash access token is acquired

The outcome of the acquisition request depends on the combination of who is asking and how the stash is configured.

**Claimer (signed-in owner)**

If the account JWT accompanying the request belongs to the user who claimed the stash:

- The signature is not required.
- If the stash has a password, the server returns `PASSWORD_REQUIRED`. The frontend prompts for the password and retries with it.
- On success the token carries `isClaimer = true`, granting full owner permissions.

**Non-claimer — private stash**

Access is denied unconditionally. The signature cannot help.

**Non-claimer — shared stash (or unclaimed stash)**

- A valid HMAC signature must be present (embedded in the share URL).
- If the stash has a password, the server returns `PASSWORD_REQUIRED`. The frontend prompts and retries.
- On success the token carries visitor-level permissions (`isClaimer = false`); write access depends on the stash's configured visitor permissions.

**Unclaimed stash**

Treated the same as a shared stash for non-claimers: signature required, password required if set.

---

## Token Caching and Invalidation

Acquired stash access tokens are cached in `sessionStorage` (keyed by stash ID) to avoid re-acquiring on every page visit. The cache entry includes:

- The token itself.
- Whether it was issued as a claimer token.
- A fingerprint of the account JWT at the time of acquisition.

On the next visit the cached token is accepted only if:

1. It has not expired.
2. The current account fingerprint matches the one stored alongside it.

If either check fails, the token is discarded and fresh acquisition runs. This ensures that switching accounts (or signing in after an anonymous visit) never reuses a token issued under a different identity.

When the backend rejects a token with `TOKEN_VERSION_MISMATCH`, the frontend discards the cached token and immediately re-acquires.

---

## SSE Event Stream

Real-time link updates are delivered over Server-Sent Events. Because `EventSource` does not support custom headers, the client first exchanges its stash access token for a short-lived **SSE ticket** via an authenticated request, then opens the event stream using the ticket as a URL query parameter. The ticket is valid for 15 minutes — longer than the 10-minute SSE connection timeout — so the browser's native auto-reconnect succeeds without requiring a fresh ticket.

---

## Summary Table

| Scenario | Signature required | Password required | Result |
|---|---|---|---|
| Claimer, no password | No | No | Full owner access |
| Claimer, password set | No | Yes | Full owner access |
| Non-claimer, shared, no password | Yes | No | Visitor access |
| Non-claimer, shared, password set | Yes | Yes | Visitor access |
| Non-claimer, private | — | — | Denied |
| Unclaimed stash, no password | Yes | No | Visitor access |
| Unclaimed stash, password set | Yes | Yes | Visitor access |
