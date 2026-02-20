package com.linkpouch.stash.domain.model;

import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Aggregate Root: Stash
 * Represents a collection of links that can be accessed via a signed URL.
 */
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
    
    public Stash(UUID id, LocalDateTime createdAt, LocalDateTime updatedAt, 
                 StashName name, SecretKey secretKey, Set<Link> links) {
        this.id = id != null ? id : UUID.randomUUID();
        this.createdAt = createdAt != null ? createdAt : LocalDateTime.now();
        this.updatedAt = updatedAt != null ? updatedAt : this.createdAt;
        this.name = name != null ? name : StashName.of("Untitled Stash");
        this.secretKey = secretKey != null ? secretKey : SecretKey.generate();
        this.links = links != null ? new HashSet<>(links) : new HashSet<>();
    }
    
    public static Stash create(String name) {
        return new Stash(null, null, null, StashName.of(name), null, null);
    }
    
    public void updateName(String newName) {
        this.name = StashName.of(newName);
        this.updatedAt = LocalDateTime.now();
    }
    
    public void addLink(Link link) {
        this.links.add(link);
        this.updatedAt = LocalDateTime.now();
    }
    
    public void removeLink(Link link) {
        this.links.remove(link);
        this.updatedAt = LocalDateTime.now();
    }
    
    public Set<Link> getLinks() {
        return Collections.unmodifiableSet(links);
    }
}
