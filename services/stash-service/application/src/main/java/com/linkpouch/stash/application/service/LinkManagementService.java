package com.linkpouch.stash.application.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.dto.PagedResult;
import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.port.inbound.LinkManagementUseCase;
import com.linkpouch.stash.domain.port.outbound.EventPublisher;
import com.linkpouch.stash.domain.port.outbound.LinkRepository;
import com.linkpouch.stash.domain.port.outbound.StashRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Application Service: Link Management Implements use cases with transaction boundaries at the
 * application layer.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LinkManagementService implements LinkManagementUseCase {

    private final LinkRepository linkRepository;
    private final StashRepository stashRepository;
    private final EventPublisher eventPublisher;

    @Override
    @Transactional
    public Link addLink(final UUID stashId, final String url) {
        stashRepository
                .findById(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        linkRepository.shiftPositionsDown(stashId);
        final Link link = Link.create(stashId, url);
        final Link saved = linkRepository.save(link);

        eventPublisher.publishLinkAdded(
                new EventPublisher.LinkAddedEvent(
                        saved.getId().toString(), saved.getUrl().getValue(), stashId.toString()));

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Link> findLinkById(final UUID linkId) {
        return linkRepository.findById(linkId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Link> getLinksByStashId(final UUID stashId) {
        return linkRepository.findByStashIdOrderByCreatedAtDesc(stashId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Link> searchLinks(final UUID stashId, final String query) {
        return linkRepository.searchByStashIdAndQuery(stashId, query);
    }

    @Override
    @Transactional
    public void deleteLink(final UUID linkId) {
        linkRepository.deleteById(linkId);
    }

    @Override
    @Transactional
    public Link updateLinkMetadata(
            final UUID linkId,
            final String title,
            final String description,
            final String faviconUrl,
            final String pageContent,
            final String finalUrl) {
        final Link link =
                linkRepository
                        .findById(linkId)
                        .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));
        link.updateMetadata(title, description, faviconUrl, pageContent, finalUrl);
        return linkRepository.save(link);
    }

    @Override
    @Transactional
    public Link updateLinkScreenshot(final UUID linkId, final String screenshotKey) {
        final Link link =
                linkRepository
                        .findById(linkId)
                        .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));
        link.updateScreenshot(screenshotKey);
        return linkRepository.save(link);
    }

    @Override
    @Transactional
    public void requestScreenshotRefresh(final UUID linkId) {
        log.info("Requesting screenshot refresh for link: {}", linkId);

        final Optional<Link> linkOptional = linkRepository.findById(linkId);
        if (linkOptional.isEmpty()) {
            log.warn("Link not found in database: {}", linkId);
            throw new NotFoundException("Link not found: " + linkId);
        }

        final Link link = linkOptional.get();
        log.info("Found link with URL: {}, publishing refresh event", link.getUrl().getValue());

        eventPublisher.publishScreenshotRefreshRequested(
                new EventPublisher.ScreenshotRefreshEvent(
                        linkId.toString(), link.getUrl().getValue()));
    }

    @Override
    @Transactional
    public void reorderLinks(
            final UUID stashId, final List<UUID> movedLinkIds, final UUID insertAfterId) {
        linkRepository.reorderLinks(stashId, movedLinkIds, insertAfterId);
    }

    @Transactional(readOnly = true)
    public PagedResult<Link> listLinks(
            final UUID stashId, final String search, final int page, final int size) {
        if (page < 0) {
            throw new IllegalArgumentException("page must be >= 0");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("size must be > 0");
        }
        if (size > 100) {
            throw new IllegalArgumentException("size must be <= 100");
        }

        if (search != null && !search.isEmpty()) {
            final List<Link> results = searchLinks(stashId, search);
            final int totalElements = results.size();
            final int totalPages = (int) Math.ceil((double) totalElements / size);
            final int fromIndex = page * size;
            final int toIndex = Math.min(fromIndex + size, totalElements);
            final List<Link> paginatedLinks =
                    fromIndex < totalElements ? results.subList(fromIndex, toIndex) : List.of();
            return new PagedResult<>(paginatedLinks, totalElements, totalPages, size, page);
        }

        final long totalElements = linkRepository.countByStashId(stashId);
        final int totalPages = (int) Math.ceil((double) totalElements / size);
        final List<Link> links = linkRepository.findByStashIdPaged(stashId, page, size);
        return new PagedResult<>(links, (int) totalElements, totalPages, size, page);
    }
}
