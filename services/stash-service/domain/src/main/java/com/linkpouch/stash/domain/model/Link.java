package com.linkpouch.stash.domain.model;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/** Entity: Link Represents a URL with extracted metadata within a stash. */
@Getter
@EqualsAndHashCode(of = "id")
@ToString
public class Link {

    private final UUID id;
    private final UUID stashId;
    private final LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Url url;
    private LinkTitle title;
    private LinkDescription description;
    private Url faviconUrl;
    private String pageContent;
    private Url finalUrl;
    private ScreenshotKey screenshotKey;
    private LocalDateTime screenshotGeneratedAt;
    private int position;
    private UUID folderId;
    private LinkStatus status;
    private String aiSummary;
    private AiSummaryStatus aiSummaryStatus;
    private String aiSummaryModel;
    private Integer aiSummaryInputTokens;
    private Integer aiSummaryOutputTokens;
    private Integer aiSummaryElapsedMs;

    public Link(
            final UUID id,
            final UUID stashId,
            final LocalDateTime createdAt,
            final LocalDateTime updatedAt,
            final Url url,
            final LinkTitle title,
            final LinkDescription description,
            final Url faviconUrl,
            final String pageContent,
            final Url finalUrl,
            final ScreenshotKey screenshotKey,
            final LocalDateTime screenshotGeneratedAt,
            final int position,
            final UUID folderId,
            final LinkStatus status,
            final String aiSummary,
            final AiSummaryStatus aiSummaryStatus,
            final String aiSummaryModel,
            final Integer aiSummaryInputTokens,
            final Integer aiSummaryOutputTokens,
            final Integer aiSummaryElapsedMs) {
        this.id = id != null ? id : UUID.randomUUID();
        this.stashId = stashId;
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now(ZoneOffset.UTC);
        this.updatedAt = updatedAt != null ? updatedAt : this.createdAt;
        this.url = url;
        this.title = title;
        this.description = description;
        this.faviconUrl = faviconUrl;
        this.pageContent = pageContent;
        this.finalUrl = finalUrl;
        this.screenshotKey = screenshotKey;
        this.screenshotGeneratedAt = screenshotGeneratedAt;
        this.position = position;
        this.folderId = folderId;
        this.status = status != null ? status : LinkStatus.PENDING;
        this.aiSummary = aiSummary;
        this.aiSummaryStatus = aiSummaryStatus != null ? aiSummaryStatus : AiSummaryStatus.SKIPPED;
        this.aiSummaryModel = aiSummaryModel;
        this.aiSummaryInputTokens = aiSummaryInputTokens;
        this.aiSummaryOutputTokens = aiSummaryOutputTokens;
        this.aiSummaryElapsedMs = aiSummaryElapsedMs;
    }

    public static Link create(final UUID stashId, final String url) {
        return create(stashId, url, null, 0);
    }

    public static Link create(final UUID stashId, final String url, final int position) {
        return create(stashId, url, null, position);
    }

    public static Link create(final UUID stashId, final String url, final UUID folderId, final int position) {
        return new Link(
                null,
                stashId,
                null,
                null,
                Url.of(url),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                position,
                folderId,
                LinkStatus.PENDING,
                null,
                AiSummaryStatus.PENDING,
                null,
                null,
                null,
                null);
    }

    public void moveToFolder(final UUID folderId) {
        this.folderId = folderId;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void updateMetadata(
            final String title,
            final String description,
            final String faviconUrl,
            final String pageContent,
            final String finalUrl) {
        this.title = title != null ? LinkTitle.of(title) : null;
        this.description = description != null ? LinkDescription.of(description) : null;
        this.faviconUrl = faviconUrl != null ? Url.of(faviconUrl) : null;
        this.pageContent = pageContent;
        this.finalUrl = finalUrl != null ? Url.of(finalUrl) : null;
        this.status = LinkStatus.INDEXED;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void markScreenshotRefreshPending() {
        this.status = LinkStatus.PENDING;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void updateScreenshot(final String screenshotKey) {
        if (screenshotKey == null || screenshotKey.isBlank()) {
            throw new IllegalArgumentException("Screenshot key cannot be null or blank");
        }
        this.screenshotKey = ScreenshotKey.of(screenshotKey);
        this.screenshotGeneratedAt = LocalDateTime.now(ZoneOffset.UTC);
        this.status = LinkStatus.INDEXED;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void markFailed() {
        this.status = LinkStatus.FAILED;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void markAiSummaryGenerating() {
        this.aiSummaryStatus = AiSummaryStatus.GENERATING;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void updateAiSummary(
            final String summary,
            final String model,
            final Integer inputTokens,
            final Integer outputTokens,
            final Integer elapsedMs) {
        this.aiSummary = summary;
        this.aiSummaryStatus = AiSummaryStatus.COMPLETED;
        this.aiSummaryModel = model;
        this.aiSummaryInputTokens = inputTokens;
        this.aiSummaryOutputTokens = outputTokens;
        this.aiSummaryElapsedMs = elapsedMs;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void markAiSummaryFailed() {
        this.aiSummaryStatus = AiSummaryStatus.FAILED;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void markAiSummarySkipped() {
        this.aiSummaryStatus = AiSummaryStatus.SKIPPED;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
