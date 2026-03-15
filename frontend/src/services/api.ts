import axios from 'axios';
import {
  Stash,
  Link,
  PagedLinkResponse,
  CreateStashRequest,
  AddLinkRequest,
  AccessTokenResponse,
  EmbeddabilityCheckResponse,
  BulkImportRequest,
  BulkImportResponse,
} from '../types';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/** Returns the sessionStorage key used to store the JWT for a stash. */
export const tokenStorageKey = (stashId: string) => `token:${stashId}`;

/** Returns the sessionStorage key used to store the HMAC signature for a stash. */
export const signatureStorageKey = (stashId: string) => `sig:${stashId}`;

/** Returns the sessionStorage key used to store the isClaimer flag for a stash. */
export const claimerStorageKey = (stashId: string) => `claimer:${stashId}`;

/**
 * Returns the sessionStorage key used to store the account fingerprint alongside a stash token.
 * Used to detect when the signed-in account has changed since the token was cached.
 */
export const accountFingerprintKey = (stashId: string) => `acct-fp:${stashId}`;

/**
 * Derives a short fingerprint from an account JWT (the first 16 chars of the payload section).
 * Different accounts always have different payload sections so this reliably detects account changes.
 * An empty string is returned when there is no account JWT (anonymous access).
 */
export function accountFingerprint(accountJwt: string | null | undefined): string {
  if (!accountJwt) return '';
  const payload = accountJwt.split('.')[1] ?? '';
  return payload.slice(0, 16);
}

/** Checks whether a stored JWT is still valid (not expired). */
export function isTokenValid(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

const bearerHeader = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export const stashApi = {
  createStash: (data: CreateStashRequest, accountJwt?: string | null) =>
    api.post<Stash>('/stashes', data, {
      headers: accountJwt ? bearerHeader(accountJwt) : {},
    }),

  /** Exchanges credentials for a short-lived JWT.
   *  @param signature   HMAC signature (required for non-private stashes; null for private stash claimer access)
   *  @param password    optional password (required when the stash is password-protected)
   *  @param accountJwt  optional account JWT; if present and the account is the claimer, isClaimer=true is returned
   */
  acquireAccessToken: (stashId: string, signature: string | null, password?: string, accountJwt?: string) =>
    api.post<AccessTokenResponse>(
      `/stashes/${stashId}/access-token`,
      password ? { password } : {},
      {
        headers: {
          ...(signature ? { 'X-Stash-Signature': signature } : {}),
          ...(accountJwt ? { Authorization: `Bearer ${accountJwt}` } : {}),
        },
      },
    ),

  getStash: (id: string, accessToken: string) =>
    api.get<Stash>(`/stashes/${id}`, {
      headers: bearerHeader(accessToken),
    }),

  createSseTicket: (stashId: string, accessToken: string) =>
    api.post<{ ticket: string; expiresIn: number }>(`/stashes/${stashId}/sse-ticket`, null, {
      headers: bearerHeader(accessToken),
    }),

  deleteStash: (id: string, accessToken: string) =>
    api.delete(`/stashes/${id}`, {
      headers: bearerHeader(accessToken),
    }),

  updateStash: (id: string, accessToken: string, data: { name: string }) =>
    api.patch<Stash>(`/stashes/${id}`, data, {
      headers: bearerHeader(accessToken),
    }),

  /** Sets or changes the stash password. Requires a valid claimer Bearer token. */
  setPassword: (stashId: string, password: string, currentAccessToken?: string) =>
    api.put<Stash>(`/stashes/${stashId}/password`, { password }, {
      headers: currentAccessToken ? bearerHeader(currentAccessToken) : {},
    }),

  /** Removes the stash password. Requires a valid claimer Bearer token. */
  removePassword: (stashId: string, accessToken: string) =>
    api.delete(`/stashes/${stashId}/password`, {
      headers: bearerHeader(accessToken),
    }),

  /** Regenerates the stash signature, invalidating all old shared URLs. Returns the stash with new signedUrl. */
  regenerateSignature: (stashId: string, accessToken: string) =>
    api.post<Stash>(`/stashes/${stashId}/regenerate-signature`, null, {
      headers: bearerHeader(accessToken),
    }),
};

export const linkApi = {
  addLink: (stashId: string, accessToken: string, data: AddLinkRequest) =>
    api.post<Link>(`/stashes/${stashId}/links`, data, {
      headers: bearerHeader(accessToken),
    }),

  listLinks: (stashId: string, accessToken: string, search?: string, page = 0, size = 20) =>
    api.get<PagedLinkResponse>(`/stashes/${stashId}/links`, {
      headers: bearerHeader(accessToken),
      params: { search, page, size },
    }),

  deleteLink: (stashId: string, accessToken: string, linkId: string) =>
    api.delete(`/stashes/${stashId}/links/${linkId}`, {
      headers: bearerHeader(accessToken),
    }),

  putLinkScreenshot: (stashId: string, accessToken: string, linkId: string) =>
    api.put(`/stashes/${stashId}/links/${linkId}/screenshot`, null, {
      headers: bearerHeader(accessToken),
    }),

  batchDeleteLinks: (stashId: string, accessToken: string, linkIds: string[]) =>
    api.post(`/stashes/${stashId}/links/batch-delete`, { linkIds }, {
      headers: bearerHeader(accessToken),
    }),

  putBatchLinkScreenshot: (stashId: string, accessToken: string, linkIds: string[]) =>
    api.put(`/stashes/${stashId}/links/batch-screenshot`, { linkIds }, {
      headers: bearerHeader(accessToken),
    }),

  reorderLinks: (
    stashId: string,
    accessToken: string,
    linkIds: string[],
    insertAfterId: string | null,
  ) =>
    api.patch(`/stashes/${stashId}/links`, { linkIds, insertAfterId }, {
      headers: bearerHeader(accessToken),
    }),

  addLinksBatch: (stashId: string, accessToken: string, data: BulkImportRequest) =>
    api.post<BulkImportResponse>(`/stashes/${stashId}/links/batch`, data, {
      headers: bearerHeader(accessToken),
    }),

  /** Returns a screenshot URL that embeds the JWT as a query param for <img src> usage. */
  screenshotUrl: (stashId: string, linkId: string, accessToken: string) =>
    `/api/stashes/${stashId}/links/${linkId}/screenshot?token=${encodeURIComponent(accessToken)}`,
};

export const utilsApi = {
  checkEmbeddable: (url: string) =>
    api.get<EmbeddabilityCheckResponse>('/embeddable-check', { params: { url } }),
};
