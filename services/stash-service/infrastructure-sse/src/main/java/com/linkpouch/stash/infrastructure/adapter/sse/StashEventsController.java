package com.linkpouch.stash.infrastructure.adapter.sse;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.application.exception.UnauthorizedException;
import com.linkpouch.stash.application.service.SignatureValidationService;
import com.linkpouch.stash.application.service.StashManagementService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST Controller: Stash Events Exposes an SSE endpoint that clients can subscribe to in order to
 * receive real-time link status updates for a stash.
 *
 * <p>Authentication: same HMAC-SHA256 signature used by all stash endpoints, passed as a {@code
 * ?sig=} query parameter because the browser's native EventSource API does not support custom
 * request headers.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class StashEventsController {

    /** 10 minutes in milliseconds. EventSource auto-reconnects after timeout. */
    private static final long SSE_TIMEOUT_MS = 10L * 60 * 1_000;

    private final StashManagementService stashService;
    private final SignatureValidationService signatureService;
    private final SseConnectionRegistry registry;

    @Value("${linkpouch.signature.master-key}")
    private String masterKey;

    @GetMapping(value = "/stashes/{stashId}/events")
    public SseEmitter subscribeToStashEvents(
            @PathVariable("stashId") final UUID stashId,
            @RequestParam(name = "sig") final String sig) {
        final var stash =
                stashService
                        .findStashById(stashId)
                        .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        if (!signatureService.validateSignature(
                stashId, stash.getSecretKey().getValue(), sig)) {
            throw new UnauthorizedException("Invalid signature");
        }

        log.debug("New SSE subscription for stash {}", stashId);
        final SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        return registry.register(stashId, emitter);
    }
}
