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
    private LinkStatus status;

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
            final LinkStatus status) {
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
        this.status = status != null ? status : LinkStatus.PENDING;
    }

    public static Link create(final UUID stashId, final String url) {
        return create(stashId, url, 0);
    }

    public static Link create(final UUID stashId, final String url, final int position) {
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
                LinkStatus.PENDING);
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
}
