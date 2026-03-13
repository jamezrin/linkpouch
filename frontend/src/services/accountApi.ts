import { api } from './api';
import { AccountResponse } from '../types/account';

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
};
