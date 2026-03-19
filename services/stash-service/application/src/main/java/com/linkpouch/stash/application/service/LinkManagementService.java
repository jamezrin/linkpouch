package com.linkpouch.stash.application.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.event.LinkAddedEvent;
import com.linkpouch.stash.domain.event.ScreenshotRefreshRequestedEvent;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.LinkStatus;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.model.Url;
import com.linkpouch.stash.domain.port.in.AddLinkCommand;
import com.linkpouch.stash.domain.port.in.AddLinkUseCase;
import com.linkpouch.stash.domain.port.in.AddLinksBatchCommand;
import com.linkpouch.stash.domain.port.in.AddLinksBatchUseCase;
import com.linkpouch.stash.domain.port.in.DeleteLinkUseCase;
import com.linkpouch.stash.domain.port.in.DeleteLinksBatchCommand;
import com.linkpouch.stash.domain.port.in.DeleteLinksBatchUseCase;
import com.linkpouch.stash.domain.port.in.ListLinksCommand;
import com.linkpouch.stash.domain.port.in.ListLinksQuery;
import com.linkpouch.stash.domain.port.in.MoveLinkToFolderCommand;
import com.linkpouch.stash.domain.port.in.MoveLinkToFolderUseCase;
import com.linkpouch.stash.domain.port.in.PagedResult;
import com.linkpouch.stash.domain.port.in.PutBatchLinkScreenshotUseCase;
import com.linkpouch.stash.domain.port.in.ReorderLinksCommand;
import com.linkpouch.stash.domain.port.in.ReorderLinksUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkMetadataCommand;
import com.linkpouch.stash.domain.port.in.UpdateLinkMetadataUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkScreenshotUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkStatusUseCase;
import com.linkpouch.stash.domain.port.outbound.AiSummarizationPort;
import com.linkpouch.stash.domain.port.outbound.EventPublisher;
import com.linkpouch.stash.domain.port.outbound.LinkRepository;
import com.linkpouch.stash.domain.port.outbound.LinkStatusBroadcaster;
import com.linkpouch.stash.domain.port.outbound.ScreenshotStorage;
import com.linkpouch.stash.domain.port.outbound.StashRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Application Service: Link Management Implements use cases with transaction boundaries at the
 * application layer.
 *
 * <p>Note: FindLinkByIdQuery and RequestScreenshotRefreshUseCase are not implemented directly here
 * because they conflict with DeleteLinkUseCase over the void/Optional execute(UUID) signature.
 * Thin adapter beans in this package delegate to the public methods below.
 */
