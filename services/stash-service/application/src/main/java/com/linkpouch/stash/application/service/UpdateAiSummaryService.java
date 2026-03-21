package com.linkpouch.stash.application.service;

import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.AiSummaryStatus;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.port.in.UpdateAiSummaryCommand;
import com.linkpouch.stash.domain.port.in.UpdateAiSummaryUseCase;
import com.linkpouch.stash.domain.port.outbound.LinkStatusBroadcaster;
import com.linkpouch.stash.domain.port.outbound.StashRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@UseCase
@RequiredArgsConstructor
public class UpdateAiSummaryService implements UpdateAiSummaryUseCase {

    private final StashRepository stashRepository;
    private final LinkStatusBroadcaster linkStatusBroadcaster;

    @Override
    @Transactional
    public void execute(final UpdateAiSummaryCommand command) {
        final Stash stash = stashRepository
                .findByIdWithLinks(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));

        final Link domainLink = stash.getLinks().stream()
                .filter(l -> l.getId().equals(command.linkId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Link not found in stash: " + command.linkId()));

        if (command.status() == AiSummaryStatus.COMPLETED
                && command.summary() != null
                && !command.summary().isBlank()) {
            domainLink.updateAiSummary(
                    command.summary(),
                    command.model(),
                    command.inputTokens(),
                    command.outputTokens(),
                    command.elapsedMs());
        } else {
            domainLink.markAiSummaryFailed();
        }

        final Stash saved = stashRepository.save(stash);
        final Link savedLink = saved.getLinks().stream()
                .filter(l -> l.getId().equals(command.linkId()))
                .findFirst()
                .orElse(domainLink);

        linkStatusBroadcaster.broadcastLinkUpdated(savedLink.getStashId(), savedLink);
        log.debug("AI summary updated for link {}: status={}", command.linkId(), savedLink.getAiSummaryStatus());
    }
}
