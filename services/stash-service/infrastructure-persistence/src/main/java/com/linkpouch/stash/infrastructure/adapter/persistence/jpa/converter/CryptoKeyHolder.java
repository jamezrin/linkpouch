package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.converter;

import java.util.Base64;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * Initialises the static key in {@link EncryptedStringConverter} at startup.
 *
 * <p>JPA converters are not Spring beans; this component acts as a bridge from Spring's
 * environment to the static field used by the converter.
 */
@Slf4j
@Component
public class CryptoKeyHolder {

    @Value("${linkpouch.ai.encryption-key:}")
    private String encryptionKeyBase64;

    @PostConstruct
    public void init() {
        if (encryptionKeyBase64 == null || encryptionKeyBase64.isBlank()) {
            log.warn("LINKPOUCH_AI_ENCRYPTION_KEY is not set — API keys will NOT be encrypted");
            return;
        }
        try {
            final byte[] keyBytes = Base64.getDecoder().decode(encryptionKeyBase64.trim());
            if (keyBytes.length != 32) {
                throw new IllegalArgumentException(
                        "LINKPOUCH_AI_ENCRYPTION_KEY must be a 32-byte (256-bit) base64-encoded key, got "
                                + keyBytes.length + " bytes");
            }
            EncryptedStringConverter.setKeyBytes(keyBytes);
            log.info("AI API key encryption initialised");
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Invalid LINKPOUCH_AI_ENCRYPTION_KEY: " + e.getMessage(), e);
        }
    }
}
