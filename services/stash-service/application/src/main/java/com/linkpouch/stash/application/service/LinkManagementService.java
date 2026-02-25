package com.linkpouch.stash.application.service;

import com.linkpouch.stash.application.dto.PagedResult;
import com.linkpouch.stash.application.exception.NotFoundException;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.port.inbound.LinkManagementUseCase;
import com.linkpouch.stash.domain.port.outbound.EventPublisher;
import com.linkpouch.stash.domain.port.outbound.LinkRepository;
import com.linkpouch.stash.domain.port.outbound.StashRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Application Service: Link Management
 * Implements use cases with transaction boundaries at the application layer.
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
    public Link addLink(UUID stashId, String url) {
        stashRepository.findById(stashId)
                .orElseThrow(() -> new NotFoundException("Stash not found: " + stashId));

        linkRepository.shiftPositionsDown(stashId);
        Link link = Link.create(stashId, url);
        Link saved = linkRepository.save(link);

        eventPublisher.publishLinkAdded(new EventPublisher.LinkAddedEvent(
                saved.getId().toString(),
                saved.getUrl().getValue(),
                stashId.toString()
        ));

        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Link> findLinkById(UUID linkId) {
        return linkRepository.findById(linkId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Link> getLinksByStashId(UUID stashId) {
        return linkRepository.findByStashIdOrderByCreatedAtDesc(stashId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Link> searchLinks(UUID stashId, String query) {
        return linkRepository.searchByStashIdAndQuery(stashId, query);
    }

    @Override
    @Transactional
    public void deleteLink(UUID linkId) {
        linkRepository.deleteById(linkId);
    }

    @Override
    @Transactional
    public Link updateLinkMetadata(UUID linkId, String title, String description,
                                   String faviconUrl, String pageContent, String finalUrl) {
        Link link = linkRepository.findById(linkId)
                .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));
        link.updateMetadata(title, description, faviconUrl, pageContent, finalUrl);
        return linkRepository.save(link);
    }

    @Override
    @Transactional
    public Link updateLinkScreenshot(UUID linkId, String screenshotKey) {
        Link link = linkRepository.findById(linkId)
                .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));
        link.updateScreenshot(screenshotKey);
        return linkRepository.save(link);
    }

    @Override
    @Transactional
    public void requestScreenshotRefresh(UUID linkId) {
        log.info("Requesting screenshot refresh for link: {}", linkId);
        
        Optional<Link> linkOptional = linkRepository.findById(linkId);
        if (linkOptional.isEmpty()) {
            log.warn("Link not found in database: {}", linkId);
            throw new NotFoundException("Link not found: " + linkId);
        }
        
        Link link = linkOptional.get();
        log.info("Found link with URL: {}, publishing refresh event", link.getUrl().getValue());

        eventPublisher.publishScreenshotRefreshRequested(
                new EventPublisher.ScreenshotRefreshEvent(
                        linkId.toString(),
                        link.getUrl().getValue()
                )
        );
    }

    @Override
    @Transactional
    public void reorderLinks(UUID stashId, List<UUID> movedLinkIds, UUID insertAfterId) {
        linkRepository.reorderLinks(stashId, movedLinkIds, insertAfterId);
    }

    @Transactional(readOnly = true)
    public PagedResult<Link> listLinks(UUID stashId, String search, int page, int size) {
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
            List<Link> results = searchLinks(stashId, search);
            int totalElements = results.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int fromIndex = page * size;
            int toIndex = Math.min(fromIndex + size, totalElements);
            List<Link> paginatedLinks = fromIndex < totalElements
                    ? results.subList(fromIndex, toIndex)
                    : List.of();
            return new PagedResult<>(paginatedLinks, totalElements, totalPages, size, page);
        }

        long totalElements = linkRepository.countByStashId(stashId);
        int totalPages = (int) Math.ceil((double) totalElements / size);
        List<Link> links = linkRepository.findByStashIdPaged(stashId, page, size);
        return new PagedResult<>(links, (int) totalElements, totalPages, size, page);
    }
}
