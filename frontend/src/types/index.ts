export interface Stash {
  id: string;
  name: string;
  passwordProtected: boolean;
  visibility: 'SHARED' | 'PRIVATE';
  linkPermissions: 'FULL' | 'READ_ONLY';
  linkCount: number;
  createdAt: string;
  updatedAt: string;
  signedUrl?: string;
}

export interface Folder {
  id: string;
  stashId: string;
  parentFolderId?: string | null;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
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
  folderId?: string | null;
  status?: 'PENDING' | 'INDEXED' | 'FAILED';
  aiSummary?: string | null;
  aiSummaryStatus?: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  aiSummaryModel?: string | null;
  aiSummaryInputTokens?: number | null;
  aiSummaryOutputTokens?: number | null;
  aiSummaryElapsedMs?: number | null;
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
  folderId?: string | null;
}

export interface CreateFolderRequest {
  name: string;
  parentFolderId?: string | null;
}

export interface RenameFolderRequest {
  name: string;
}

export interface MoveFolderRequest {
  newParentFolderId?: string | null;
  insertAfterId?: string | null;
}

export interface MoveLinkToFolderRequest {
  folderId?: string | null;
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
  isClaimer: boolean;
  isStashClaimed: boolean;
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
