import { api } from './api';
import { AccountResponse, StashVisibility } from '../types/account';
import { AccessTokenResponse } from '../types';

const bearerHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const accountApi = {
  getAccount: (token: string) =>
    api.get<AccountResponse>('/account/me', {
      headers: bearerHeader(token),
    }),

  claimStash: (token: string, body: { stashId: string; signature: string; password?: string }) =>
    api.post<void>('/account/stashes/claim', body, {
      headers: bearerHeader(token),
    }),

  disownStash: (token: string, stashId: string) =>
    api.delete<void>(`/account/stashes/${stashId}`, {
      headers: bearerHeader(token),
    }),

  updateVisibility: (token: string, stashId: string, visibility: StashVisibility) =>
    api.put<void>(`/account/stashes/${stashId}/visibility`, { visibility }, {
      headers: bearerHeader(token),
    }),

  /** Acquires a stash access token using the account JWT (no signature required). */
  acquireStashAccess: (token: string, stashId: string) =>
    api.post<AccessTokenResponse>(`/account/stashes/${stashId}/access-token`, null, {
      headers: bearerHeader(token),
    }),
};
