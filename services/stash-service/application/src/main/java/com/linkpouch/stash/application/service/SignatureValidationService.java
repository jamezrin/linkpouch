package com.linkpouch.stash.application.service;

import com.linkpouch.stash.domain.port.inbound.SignatureValidationUseCase;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * Application Service: Signature Validation
 * Implements HMAC-SHA256 URL signing for stash access control.
 */
@Service
public class SignatureValidationService implements SignatureValidationUseCase {
    
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SIG_PREFIX = "sig:";
    
    @Value("${linkpouch.signature.master-key:default-master-key-change-in-production}")
    private String masterKey;
    
    @Override
    public String generateSignature(String stashId, String secretKey) {
        try {
            // Combine stash ID and secret key for signing
            String data = SIG_PREFIX + stashId + ":" + secretKey;
            
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    masterKey.getBytes(StandardCharsets.UTF_8), 
                    HMAC_ALGORITHM
            );
            mac.init(secretKeySpec);
            
            byte[] signatureBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            
            // Use URL-safe Base64 encoding
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signatureBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate signature", e);
        }
    }
    
    @Override
    public boolean validateSignature(String stashId, String secretKey, String signature) {
        String expectedSignature = generateSignature(stashId, secretKey);
        return MessageDigest.isEqual(
                signature.getBytes(StandardCharsets.UTF_8),
                expectedSignature.getBytes(StandardCharsets.UTF_8)
        );
    }
    
    @Override
    public String buildStashUrl(String baseUrl, String stashId, String signature) {
        // Format: /s/{stash-id}/{signature}
        String normalizedBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        return String.format("%s/s/%s/%s", normalizedBase, stashId, signature);
    }
}
