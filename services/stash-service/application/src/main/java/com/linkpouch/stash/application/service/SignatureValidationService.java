package com.linkpouch.stash.application.service;

import com.linkpouch.stash.domain.model.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.UUID;

/**
 * Application Service: Signature Validation
 * Handles HMAC-SHA256 signature generation and validation for stash access control.
 */
@Slf4j
@Service
public class SignatureValidationService {

    private static final String ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder BASE64URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64URL_DECODER = Base64.getUrlDecoder();
    
    private final String masterKey;
    private final String baseUrl;
    
    public SignatureValidationService(
            @Value("${linkpouch.signature.master-key}") String masterKey,
            @Value("${linkpouch.base-url:http://localhost:8080}") String baseUrl) {
        this.masterKey = masterKey;
        this.baseUrl = baseUrl;
    }
    
    /**
     * Generates a signed URL for accessing a stash.
     * Format: /s/{stash-id}/{signature}
     * 
     * @param stashId The stash ID
     * @param stashSecretKey The stash's secret key
     * @return The full signed URL
     */
    public String generateSignedUrl(UUID stashId, String stashSecretKey) {
        String signature = generateSignature(stashId, stashSecretKey);
        return baseUrl + "/s/" + stashId + "/" + signature;
    }
    
    /**
     * Generates just the signature component for a stash.
     * 
     * @param stashId The stash ID
     * @param stashSecretKey The stash's secret key
     * @return The Base64url-encoded signature
     */
    public String generateSignature(UUID stashId, String stashSecretKey) {
        try {
            String data = stashId.toString();
            String combinedSecret = combineSecrets(stashSecretKey);
            
            Mac mac = Mac.getInstance(ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                combinedSecret.getBytes(StandardCharsets.UTF_8), 
                ALGORITHM
            );
            mac.init(secretKeySpec);
            
            byte[] signatureBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return BASE64URL_ENCODER.encodeToString(signatureBytes);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            log.error("Failed to generate signature for stash: {}", stashId, e);
            throw new RuntimeException("Signature generation failed", e);
        }
    }
    
    /**
     * Validates a signature for a stash.
     * 
     * @param stashId The stash ID
     * @param stashSecretKey The stash's secret key
     * @param signature The signature to validate
     * @return true if the signature is valid, false otherwise
     */
    public boolean validateSignature(UUID stashId, String stashSecretKey, String signature) {
        if (signature == null || signature.isEmpty()) {
            return false;
        }
        
        try {
            String expectedSignature = generateSignature(stashId, stashSecretKey);
            return MessageDigest.isEqual(
                signature.getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.warn("Signature validation failed for stash: {}", stashId, e);
            return false;
        }
    }
    
    /**
     * Combines the stash-specific secret with the master key.
     */
    private String combineSecrets(String stashSecretKey) {
        return stashSecretKey + ":" + masterKey;
    }
}
