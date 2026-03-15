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
    private String passwordHash;
    private StashVisibility visibility;
    private StashLinkPermissions linkPermissions;
    private final Set<Link> links;

    public Stash(
            final UUID id,
            final LocalDateTime createdAt,
            final LocalDateTime updatedAt,
            final StashName name,
            final SecretKey secretKey,
            final String passwordHash,
            final StashVisibility visibility,
            final StashLinkPermissions linkPermissions,
            final Set<Link> links) {
        this.id = id != null ? id : UUID.randomUUID();
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now(ZoneOffset.UTC);
        this.updatedAt = updatedAt != null ? updatedAt : this.createdAt;
        this.name = name != null ? name : StashName.of("Untitled Stash");
        this.secretKey = secretKey != null ? secretKey : SecretKey.generate();
        this.passwordHash = passwordHash;
        this.visibility = visibility != null ? visibility : StashVisibility.SHARED;
        this.linkPermissions = linkPermissions != null ? linkPermissions : StashLinkPermissions.FULL;
        this.links = links != null ? new HashSet<>(links) : new HashSet<>();
    }

    public static Stash create(final String name) {
        return new Stash(
                null,
                null,
                null,
                StashName.of(name),
                null,
                null,
                StashVisibility.SHARED,
                StashLinkPermissions.FULL,
                null);
    }

    public boolean isPasswordProtected() {
        return passwordHash != null;
    }

    public boolean isPrivate() {
        return visibility == StashVisibility.PRIVATE;
    }

    public void setPasswordHash(final String hash) {
        this.passwordHash = hash;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void removePassword() {
        this.passwordHash = null;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void updateName(final String newName) {
        this.name = StashName.of(newName);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void setVisibility(final StashVisibility visibility) {
        this.visibility = visibility != null ? visibility : StashVisibility.SHARED;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void setLinkPermissions(final StashLinkPermissions linkPermissions) {
        this.linkPermissions = linkPermissions != null ? linkPermissions : StashLinkPermissions.FULL;
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public boolean isReadOnly() {
        return linkPermissions == StashLinkPermissions.READ_ONLY;
    }

    public void addLink(final Link link) {
        if (!this.id.equals(link.getStashId())) {
            throw new IllegalArgumentException("Link " + link.getId() + " does not belong to stash " + this.id);
        }
        this.links.add(link);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public void removeLink(final Link link) {
        if (!this.id.equals(link.getStashId())) {
            throw new IllegalArgumentException("Link " + link.getId() + " does not belong to stash " + this.id);
        }
        this.links.remove(link);
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public Set<Link> getLinks() {
        return Collections.unmodifiableSet(links);
    }
}
