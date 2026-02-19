package com.linkpouch.stash.domain.port.inbound;

/**
 * Driving Port: URL Signature Validation
 */
public interface SignatureValidationUseCase {
    
    /**
     * Generate a signed URL token for a stash.
     */
    String generateSignature(String stashId, String secretKey);
    
    /**
     * Validate a signature for a stash.
     */
    boolean validateSignature(String stashId, String secretKey, String signature);
    
    /**
     * Build a complete stash URL with signature.
     */
    String buildStashUrl(String baseUrl, String stashId, String signature);
}
