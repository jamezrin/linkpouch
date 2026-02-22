# Linkpouch Security & UI Implementation Plan

## Overview
This plan addresses two critical issues:
1. **Privacy Violation**: Stashes are currently publicly listable via `GET /api/stashes`
2. **UI/UX**: No proper landing page or CTA

**Solution**: Make stashes private by default with signature-based access control and create a professional landing page.

## Architecture Overview

### URL Format
Signed URLs follow: `/s/{stash-id}/{signature}`
- Signature: HMAC-SHA256 of stash ID, encoded Base64url (no padding)
- No expiration (valid forever)
- Stash-specific secret key + master key

### Access Flow
1. User creates stash via landing page
2. System generates signed URL
3. Modal displays URL for copying/sharing
4. Only users with signed URL can access stash

## Phase 1: Backend Security

### 1.1 Update OpenAPI Specification
**File**: `services/stash-service/api-spec/src/main/resources/openapi/stash-api.yaml`

**Changes**:
- Remove `GET /api/stashes` endpoint entirely
- Add `X-Stash-Signature` header requirement to all stash endpoints
- Add new route `/api/stashes/{stashId}/signature` for generating signed URLs
- Update response schemas to exclude stash lists

### 1.2 Remove Public Listing
**Files**:
- `StashController.java`: Remove `listStashes()` method
- `StashManagementService.java`: Remove `listAllStashes()` method  
- `StashRepository.java`: Remove `findAll()` method

### 1.3 Implement Signature Validation
**File**: `StashController.java`

**Changes**:
- Add `X-Stash-Signature` header parameter to all endpoints
- Validate signature on every stash access
- Return 401 Unauthorized for invalid/missing signatures
- Add helper method to extract and validate signature

### 1.4 Signature Generation Service
**File**: `SignatureValidationService.java`

**Enhancements**:
- Add method `generateSignedUrl(stashId)` returning full URL
- HMAC-SHA256 with master key + stash secret
- Base64url encoding without padding
- Store signature validation metadata

## Phase 2: Frontend Redesign

### 2.1 Landing Page
**File**: `frontend/src/pages/HomePage.tsx` (complete rewrite)

**Components**:
- Hero section with tagline and CTA button
- Features grid (3-4 key features with icons)
- How It Works section (3-step process)
- Footer with links

**Design**:
- Clean, modern aesthetic
- Professional color scheme (primary: blue/indigo)
- Responsive layout
- No stash listing/grid

### 2.2 Stash Access Page
**File**: `frontend/src/pages/StashAccessPage.tsx` (new)

**Route**: `/s/:stashId/:signature`

**Functionality**:
- Extract stashId and signature from URL params
- Call API with signature in header
- Display stash details and links
- Handle 401 errors (invalid signature)

### 2.3 API Integration
**File**: `frontend/src/services/api.ts`

**Changes**:
- Remove `listStashes()` method
- Add signature parameter to all stash methods
- Add `X-Stash-Signature` header to requests
- Add `generateSignedUrl(stashId)` method

### 2.4 Routing
**File**: `frontend/src/App.tsx`

**Changes**:
- Add route `/s/:stashId/:signature` -> StashAccessPage
- Keep existing routes for stash creation
- Update navigation if needed

### 2.5 Creation Success Modal
**File**: New component or update existing

**Features**:
- Display generated signed URL
- Copy to clipboard button
- Share instructions
- Close/Create Another button

## Phase 3: Testing & Validation

### Backend Tests
- Signature generation produces valid URLs
- Invalid signatures return 401
- Valid signatures allow access
- List endpoint returns 404

### Frontend Tests  
- Landing page renders correctly
- Stash creation shows modal with URL
- Signed URL access works
- Invalid signature shows error

## Security Considerations

1. **Signature Validation**: Every stash endpoint requires valid signature
2. **No Enumeration**: No endpoints list or enumerate stashes
3. **URL Safety**: URLs contain signature, not stored in browser history safely
4. **Deletion**: Requires signature (prevents accidental deletion)

## Implementation Order

1. **Phase 1.1**: Update OpenAPI spec
2. **Phase 1.2**: Remove listing methods
3. **Phase 1.3**: Add signature validation
4. **Phase 1.4**: Enhance signature service
5. **Phase 2.1**: Create landing page
6. **Phase 2.2**: Create access page
7. **Phase 2.3**: Update API client
8. **Phase 2.4**: Update routes
9. **Phase 2.5**: Add success modal
10. **Phase 3**: Test and verify

## Success Criteria

- [ ] `GET /api/stashes` returns 404
- [ ] All stash endpoints require `X-Stash-Signature` header
- [ ] Landing page has hero, features, and CTA (no stash grid)
- [ ] Stash creation shows modal with signed URL
- [ ] Accessing `/s/{id}/{sig}` with valid signature shows stash
- [ ] Accessing with invalid signature shows 401 error
- [ ] No way to list or discover stashes without signed URL
