package com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity;

import java.io.Serializable;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountStashId implements Serializable {

    @Column(name = "account_id", columnDefinition = "UUID")
    private UUID accountId;

    @Column(name = "stash_id", columnDefinition = "UUID")
    private UUID stashId;
}
