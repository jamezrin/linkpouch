import { api } from './api';
import { AccountResponse, ClaimedStashPage, StashVisibility } from '../types/account';

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

  updateLinkPermissions: (token: string, stashId: string, permissions: 'FULL' | 'READ_ONLY') =>
    api.put<void>(`/account/stashes/${stashId}/link-permissions`, { permissions }, {
      headers: bearerHeader(token),
    }),

  listStashes: (token: string, params: { search?: string; sort?: string; page?: number; size?: number }) =>
    api.get<ClaimedStashPage>('/account/stashes', {
      headers: bearerHeader(token),
      params,
    }),
};
