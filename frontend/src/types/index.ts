export interface Stash {
  id: string;
  name: string;
  passwordProtected: boolean;
  visibility: 'SHARED' | 'PRIVATE';
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
  position?: number;
  status?: 'PENDING' | 'INDEXED' | 'FAILED';
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
  password?: string;
}

export interface AddLinkRequest {
  url: string;
  title?: string;
  description?: string;
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface WaybackMonthSummary {
  year: number;
  month: number; // 1-12
  count: number;
  latestTimestamp: string; // e.g. "20231115142032"
}

export interface WaybackSnapshot {
  timestamp: string; // e.g. "20231115142032"
  statuscode: string;
}

export interface EmbeddabilityCheckResponse {
  embeddable: boolean;
  reason?: string;
}

export interface BulkImportError {
  url: string;
  reason: string;
}

export interface BulkImportRequest {
  urls: string[];
}

export interface BulkImportResponse {
  imported: number;
  skipped: number;
  errors: BulkImportError[];
  links: Link[];
}

export interface StashHistoryEntry {
  stashId: string;
  name: string;
  signature: string;    // HMAC signature — used to reconstruct /s/:stashId/:signature
  lastOpenedAt: string; // ISO 8601 timestamp
}
