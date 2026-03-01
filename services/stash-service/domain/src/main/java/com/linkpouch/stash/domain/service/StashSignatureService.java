package com.linkpouch.stash.domain.service;

import java.util.UUID;

/** Domain Service: Stash Signature Validation and Generation */
public interface StashSignatureService {

    boolean validateSignature(UUID stashId, String stashSecretKey, String signature);

    String generateSignature(UUID stashId, String stashSecretKey);

    String generateSignedUrl(UUID stashId, String stashSecretKey);
}
