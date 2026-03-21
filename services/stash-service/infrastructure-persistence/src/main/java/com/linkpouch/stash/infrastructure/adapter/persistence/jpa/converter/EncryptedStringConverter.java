package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.converter;

import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * JPA AttributeConverter that encrypts/decrypts String values using AES-256-GCM.
 *
 * <p>The encryption key is injected at startup via {@link CryptoKeyHolder} because JPA converters
 * are not Spring beans and cannot use @Value or @Autowired directly.
 *
 * <p>Storage format: base64( iv[12] || ciphertext || tag[16] )
 */
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH_BYTES = 12;
    private static final int TAG_LENGTH_BITS = 128;

    // Set by CryptoKeyHolder at application startup
    private static volatile byte[] keyBytes;

    public static void setKeyBytes(final byte[] bytes) {
        keyBytes = bytes;
    }

    @Override
    public String convertToDatabaseColumn(final String attribute) {
        if (attribute == null) return null;
        if (keyBytes == null) {
            throw new IllegalStateException(
                    "Encryption key not configured (AI_SETTINGS_ENCRYPTION_KEY) — refusing to store API key as plaintext");
        }
        try {
            final SecretKey key = new SecretKeySpec(keyBytes, "AES");
            final byte[] iv = new byte[IV_LENGTH_BYTES];
            new SecureRandom().nextBytes(iv);
            final Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            final byte[] ciphertext = cipher.doFinal(attribute.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            final ByteBuffer buffer = ByteBuffer.allocate(iv.length + ciphertext.length);
            buffer.put(iv);
            buffer.put(ciphertext);
            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt API key", e);
        }
    }

    @Override
    public String convertToEntityAttribute(final String dbData) {
        if (dbData == null) return null;
        if (keyBytes == null) {
            throw new IllegalStateException(
                    "Encryption key not configured (AI_SETTINGS_ENCRYPTION_KEY) — cannot decrypt API key");
        }
        try {
            final byte[] decoded = Base64.getDecoder().decode(dbData);
            final ByteBuffer buffer = ByteBuffer.wrap(decoded);
            final byte[] iv = new byte[IV_LENGTH_BYTES];
            buffer.get(iv);
            final byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);
            final SecretKey key = new SecretKeySpec(keyBytes, "AES");
            final Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(ciphertext), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt API key", e);
        }
    }
}
