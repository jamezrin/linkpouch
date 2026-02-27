package com.linkpouch.stash.application.service;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import lombok.extern.slf4j.Slf4j;

/**
 * Application Service: Signature Validation Handles HMAC-SHA256 signature generation and validation
 * for stash access control.
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
            @Value("${linkpouch.signature.master-key}") final String masterKey,
            @Value("${linkpouch.base-url:http://localhost:8080}") final String baseUrl) {
        if (masterKey == null || masterKey.isBlank()) {
            throw new IllegalStateException(
                    "SIGNATURE_MASTER_KEY environment variable must be set to a strong secret");
        }
        this.masterKey = masterKey;
        this.baseUrl = baseUrl;
    }

    /**
     * Generates a signed URL for accessing a stash. Format: /s/{stash-id}/{signature}
     *
     * @param stashId The stash ID
     * @param stashSecretKey The stash's secret key
     * @return The full signed URL
     */
    public String generateSignedUrl(final UUID stashId, final String stashSecretKey) {
        final String signature = generateSignature(stashId, stashSecretKey);
        return baseUrl + "/s/" + stashId + "/" + signature;
    }

    /**
     * Generates just the signature component for a stash.
     *
     * @param stashId The stash ID
     * @param stashSecretKey The stash's secret key
     * @return The Base64url-encoded signature
     */
    public String generateSignature(final UUID stashId, final String stashSecretKey) {
        try {
            final String data = stashId.toString();
            final String combinedSecret = combineSecrets(stashSecretKey);

            final Mac mac = Mac.getInstance(ALGORITHM);
            final SecretKeySpec secretKeySpec =
                    new SecretKeySpec(combinedSecret.getBytes(StandardCharsets.UTF_8), ALGORITHM);
            mac.init(secretKeySpec);

            final byte[] signatureBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
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
    public boolean validateSignature(
            final UUID stashId, final String stashSecretKey, final String signature) {
        if (signature == null || signature.isEmpty()) {
            return false;
        }

        try {
            final String expectedSignature = generateSignature(stashId, stashSecretKey);
            return MessageDigest.isEqual(
                    signature.getBytes(StandardCharsets.UTF_8),
                    expectedSignature.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.warn("Signature validation failed for stash: {}", stashId, e);
            return false;
        }
    }

    /** Combines the stash-specific secret with the master key. */
    private String combineSecrets(final String stashSecretKey) {
        return stashSecretKey + ":" + masterKey;
    }
}
