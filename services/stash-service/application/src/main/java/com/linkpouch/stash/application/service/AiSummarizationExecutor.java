package com.linkpouch.stash.application.service;

import java.util.UUID;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.outbound.LinkStatusBroadcaster;
import com.linkpouch.stash.domain.port.outbound.StashRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Handles transactional writes for AI summarization state transitions and broadcasts SSE updates.
 * Kept as a separate bean from AiSummarizationService so @Transactional and @Async can be applied
 * to different beans (Spring cannot apply both proxies to the same bean).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiSummarizationExecutor {

    private final StashRepository stashRepository;
    private final LinkStatusBroadcaster linkStatusBroadcaster;

    @Transactional
    public void markGenerating(final UUID linkId, final UUID stashId) {
        final Link link = loadAndMutate(linkId, stashId, Link::markAiSummaryGenerating);
        linkStatusBroadcaster.broadcastLinkUpdated(stashId, link);
        log.debug("AI summary GENERATING for link {}", linkId);
    }

    @Transactional
    public void completeSummary(final UUID linkId, final UUID stashId, final String summary) {
        final Link link = loadAndMutate(linkId, stashId, l -> l.updateAiSummary(summary));
        linkStatusBroadcaster.broadcastLinkUpdated(stashId, link);
        log.debug("AI summary COMPLETED for link {}", linkId);
    }

    @Transactional
    public void markFailed(final UUID linkId, final UUID stashId) {
        final Link link = loadAndMutate(linkId, stashId, Link::markAiSummaryFailed);
        linkStatusBroadcaster.broadcastLinkUpdated(stashId, link);
        log.debug("AI summary FAILED for link {}", linkId);
    }

    @Transactional
    public void markSkipped(final UUID linkId, final UUID stashId) {
        final Link link = loadAndMutate(linkId, stashId, Link::markAiSummarySkipped);
        linkStatusBroadcaster.broadcastLinkUpdated(stashId, link);
        log.debug("AI summary SKIPPED for link {}", linkId);
    }

    private Link loadAndMutate(final UUID linkId, final UUID stashId, final java.util.function.Consumer<Link> mutator) {
        final Stash stash = stashRepository
                .findByIdWithLinks(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));
        final Link domainLink = stash.getLinks().stream()
                .filter(l -> l.getId().equals(linkId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Link not found in stash: " + linkId));
        mutator.accept(domainLink);
        final Stash saved = stashRepository.save(stash);
        return saved.getLinks().stream()
                .filter(l -> l.getId().equals(linkId))
                .findFirst()
                .orElse(domainLink);
    }
}
