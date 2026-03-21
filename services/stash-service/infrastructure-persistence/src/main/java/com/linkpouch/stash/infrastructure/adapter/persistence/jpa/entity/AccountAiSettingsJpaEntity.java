package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.converter.EncryptedStringConverter;

import lombok.*;

@Entity
@Table(name = "account_ai_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountAiSettingsJpaEntity {

    @Id
    @Column(columnDefinition = "UUID")
    private UUID id;

    @Column(name = "account_id", nullable = false, columnDefinition = "UUID")
    private UUID accountId;

    @Column(nullable = false)
    private String provider;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "api_key", columnDefinition = "TEXT")
    private String apiKey;

    @Column
    private String model;

    @Column(name = "custom_prompt", columnDefinition = "TEXT")
    private String customPrompt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
