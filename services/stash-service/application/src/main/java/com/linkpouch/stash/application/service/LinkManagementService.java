package com.linkpouch.stash.application.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

import com.linkpouch.stash.application.annotation.UseCase;
import com.linkpouch.stash.domain.event.LinkAddedEvent;
import com.linkpouch.stash.domain.event.ScreenshotRefreshRequestedEvent;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.model.AiProvider;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.LinkStatus;
import com.linkpouch.stash.domain.model.Stash;
import com.linkpouch.stash.domain.model.Url;
import com.linkpouch.stash.domain.port.in.AddLinkCommand;
import com.linkpouch.stash.domain.port.in.AddLinkUseCase;
import com.linkpouch.stash.domain.port.in.AddLinksBatchCommand;
import com.linkpouch.stash.domain.port.in.AddLinksBatchUseCase;
import com.linkpouch.stash.domain.port.in.BatchReindexLinksCommand;
import com.linkpouch.stash.domain.port.in.BatchReindexLinksUseCase;
import com.linkpouch.stash.domain.port.in.DeleteLinkUseCase;
import com.linkpouch.stash.domain.port.in.DeleteLinksBatchCommand;
import com.linkpouch.stash.domain.port.in.DeleteLinksBatchUseCase;
import com.linkpouch.stash.domain.port.in.ListLinksCommand;
import com.linkpouch.stash.domain.port.in.ListLinksQuery;
import com.linkpouch.stash.domain.port.in.MoveLinkToFolderCommand;
import com.linkpouch.stash.domain.port.in.MoveLinkToFolderUseCase;
import com.linkpouch.stash.domain.port.in.PagedResult;
import com.linkpouch.stash.domain.port.in.ReindexLinkCommand;
import com.linkpouch.stash.domain.port.in.ReindexLinkUseCase;
import com.linkpouch.stash.domain.port.in.ReorderLinksCommand;
import com.linkpouch.stash.domain.port.in.ReorderLinksUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkMetadataCommand;
import com.linkpouch.stash.domain.port.in.UpdateLinkMetadataUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkScreenshotUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkStatusUseCase;
import com.linkpouch.stash.domain.port.outbound.AccountAiSettingsRepository;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.domain.port.outbound.AiSummaryRequestPublisher;
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
                BatchReindexLinksUseCase,
                ReindexLinkUseCase,
                UpdateLinkMetadataUseCase,
                UpdateLinkScreenshotUseCase,
                UpdateLinkStatusUseCase,
                ReorderLinksUseCase,
                MoveLinkToFolderUseCase,
                ListLinksQuery {

    private static final String DEFAULT_SYSTEM_PROMPT = """
            You are a research assistant that creates comprehensive, well-structured summaries of web pages \
            for a bookmarking app. Your goal is to help the user quickly recall why they saved this \
            page and extract maximum value from it.

            This is a single one-shot request — produce the complete, final summary in one response. \
            Do not ask questions, request clarification, or suggest follow-ups.

            Produce a thorough markdown summary using the following structure (adapt or omit sections \
            that don't apply to the content):

            ## Overview
            A concise 2–3 sentence paragraph explaining what this page is, who it's for, and why it matters.

            {{PAGE_SCREENSHOT}}

            ### Visual Structure
            A brief description of the page's visual layout: what is shown above the fold, the major \
            content areas, navigation elements, and how the page is organised at a glance.

            ## Key Takeaways
            A bulleted list of the 5–8 most important points, insights, or facts a reader should remember.

            ## Main Content
            The primary information organised into logical sub-sections using ### headings. Use:
            - Bullet lists for features, steps, or enumerations
            - **Bold** for important terms, names, values, or warnings
            - Tables for comparisons, specifications, or structured data
            - Fenced code blocks (with language tag) for any code, commands, config, or technical syntax

            ## Notable Details
            Interesting facts, statistics, caveats, edge cases, or anything else worth remembering that \
            didn't fit above.

            Rules:
            - Write in clear, neutral prose — strip marketing fluff
            - Preserve technical accuracy; never simplify at the cost of correctness
            - If the page has no meaningful content (login wall, 404, paywall, etc.) say so in one sentence
            - Output ONLY the markdown — no preamble, no meta-commentary, no closing remarks
            - Do NOT wrap the output in a markdown code block
            - Include the token {{PAGE_SCREENSHOT}} exactly once in your output, at the position shown above\
            """;

    private final LinkRepository linkRepository;
    private final StashRepository stashRepository;
    private final EventPublisher eventPublisher;
    private final LinkStatusBroadcaster linkStatusBroadcaster;
    private final ScreenshotStorage screenshotStorage;
    private final AccountRepository accountRepository;
    private final AccountAiSettingsRepository accountAiSettingsRepository;
    private final AiSummaryRequestPublisher aiSummaryRequestPublisher;

    @Value("${linkpouch.ai.system-prompt:" + DEFAULT_SYSTEM_PROMPT + "}")
    private String systemPrompt;

    @Value("${linkpouch.ai.included-api-key:}")
    private String includedApiKey;

    @Value("${linkpouch.ai.included-model:google/gemini-flash-1.5}")
    private String includedModel;

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

    // ==================== BatchReindexLinksUseCase ====================

    @Override
    @Transactional
    public void execute(final BatchReindexLinksCommand command) {
        final Stash stash = stashRepository
                .findByIdWithLinks(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));

        final List<Link> targetLinks = new ArrayList<>();
        for (final UUID linkId : command.linkIds()) {
            final Link domainLink = stash.getLinks().stream()
                    .filter(l -> l.getId().equals(linkId))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Link not found in stash: " + linkId));
            targetLinks.add(domainLink);
        }

        for (final Link link : targetLinks) {
            reindexLink(link, stash);
        }
    }

    // ==================== ReindexLinkUseCase ====================

    @Override
    @Transactional
    public void execute(final ReindexLinkCommand command) {
        final Stash stash = stashRepository
                .findByIdWithLinks(command.stashId())
                .orElseThrow(() -> new NotFoundException("Stash not found: " + command.stashId()));

        final Link link = stash.getLinks().stream()
                .filter(l -> l.getId().equals(command.linkId()))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Link not found in stash: " + command.linkId()));

        reindexLink(link, stash);
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
        triggerAiSummary(savedLink, saved);
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

    // ==================== Reindex helper ====================

    private void reindexLink(final Link link, final Stash stash) {
        link.markScreenshotRefreshPending();
        final Optional<AccountAiSettings> settingsOpt = resolveAiSettings(link.getStashId());
        if (settingsOpt.isEmpty()) {
            link.markAiSummarySkipped();
        } else {
            link.markAiSummaryGenerating();
        }

        stashRepository.save(stash);
        linkStatusBroadcaster.broadcastLinkUpdated(link.getStashId(), link);

        eventPublisher.publishScreenshotRefreshRequested(new ScreenshotRefreshRequestedEvent(
                link.getId(), link.getStashId(), link.getUrl().getValue()));

        if (settingsOpt.isPresent()) {
            final AccountAiSettings settings = settingsOpt.get();
            final String effectivePrompt = settings.getCustomPrompt() != null
                            && !settings.getCustomPrompt().isBlank()
                    ? settings.getCustomPrompt()
                    : systemPrompt;
            final String resolvedApiKey =
                    settings.getProvider() == AiProvider.OPENROUTER_INCLUDED ? includedApiKey : settings.getApiKey();
            final String resolvedModel =
                    settings.getProvider() == AiProvider.OPENROUTER_INCLUDED ? includedModel : settings.getModel();
            aiSummaryRequestPublisher.publishRequest(
                    link.getId(),
                    link.getStashId(),
                    link.getPageContent(),
                    settings.getProvider(),
                    resolvedApiKey,
                    resolvedModel,
                    effectivePrompt);
        }
    }

    // ==================== AI Summary helpers ====================

    private void triggerAiSummary(final Link savedLink, final Stash stash) {
        final Optional<AccountAiSettings> settingsOpt = resolveAiSettings(savedLink.getStashId());
        if (settingsOpt.isEmpty()) {
            log.debug(
                    "No enabled AI settings for stash {} — skipping AI summary for link {}",
                    savedLink.getStashId(),
                    savedLink.getId());
            // Mark as skipped in a separate transaction via a non-transactional call
            savedLink.markAiSummarySkipped();
            // save again via stash (we already have the stash loaded — just re-save to persist status)
            stashRepository.save(stash);
            linkStatusBroadcaster.broadcastLinkUpdated(savedLink.getStashId(), savedLink);
            return;
        }

        final AccountAiSettings settings = settingsOpt.get();
        savedLink.markAiSummaryGenerating();
        stashRepository.save(stash);
        linkStatusBroadcaster.broadcastLinkUpdated(savedLink.getStashId(), savedLink);

        final String effectivePrompt = settings.getCustomPrompt() != null
                        && !settings.getCustomPrompt().isBlank()
                ? settings.getCustomPrompt()
                : systemPrompt;

        // For INCLUDED provider, use server-side API key and model
        final String resolvedApiKey =
                settings.getProvider() == AiProvider.OPENROUTER_INCLUDED ? includedApiKey : settings.getApiKey();
        final String resolvedModel =
                settings.getProvider() == AiProvider.OPENROUTER_INCLUDED ? includedModel : settings.getModel();

        aiSummaryRequestPublisher.publishRequest(
                savedLink.getId(),
                savedLink.getStashId(),
                savedLink.getPageContent(),
                settings.getProvider(),
                resolvedApiKey,
                resolvedModel,
                effectivePrompt);
    }

    private Optional<AccountAiSettings> resolveAiSettings(final UUID stashId) {
        final List<UUID> accountIds = accountRepository.findAccountIdsByStashId(stashId);
        for (final UUID accountId : accountIds) {
            final Optional<AccountAiSettings> settings = accountAiSettingsRepository.findByAccountId(accountId);
            if (settings.isPresent() && settings.get().getProvider() != AiProvider.NONE) {
                return settings;
            }
        }
        return Optional.empty();
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
