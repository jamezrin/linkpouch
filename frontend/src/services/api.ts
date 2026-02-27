import axios from 'axios';
import { Stash, Link, PagedLinkResponse, CreateStashRequest, AddLinkRequest, EmbeddabilityCheckResponse } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const stashApi = {
  createStash: (data: CreateStashRequest) =>
    api.post<Stash>('/stashes', data),

  getStash: (id: string, signature: string) =>
    api.get<Stash>(`/stashes/${id}`, {
      headers: {
        'X-Stash-Signature': signature,
      },
    }),

  deleteStash: (id: string, signature: string) =>
    api.delete(`/stashes/${id}`, {
      headers: {
        'X-Stash-Signature': signature,
      },
    }),

  updateStash: (id: string, signature: string, data: { name: string }) =>
    api.patch<Stash>(`/stashes/${id}`, data, {
      headers: {
        'X-Stash-Signature': signature,
      },
    }),
};

export const linkApi = {
  addLink: (stashId: string, signature: string, data: AddLinkRequest) =>
    api.post<Link>(`/stashes/${stashId}/links`, data, {
      headers: {
        'X-Stash-Signature': signature,
      },
    }),

  listLinks: (stashId: string, signature: string, search?: string, page = 0, size = 20) =>
    api.get<PagedLinkResponse>(`/stashes/${stashId}/links`, {
      headers: {
        'X-Stash-Signature': signature,
      },
      params: { search, page, size },
    }),

  deleteLink: (stashId: string, signature: string, linkId: string) =>
    api.delete(`/stashes/${stashId}/links/${linkId}`, {
      headers: {
        'X-Stash-Signature': signature,
      },
    }),

  refreshScreenshot: (stashId: string, signature: string, linkId: string) =>
    api.post(`/stashes/${stashId}/links/${linkId}/refresh-screenshot`, null, {
      headers: {
        'X-Stash-Signature': signature,
      },
    }),

  reorderLinks: (stashId: string, signature: string, linkIds: string[], insertAfterId: string | null) =>
    api.patch(`/stashes/${stashId}/links`, { linkIds, insertAfterId }, {
      headers: { 'X-Stash-Signature': signature },
    }),

  getScreenshot: (stashId: string, signature: string, linkId: string) =>
    api.get<Blob>(`/stashes/${stashId}/links/${linkId}/screenshot`, {
      headers: {
        'X-Stash-Signature': signature,
      },
      responseType: 'blob',
    }),
};

export const utilsApi = {
  checkEmbeddable: (url: string) =>
    api.get<EmbeddabilityCheckResponse>('/embeddable-check', { params: { url } }),
};
