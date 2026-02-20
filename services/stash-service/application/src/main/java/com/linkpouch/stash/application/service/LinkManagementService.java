package com.linkpouch.stash.application.service;

import com.linkpouch.stash.application.dto.PagedResult;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.port.inbound.LinkManagementUseCase;
import com.linkpouch.stash.domain.port.outbound.EventPublisher;
import com.linkpouch.stash.domain.port.outbound.LinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Application Service: Link Management
 * Implements use cases with transaction boundaries at the application layer.
 */
@Service
@RequiredArgsConstructor
public class LinkManagementService implements LinkManagementUseCase {

    private final LinkRepository linkRepository;
    private final EventPublisher eventPublisher;

    @Override
    @Transactional
    public Link addLink(UUID stashId, String url) {
        Link link = Link.create(stashId, url);
        Link saved = linkRepository.save(link);

        // Publish event for async indexing
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
    public void requestScreenshotRefresh(UUID linkId) {
        Link link = linkRepository.findById(linkId)
                .orElseThrow(() -> new IllegalArgumentException("Link not found: " + linkId));

        eventPublisher.publishScreenshotRefreshRequested(
                new EventPublisher.ScreenshotRefreshEvent(
                        linkId.toString(),
                        link.getUrl().getValue()
                )
        );
    }

    @Transactional(readOnly = true)
    public PagedResult<Link> listLinks(UUID stashId, String search, int page, int size) {
        List<Link> links;
        if (search != null && !search.isEmpty()) {
            links = searchLinks(stashId, search);
        } else {
            links = getLinksByStashId(stashId);
        }

        int totalElements = links.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);

        int fromIndex = page * size;
        int toIndex = Math.min(fromIndex + size, totalElements);

        List<Link> paginatedLinks = fromIndex < totalElements
                ? links.subList(fromIndex, toIndex)
                : List.of();

        return new PagedResult<>(paginatedLinks, totalElements, totalPages, size, page);
    }
}
