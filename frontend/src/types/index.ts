export interface Stash {
  id: string;
  name: string;
  linkCount: number;
  createdAt: string;
  updatedAt: string;
  signedUrl?: string;
}

export interface Link {
  id: string;
  stashId: string;
  url: string;
  title?: string;
  description?: string;
  faviconUrl?: string;
  screenshotUrl?: string;
  screenshotGeneratedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PagedLinkResponse {
  content: Link[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface CreateStashRequest {
  name: string;
  secretKey?: string;
}

export interface AddLinkRequest {
  url: string;
  title?: string;
  description?: string;
}
