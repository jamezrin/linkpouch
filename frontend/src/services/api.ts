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
  
  getStash: (id: string) => 
    api.get<Stash>(`/stashes/${id}`),
  
  listStashes: () => 
    api.get<Stash[]>('/stashes'),
  
  deleteStash: (id: string) => 
    api.delete(`/stashes/${id}`),
};

export const linkApi = {
  addLink: (stashId: string, data: AddLinkRequest) => 
    api.post<Link>(`/stashes/${stashId}/links`, data),
  
  getLink: (linkId: string) => 
    api.get<Link>(`/links/${linkId}`),
  
  listLinks: (stashId: string, search?: string, page = 0, size = 20) => 
    api.get<PagedLinkResponse>(`/stashes/${stashId}/links`, {
      params: { search, page, size },
    }),
  
  deleteLink: (linkId: string) => 
    api.delete(`/links/${linkId}`),
  
  refreshScreenshot: (linkId: string) => 
    api.post(`/links/${linkId}/refresh-screenshot`),
};
