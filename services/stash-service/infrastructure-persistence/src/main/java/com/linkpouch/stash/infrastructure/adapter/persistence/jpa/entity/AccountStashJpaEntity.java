package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity;

import java.time.OffsetDateTime;

import jakarta.persistence.*;

import org.hibernate.annotations.CreationTimestamp;

import lombok.*;

@Entity
@Table(name = "account_stashes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountStashJpaEntity {

    @EmbeddedId
    private AccountStashId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("accountId")
    @JoinColumn(name = "account_id")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private AccountJpaEntity account;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("stashId")
    @JoinColumn(name = "stash_id")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private StashJpaEntity stash;

    @CreationTimestamp
    @Column(name = "claimed_at", nullable = false, updatable = false)
    private OffsetDateTime claimedAt;
}
