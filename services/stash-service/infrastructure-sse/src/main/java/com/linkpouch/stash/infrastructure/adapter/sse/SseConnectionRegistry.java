package com.linkpouch.stash.infrastructure.adapter.sse;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.extern.slf4j.Slf4j;

/**
 * Thread-safe registry of active SSE connections, keyed by stashId. Emitters are automatically
 * deregistered on completion, timeout, or error.
 */
@Slf4j
@Component
public class SseConnectionRegistry {

    private final ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> emitters =
            new ConcurrentHashMap<>();

    /**
     * Register a new SseEmitter for a stash. Cleanup callbacks are attached automatically.
     *
     * @return the registered emitter (same instance passed in)
     */
    public SseEmitter register(final UUID stashId, final SseEmitter emitter) {
        emitters.computeIfAbsent(stashId, k -> new CopyOnWriteArrayList<>()).add(emitter);
        log.debug("SSE client registered for stash {}", stashId);

        final Runnable cleanup = () -> removeEmitter(stashId, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());

        return emitter;
    }

    /**
     * Send an SSE event to all clients subscribed to a stash. Dead emitters are removed
     * automatically.
     */
    public void send(final UUID stashId, final SseEmitter.SseEventBuilder event) {
        final CopyOnWriteArrayList<SseEmitter> stashEmitters = emitters.get(stashId);
        if (stashEmitters == null || stashEmitters.isEmpty()) {
            return;
        }

        final List<SseEmitter> dead = new ArrayList<>();
        for (final SseEmitter emitter : stashEmitters) {
            try {
                emitter.send(event);
            } catch (IOException e) {
                log.debug("Removing dead SSE emitter for stash {}: {}", stashId, e.getMessage());
                dead.add(emitter);
            }
        }
        stashEmitters.removeAll(dead);
    }

    private void removeEmitter(final UUID stashId, final SseEmitter emitter) {
        final CopyOnWriteArrayList<SseEmitter> list = emitters.get(stashId);
        if (list != null) {
            list.remove(emitter);
            log.debug("SSE client deregistered for stash {}", stashId);
        }
    }
}
