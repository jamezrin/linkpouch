package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import lombok.*;

@Entity
@Table(name = "account_proxy_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountProxySettingsJpaEntity {

    @Id
    @Column(columnDefinition = "UUID")
    private UUID id;

    @Column(name = "account_id", nullable = false, columnDefinition = "UUID")
    private UUID accountId;

    @Column(name = "proxy_country")
    private String proxyCountry;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