@Slf4j
@UseCase
@RequiredArgsConstructor
public class LinkManagementService
        implements AddLinkUseCase,
                AddLinksBatchUseCase,
                DeleteLinkUseCase,
                DeleteLinksBatchUseCase,
                PutBatchLinkScreenshotUseCase,
                UpdateLinkMetadataUseCase,
                UpdateLinkScreenshotUseCase,
                UpdateLinkStatusUseCase,
                ReorderLinksUseCase,
                MoveLinkToFolderUseCase,
                ListLinksQuery {

    private final LinkRepository linkRepository;
    private final StashRepository stashRepository;
    private final EventPublisher eventPublisher;
    private final LinkStatusBroadcaster linkStatusBroadcaster;
    private final ScreenshotStorage screenshotStorage;
    private final AiSummarizationPort aiSummarizationPort;

    // ==================== AddLinkUseCase ====================

    @Override
    @Transactional
    public Link execute(final AddLinkCommand command) {
        final Stash stash = stashRepository
                .findByIdWithLinks(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));

        linkRepository.shiftPositionsDown(command.stashId(), command.folderId());
        final Link link = Link.create(command.stashId(), command.url(), command.folderId(), 0);
        stash.addLink(link);
        final Stash saved = stashRepository.save(stash);

        final Link savedLink = saved.getLinks().stream()
                .filter(l -> l.getId().equals(link.getId()))
                .findFirst()
                .orElse(link);

        eventPublisher.publishLinkAdded(new LinkAddedEvent(savedLink.getId(), command.stashId(), command.url()));

        return savedLink;
    }

    // ==================== AddLinksBatchUseCase ====================

    @Override
    @Transactional
    public AddLinksBatchResult execute(final AddLinksBatchCommand command) {
        final UUID stashId = command.stashId();
        final List<String> urls = command.urls();

        if (urls == null || urls.isEmpty()) throw new IllegalArgumentException("urls list must not be empty");
        if (urls.size() > 100) throw new IllegalArgumentException("urls list must not exceed 100 items");

        stashRepository.findById(stashId).orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        final Set<String> existingUrls = linkRepository.findUrlsByStashId(stashId);
        final Set<String> seenInBatch = new LinkedHashSet<>();
        final List<String> validUrls = new ArrayList<>();
        final List<BatchLinkError> errors = new ArrayList<>();

        for (final String rawUrl : urls) {
            final String url = rawUrl == null ? null : rawUrl.trim();
            try {
                Url.of(url);
            } catch (IllegalArgumentException e) {
                errors.add(new BatchLinkError(rawUrl, e.getMessage()));
                continue;
            }
            if (!seenInBatch.add(url)) {
                errors.add(new BatchLinkError(url, "Duplicate URL in batch"));
                continue;
            }
            if (existingUrls.contains(url)) {
                errors.add(new BatchLinkError(url, "URL already exists in stash"));
                continue;
            }
            validUrls.add(url);
        }

        if (validUrls.isEmpty()) {
            return new AddLinksBatchResult(0, urls.size(), errors, List.of());
        }

        linkRepository.shiftPositionsDownBy(stashId, validUrls.size());

        // Reload stash with links AFTER shift so domain-model positions are current
        final Stash stash = stashRepository
                .findByIdWithLinks(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        final List<Link> newLinks = new ArrayList<>();
        for (int i = 0; i < validUrls.size(); i++) {
            final Link link = Link.create(stashId, validUrls.get(i), i);
            stash.addLink(link);
            newLinks.add(link);
        }

        final Stash savedStash = stashRepository.save(stash);

        final List<Link> saved = new ArrayList<>();
        for (final Link newLink : newLinks) {
            final Link s = savedStash.getLinks().stream()
                    .filter(l -> l.getId().equals(newLink.getId()))
                    .findFirst()
                    .orElse(newLink);
            saved.add(s);
            eventPublisher.publishLinkAdded(
                    new LinkAddedEvent(s.getId(), stashId, s.getUrl().getValue()));
        }

        return new AddLinksBatchResult(validUrls.size(), urls.size() - validUrls.size(), errors, saved);
    }

    // ==================== DeleteLinkUseCase ====================

    @Override
    @Transactional
    public void execute(final UUID linkId) {
        final Link link =
                linkRepository.findById(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        final Stash stash = stashRepository
                .findByIdWithLinks(link.getStashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + link.getStashId()));

        stash.removeLink(link);
        stashRepository.save(stash);

        if (link.getScreenshotKey() != null) {
            screenshotStorage.delete(link.getScreenshotKey().getValue());
        }
    }

    // ==================== DeleteLinksBatchUseCase ====================

    @Override
    @Transactional
    public void execute(final DeleteLinksBatchCommand command) {
        final Stash stash = stashRepository
                .findByIdWithLinks(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));

        final List<String> screenshotKeys = new ArrayList<>();
        for (final UUID linkId : command.linkIds()) {
            final Link link = stash.getLinks().stream()
                    .filter(l -> l.getId().equals(linkId))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Link not found in stash: " + linkId));
            if (link.getScreenshotKey() != null) {
                screenshotKeys.add(link.getScreenshotKey().getValue());
            }
            stash.removeLink(link);
        }

        stashRepository.save(stash);

        for (final String key : screenshotKeys) {
            screenshotStorage.delete(key);
        }
    }

    // ==================== PutBatchLinkScreenshotUseCase ====================

    @Override
    @Transactional
    public void execute(final UUID stashId, final List<UUID> linkIds) {
        final Stash stash = stashRepository
                .findByIdWithLinks(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        final List<Link> targetLinks = new ArrayList<>();
        for (final UUID linkId : linkIds) {
            final Link domainLink = stash.getLinks().stream()
                    .filter(l -> l.getId().equals(linkId))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Link not found in stash: " + linkId));
            domainLink.markScreenshotRefreshPending();
            targetLinks.add(domainLink);
        }

        final Stash saved = stashRepository.save(stash);

        for (final Link targetLink : targetLinks) {
            final Link savedLink = saved.getLinks().stream()
                    .filter(l -> l.getId().equals(targetLink.getId()))
                    .findFirst()
                    .orElse(targetLink);
            linkStatusBroadcaster.broadcastLinkUpdated(savedLink.getStashId(), savedLink);
            eventPublisher.publishScreenshotRefreshRequested(new ScreenshotRefreshRequestedEvent(
                    savedLink.getId(),
                    savedLink.getStashId(),
                    savedLink.getUrl().getValue()));
        }
    }

    // ==================== UpdateLinkMetadataUseCase ====================

    @Override
    @Transactional
    public Link execute(final UpdateLinkMetadataCommand command) {
        final Link link = linkRepository
                .findById(command.linkId())
                .orElseThrow(() -> new NotFoundException("Link not found: " + command.linkId()));

        final Stash stash = stashRepository
                .findByIdWithLinks(link.getStashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + link.getStashId()));

        final Link domainLink = stash.getLinks().stream()
                .filter(l -> l.getId().equals(command.linkId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Link not found in stash: " + command.linkId()));

        domainLink.updateMetadata(
                command.title(),
                command.description(),
                command.faviconUrl(),
                command.pageContent(),
                command.finalUrl());

        final Stash saved = stashRepository.save(stash);
        final Link savedLink = saved.getLinks().stream()
                .filter(l -> l.getId().equals(command.linkId()))
                .findFirst()
                .orElse(domainLink);

        linkStatusBroadcaster.broadcastLinkUpdated(savedLink.getStashId(), savedLink);
        aiSummarizationPort.requestSummarization(savedLink.getId(), savedLink.getStashId(), savedLink.getPageContent());
        return savedLink;
    }

    // ==================== UpdateLinkScreenshotUseCase ====================

    @Override
    @Transactional
    public Link execute(final UUID linkId, final String screenshotKey) {
        final Link link =
                linkRepository.findById(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        final Stash stash = stashRepository
                .findByIdWithLinks(link.getStashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + link.getStashId()));

        final Link domainLink = stash.getLinks().stream()
                .filter(l -> l.getId().equals(linkId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Link not found in stash: " + linkId));

        domainLink.updateScreenshot(screenshotKey);
        final Stash saved = stashRepository.save(stash);
        final Link savedLink = saved.getLinks().stream()
                .filter(l -> l.getId().equals(linkId))
                .findFirst()
                .orElse(domainLink);

        linkStatusBroadcaster.broadcastLinkUpdated(savedLink.getStashId(), savedLink);
        return savedLink;
    }

    // ==================== UpdateLinkStatusUseCase ====================

    @Override
    @Transactional
    public Link execute(final UUID linkId, final LinkStatus status) {
        final Link link =
                linkRepository.findById(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        final Stash stash = stashRepository
                .findByIdWithLinks(link.getStashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + link.getStashId()));

        final Link domainLink = stash.getLinks().stream()
                .filter(l -> l.getId().equals(linkId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Link not found in stash: " + linkId));

        if (status == LinkStatus.FAILED) {
            domainLink.markFailed();
        }

        final Stash saved = stashRepository.save(stash);
        final Link savedLink = saved.getLinks().stream()
                .filter(l -> l.getId().equals(linkId))
                .findFirst()
                .orElse(domainLink);

        linkStatusBroadcaster.broadcastLinkUpdated(savedLink.getStashId(), savedLink);
        return savedLink;
    }

    // ==================== RequestScreenshotRefreshUseCase (delegated via adapter) ====================

    @Transactional
    public void requestScreenshotRefresh(final UUID linkId) {
        log.info("Requesting screenshot refresh for link: {}", linkId);

        final Link link =
                linkRepository.findById(linkId).orElseThrow(() -> new NotFoundException("Link not found: " + linkId));

        final Stash stash = stashRepository
                .findByIdWithLinks(link.getStashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + link.getStashId()));

        final Link domainLink = stash.getLinks().stream()
                .filter(l -> l.getId().equals(linkId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Link not found in stash: " + linkId));

        domainLink.markScreenshotRefreshPending();
        final Stash saved = stashRepository.save(stash);
        final Link savedLink = saved.getLinks().stream()
                .filter(l -> l.getId().equals(linkId))
                .findFirst()
                .orElse(domainLink);

        linkStatusBroadcaster.broadcastLinkUpdated(savedLink.getStashId(), savedLink);

        log.info(
                "Found link with URL: {}, publishing refresh event",
                link.getUrl().getValue());

        eventPublisher.publishScreenshotRefreshRequested(new ScreenshotRefreshRequestedEvent(
                linkId, link.getStashId(), link.getUrl().getValue()));
    }

    // ==================== FindLinkByIdQuery (delegated via adapter) ====================

    @Transactional(readOnly = true)
    public Optional<Link> findLinkById(final UUID linkId) {
        return linkRepository.findById(linkId);
    }

    // ==================== ReorderLinksUseCase ====================

    @Override
    @Transactional
    public void execute(final ReorderLinksCommand command) {
        linkRepository.reorderLinks(command.stashId(), command.movedLinkIds(), command.insertAfterId());
    }

    // ==================== MoveLinkToFolderUseCase ====================

    @Override
    @Transactional
    public void execute(final MoveLinkToFolderCommand command) {
        final Link link = linkRepository
                .findById(command.linkId())
                .orElseThrow(() -> new NotFoundException("Link not found: " + command.linkId()));

        if (!link.getStashId().equals(command.stashId())) {
            throw new com.linkpouch.stash.domain.exception.ForbiddenException("Link does not belong to this stash");
        }

        final Stash stash = stashRepository
                .findByIdWithLinks(link.getStashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + link.getStashId()));

        final Link domainLink = stash.getLinks().stream()
                .filter(l -> l.getId().equals(command.linkId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Link not found in stash: " + command.linkId()));

        domainLink.moveToFolder(command.targetFolderId());
        stashRepository.save(stash);
    }

    // ==================== ListLinksQuery ====================

    @Override
    @Transactional(readOnly = true)
    public PagedResult<Link> execute(final ListLinksCommand command) {
        final UUID stashId = command.stashId();
        final String search = command.search();
        final int page = command.page();
        final int size = command.size();

        if (page < 0) {
            throw new IllegalArgumentException("page must be >= 0");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("size must be > 0");
        }
        if (size > 100) {
            throw new IllegalArgumentException("size must be <= 100");
        }

        // Search mode: full-text across entire stash, ignores folder filter
        if (search != null && !search.isEmpty()) {
            final List<Link> results = linkRepository.searchByStashIdAndQuery(stashId, search);
            final int totalElements = results.size();
            final int totalPages = (int) Math.ceil((double) totalElements / size);
            final int fromIndex = page * size;
            final int toIndex = Math.min(fromIndex + size, totalElements);
            final List<Link> paginatedLinks =
                    fromIndex < totalElements ? results.subList(fromIndex, toIndex) : List.of();
            return new PagedResult<>(paginatedLinks, totalElements, totalPages, size, page);
        }

        if (command.filterByFolder()) {
            if (command.folderId() == null) {
                // Root-level links only
                final long totalElements = linkRepository.countByStashIdNullFolder(stashId);
                final int totalPages = (int) Math.ceil((double) totalElements / size);
                final List<Link> links = linkRepository.findByStashIdNullFolderPaged(stashId, page, size);
                return new PagedResult<>(links, (int) totalElements, totalPages, size, page);
            } else {
                // Specific folder
                final long totalElements = linkRepository.countByStashIdAndFolderId(stashId, command.folderId());
                final int totalPages = (int) Math.ceil((double) totalElements / size);
                final List<Link> links =
                        linkRepository.findByStashIdAndFolderIdPaged(stashId, command.folderId(), page, size);
                return new PagedResult<>(links, (int) totalElements, totalPages, size, page);
            }
        }

        // Stash-wide (no folder filter)
        final long totalElements = linkRepository.countByStashId(stashId);
        final int totalPages = (int) Math.ceil((double) totalElements / size);
        final List<Link> links = linkRepository.findByStashIdPaged(stashId, page, size);
        return new PagedResult<>(links, (int) totalElements, totalPages, size, page);
    }
}
