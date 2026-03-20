package com.linkpouch.stash.domain.port.in;

import java.util.UUID;

import com.linkpouch.stash.domain.model.AiSummaryStatus;

public record UpdateAiSummaryCommand(
        UUID linkId,
        UUID stashId,
        String summary,
        AiSummaryStatus status,
        String model,
        Integer inputTokens,
        Integer outputTokens,
        Integer elapsedMs) {}
