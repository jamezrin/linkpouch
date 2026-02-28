package com.linkpouch.stash.infrastructure.adapter.event;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.port.outbound.SseTicketPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Redis-backed implementation of {@link SseTicketPort}.
 *
 * <p>Tickets are stored as {@code sse-ticket:{token}} → {@code stashId} with a 15-minute TTL. They
 * are multi-use within that window so that the browser's native EventSource auto-reconnect
 * (triggered after the 10-minute SSE connection timeout) succeeds without requiring a new ticket.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RedisSseTicketStore implements SseTicketPort {

    /** 15 minutes — intentionally longer than the 10-min SSE timeout to cover reconnects. */
    private static final Duration TTL = Duration.ofMinutes(15);

    private static final String KEY_PREFIX = "sse-ticket:";

    private final StringRedisTemplate redisTemplate;

    @Override
    public String issue(final UUID stashId) {
        final String ticket = UUID.randomUUID().toString().replace("-", "");
        redisTemplate.opsForValue().set(KEY_PREFIX + ticket, stashId.toString(), TTL);
        log.debug("Issued SSE ticket for stash {}", stashId);
        return ticket;
    }

    @Override
    public Optional<UUID> validate(final String ticket) {
        if (ticket == null || ticket.isBlank()) {
            return Optional.empty();
        }
        final String value = redisTemplate.opsForValue().get(KEY_PREFIX + ticket);
        if (value == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(value));
        } catch (final IllegalArgumentException e) {
            log.warn("SSE ticket store contained invalid stashId value: {}", value);
            return Optional.empty();
        }
    }
}
