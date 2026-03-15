package com.linkpouch.stash.domain.exception;

import java.time.LocalDateTime;

public class SignatureRegeneratedException extends UnauthorizedException {

    public static final String ERROR_CODE = "SIGNATURE_REGENERATED";

    private final LocalDateTime signatureRefreshedAt;

    public SignatureRegeneratedException(final LocalDateTime signatureRefreshedAt) {
        super("This pouch's URL has been regenerated");
        this.signatureRefreshedAt = signatureRefreshedAt;
    }

    public LocalDateTime getSignatureRefreshedAt() {
        return signatureRefreshedAt;
    }
}
