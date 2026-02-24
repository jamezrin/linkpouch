import axios from 'axios';
import { Stash, Link, PagedLinkResponse, CreateStashRequest, AddLinkRequest } from '../types';

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
  
  getLink: (linkId: string) => 
    api.get<Link>(`/links/${linkId}`),
  
  listLinks: (stashId: string, signature: string, search?: string, page = 0, size = 20) => 
    api.get<PagedLinkResponse>(`/stashes/${stashId}/links`, {
      headers: {
        'X-Stash-Signature': signature,
      },
      params: { search, page, size },
    }),
  
  deleteLink: (linkId: string) => 
    api.delete(`/links/${linkId}`),
  
  refreshScreenshot: (linkId: string) =>
    api.post(`/links/${linkId}/refresh-screenshot`),

  reorderLinks: (stashId: string, signature: string, linkIds: string[]) =>
    api.patch(`/stashes/${stashId}/links`, { linkIds }, {
      headers: { 'X-Stash-Signature': signature },
    }),
};
