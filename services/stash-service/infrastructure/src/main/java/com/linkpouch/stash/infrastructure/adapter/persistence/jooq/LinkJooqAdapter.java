package com.linkpouch.stash.infrastructure.adapter.persistence.jooq;

import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Url;
import com.linkpouch.stash.domain.model.LinkTitle;
import com.linkpouch.stash.domain.model.LinkDescription;
import com.linkpouch.stash.domain.model.ScreenshotKey;
import com.linkpouch.stash.domain.port.outbound.LinkRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.LinkJpaRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.LinkJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.mapper.PersistenceMapper;
import lombok.RequiredArgsConstructor;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.linkpouch.stash.infrastructure.jooq.generated.Tables.LINKS;

/**
 * jOOQ + JPA Adapter for Link Repository.
 * Uses JPA for simple CRUD, jOOQ for complex queries (FTS).
 * NOTE: Transaction boundaries are managed in the application layer.
 */
@Component
@RequiredArgsConstructor
public class LinkJooqAdapter implements LinkRepository {
    
    private final LinkJpaRepository jpaRepository;
    private final DSLContext dsl;
    private final PersistenceMapper mapper;
    
    @Override
    public Link save(Link link) {
        // For saving, we use JPA to maintain relationships
        LinkJpaEntity entity = jpaRepository.findById(link.getId())
                .orElseGet(() -> {
                    LinkJpaEntity newEntity = new LinkJpaEntity();
                    newEntity.setId(link.getId());
                    return newEntity;
                });
        
        // Update fields from domain object
        LinkJpaEntity mappedEntity = mapper.mapOut(link);
        entity.setUrl(mappedEntity.getUrl());
        entity.setTitle(mappedEntity.getTitle());
        entity.setDescription(mappedEntity.getDescription());
        entity.setFaviconUrl(mappedEntity.getFaviconUrl());
        entity.setPageContent(mappedEntity.getPageContent());
        entity.setFinalUrl(mappedEntity.getFinalUrl());
        entity.setScreenshotKey(mappedEntity.getScreenshotKey());
        entity.setScreenshotGeneratedAt(mappedEntity.getScreenshotGeneratedAt());
        
        LinkJpaEntity saved = jpaRepository.save(entity);
        return mapper.mapIn(saved);
    }
    
    @Override
    public Optional<Link> findById(UUID id) {
        return jpaRepository.findById(id)
                .map(mapper::mapIn);
    }
    
    @Override
    public List<Link> findByStashIdOrderByCreatedAtDesc(UUID stashId) {
        // Use jOOQ for custom query with proper ordering
        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .orderBy(LINKS.CREATED_AT.desc())
                .fetch()
                .map(this::mapIn);  // mapIn: from jOOQ record TO domain
    }
    
    @Override
    public List<Link> searchByStashIdAndQuery(UUID stashId, String query) {
        // Use PostgreSQL full-text search with jOOQ
        String tsQuery = query.replaceAll("\\s+", " & ");
        
        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .and(DSL.condition("search_vector @@ plainto_tsquery('english', {0})", query))
                .orderBy(DSL.field("ts_rank(search_vector, plainto_tsquery('english', {0})) DESC", query))
                .fetch()
                .map(this::mapIn);  // mapIn: from jOOQ record TO domain
    }
    
    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }
    
    /**
     * Maps FROM jOOQ record TO domain (mapIn pattern).
     */
    private Link mapIn(org.jooq.Record record) {
        return Link.builder()
                .id(record.get(LINKS.ID))
                .stashId(record.get(LINKS.STASH_ID))
                .url(Url.of(record.get(LINKS.URL)))
                .title(record.get(LINKS.TITLE) != null ? LinkTitle.of(record.get(LINKS.TITLE)) : null)
                .description(record.get(LINKS.DESCRIPTION) != null ? LinkDescription.of(record.get(LINKS.DESCRIPTION)) : null)
                .faviconUrl(record.get(LINKS.FAVICON_URL) != null ? Url.of(record.get(LINKS.FAVICON_URL)) : null)
                .pageContent(record.get(LINKS.PAGE_CONTENT))
                .finalUrl(record.get(LINKS.FINAL_URL) != null ? Url.of(record.get(LINKS.FINAL_URL)) : null)
                .screenshotKey(record.get(LINKS.SCREENSHOT_KEY) != null ? ScreenshotKey.of(record.get(LINKS.SCREENSHOT_KEY)) : null)
                .screenshotGeneratedAt(record.get(LINKS.SCREENSHOT_GENERATED_AT))
                .createdAt(record.get(LINKS.CREATED_AT))
                .updatedAt(record.get(LINKS.UPDATED_AT))
                .build();
    }
}
