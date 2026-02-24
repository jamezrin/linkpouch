package com.linkpouch.stash.domain.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

/**
 * Entity: Link
 * Represents a URL with extracted metadata within a stash.
 */
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

    public Link(UUID id, UUID stashId, LocalDateTime createdAt, LocalDateTime updatedAt,
                Url url, LinkTitle title, LinkDescription description, Url faviconUrl,
                String pageContent, Url finalUrl, ScreenshotKey screenshotKey,
                LocalDateTime screenshotGeneratedAt, int position) {
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
    }

    public static Link create(UUID stashId, String url) {
        return new Link(null, stashId, null, null, Url.of(url),
                       null, null, null, null, null, null, null, 0);
    }
    
    public void updateMetadata(String title, String description, String faviconUrl, 
                              String pageContent, String finalUrl) {
        this.title = title != null ? LinkTitle.of(title) : null;
        this.description = description != null ? LinkDescription.of(description) : null;
        this.faviconUrl = faviconUrl != null ? Url.of(faviconUrl) : null;
        this.pageContent = pageContent;
        this.finalUrl = finalUrl != null ? Url.of(finalUrl) : null;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void updateScreenshot(String screenshotKey) {
        if (screenshotKey == null || screenshotKey.isBlank()) {
            throw new IllegalArgumentException("Screenshot key cannot be null or blank");
        }
        this.screenshotKey = ScreenshotKey.of(screenshotKey);
        this.screenshotGeneratedAt = LocalDateTime.now(ZoneOffset.UTC);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }
}
