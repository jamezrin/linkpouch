package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import lombok.*;

@Entity
@Table(name = "stashes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StashJpaEntity {

    @Id
    @Column(columnDefinition = "UUID")
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "secret_key", nullable = false)
    private String secretKey;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "visibility", nullable = false)
    private String visibility = "SHARED";

    @Column(name = "link_permissions", nullable = false)
    private String linkPermissions = "FULL";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "signature_refreshed_at")
    private LocalDateTime signatureRefreshedAt;

    @OneToMany(mappedBy = "stash", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private List<LinkJpaEntity> links = new ArrayList<>();
}
