package com.linkpouch.stash.domain.model;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

/** Aggregate Root: Stash Represents a collection of links that can be accessed via a signed URL. */
@Getter
@EqualsAndHashCode(of = "id")
@ToString(exclude = "links")
public class Stash {

    private final UUID id;
    private final LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private StashName name;
    private SecretKey secretKey;
    private final Set<Link> links;

    public Stash(
            final UUID id,
            final LocalDateTime createdAt,
            final LocalDateTime updatedAt,
            final StashName name,
            final SecretKey secretKey,
            final Set<Link> links) {
        this.id = id != null ? id : UUID.randomUUID();
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now(ZoneOffset.UTC);
        this.updatedAt = updatedAt != null ? updatedAt : this.createdAt;
        this.name = name != null ? name : StashName.of("Untitled Stash");
        this.secretKey = secretKey != null ? secretKey : SecretKey.generate();
        this.links = links != null ? new HashSet<>(links) : new HashSet<>();
    }

    public static Stash create(final String name) {
        return new Stash(null, null, null, StashName.of(name), null, null);
    }

    public void updateName(final String newName) {
        this.name = StashName.of(newName);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void addLink(final Link link) {
        if (!this.id.equals(link.getStashId())) {
            throw new IllegalArgumentException(
                    "Link " + link.getId() + " does not belong to stash " + this.id);
        }
        this.links.add(link);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void removeLink(final Link link) {
        if (!this.id.equals(link.getStashId())) {
            throw new IllegalArgumentException(
                    "Link " + link.getId() + " does not belong to stash " + this.id);
        }
        this.links.remove(link);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public Set<Link> getLinks() {
        return Collections.unmodifiableSet(links);
    }
}
