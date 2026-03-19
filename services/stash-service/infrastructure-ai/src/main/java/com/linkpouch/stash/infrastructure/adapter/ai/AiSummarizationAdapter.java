package com.linkpouch.stash.infrastructure.adapter.ai;

import java.util.UUID;

import org.springframework.stereotype.Component;

import com.linkpouch.stash.application.service.AiSummarizationService;
import com.linkpouch.stash.domain.port.outbound.AiSummarizationPort;

import lombok.RequiredArgsConstructor;

/** Bridges the domain's outbound port to the async application service. */
@Component
@RequiredArgsConstructor
public class AiSummarizationAdapter implements AiSummarizationPort {

    private final AiSummarizationService aiSummarizationService;

    @Override
    public void requestSummarization(final UUID linkId, final UUID stashId, final String pageContent) {
        aiSummarizationService.summarize(linkId, stashId, pageContent);
    }
}
