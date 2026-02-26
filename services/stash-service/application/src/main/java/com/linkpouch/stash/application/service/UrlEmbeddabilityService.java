package com.linkpouch.stash.application.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import com.linkpouch.stash.domain.model.EmbeddabilityResult;
import com.linkpouch.stash.domain.port.inbound.UrlEmbeddabilityUseCase;
import com.linkpouch.stash.domain.port.outbound.UrlInfoPort;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UrlEmbeddabilityService implements UrlEmbeddabilityUseCase {

    private final UrlInfoPort urlInfoPort;

    @Override
    @Cacheable(value = "embeddability", key = "#a0", unless = "#result.reason() == 'unreachable'")
    public EmbeddabilityResult checkEmbeddability(final String url) {
        final var info = urlInfoPort.fetch(url);

        if (!info.reachable()) {
            return EmbeddabilityResult.unreachable();
        }

        final String xfo = info.xFrameOptions();
        if (xfo != null) {
            final String xfoUpper = xfo.trim().toUpperCase();
            if (xfoUpper.equals("DENY") || xfoUpper.equals("SAMEORIGIN")) {
                return EmbeddabilityResult.blocked("X-Frame-Options: " + xfo.trim());
            }
        }

        final String csp = info.contentSecurityPolicy();
        if (csp != null) {
            final String frameAncestors = extractFrameAncestors(csp);
            if (frameAncestors != null && !frameAncestors.contains("*")) {
                return EmbeddabilityResult.blocked(
                        "Content-Security-Policy: frame-ancestors " + frameAncestors.trim());
            }
        }

        return EmbeddabilityResult.ofEmbeddable();
    }

    private String extractFrameAncestors(final String csp) {
        for (final String directive : csp.split(";")) {
            final String trimmed = directive.trim();
            if (trimmed.toLowerCase().startsWith("frame-ancestors")) {
                final int space = trimmed.indexOf(' ');
                return space >= 0 ? trimmed.substring(space + 1) : "";
            }
        }
        return null;
    }
}
