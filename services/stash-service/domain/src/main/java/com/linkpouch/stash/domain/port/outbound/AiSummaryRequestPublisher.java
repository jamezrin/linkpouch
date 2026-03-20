package com.linkpouch.stash.domain.port.outbound;

import java.util.UUID;

import com.linkpouch.stash.domain.model.AiProvider;

public interface AiSummaryRequestPublisher {

    /** Publishes an AI summary request to the Redis Stream for async processing by the indexer. */
    void publishRequest(
            UUID linkId,
            UUID stashId,
            String pageContent,
            AiProvider provider,
            String apiKey,
            String model,
            String systemPrompt);
}
