package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import lombok.*;

@Entity
@Table(name = "folders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FolderJpaEntity {

    @Id
    @Column(columnDefinition = "UUID")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stash_id", nullable = false)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private StashJpaEntity stash;

    /**
     * Stored as a plain UUID column to avoid lazy-loading a self-referential tree.
     * No @ManyToOne self-reference here — folders are fetched as a flat list and assembled in memory.
     */
    @Column(name = "parent_folder_id", columnDefinition = "UUID")
    private UUID parentFolderId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int position;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
