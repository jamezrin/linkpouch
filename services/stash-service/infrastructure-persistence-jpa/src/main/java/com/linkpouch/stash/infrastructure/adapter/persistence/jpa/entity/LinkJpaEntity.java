package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import lombok.*;

@Entity
@Table(name = "links")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LinkJpaEntity {

    @Id
    @Column(columnDefinition = "UUID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stash_id", nullable = false)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private StashJpaEntity stash;

    @Column(nullable = false)
    private String url;

    @Column private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "favicon_url")
    private String faviconUrl;

    @Column(name = "page_content", columnDefinition = "TEXT")
    private String pageContent;

    @Column(name = "final_url")
    private String finalUrl;

    @Column(name = "screenshot_key")
    private String screenshotKey;

    @Column(name = "screenshot_generated_at")
    private LocalDateTime screenshotGeneratedAt;

    @Column(name = "position", nullable = false)
    private int position;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
