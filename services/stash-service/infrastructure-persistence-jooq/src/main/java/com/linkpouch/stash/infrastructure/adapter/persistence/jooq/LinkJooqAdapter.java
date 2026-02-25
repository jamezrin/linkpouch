package com.linkpouch.stash.infrastructure.adapter.persistence.jooq;

import static com.linkpouch.stash.infrastructure.jooq.generated.Tables.LINKS;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import org.jooq.DSLContext;
import org.jooq.Query;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.LinkDescription;
import com.linkpouch.stash.domain.model.LinkTitle;
import com.linkpouch.stash.domain.model.ScreenshotKey;
import com.linkpouch.stash.domain.model.Url;
import com.linkpouch.stash.domain.port.outbound.LinkRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.LinkJpaRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.LinkJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.StashJpaEntity;
import com.linkpouch.stash.infrastructure.adapter.persistence.mapper.PersistenceMapper;

import lombok.RequiredArgsConstructor;

/**
 * jOOQ + JPA Adapter for Link Repository. Uses JPA for simple CRUD, jOOQ for complex queries (FTS).
 * NOTE: Transaction boundaries are managed in the application layer.
 */
@Component
@RequiredArgsConstructor
public class LinkJooqAdapter implements LinkRepository {

    private final LinkJpaRepository jpaRepository;
    private final DSLContext dsl;
    private final PersistenceMapper mapper;

    @Override
    public Link save(final Link link) {
        // For saving, we use JPA to maintain relationships
        final LinkJpaEntity entity =
                jpaRepository
                        .findById(link.getId())
                        .orElseGet(
                                () -> {
                                    final LinkJpaEntity newEntity = new LinkJpaEntity();
                                    newEntity.setId(link.getId());
                                    // Set stash reference for new entities (FK stash_id)
                                    final StashJpaEntity stashRef = new StashJpaEntity();
                                    stashRef.setId(link.getStashId());
                                    newEntity.setStash(stashRef);
                                    return newEntity;
                                });

        mapper.updateEntity(link, entity);

        final LinkJpaEntity saved = jpaRepository.save(entity);
        return mapper.mapIn(saved);
    }

    @Override
    public Optional<Link> findById(final UUID id) {
        return jpaRepository.findById(id).map(mapper::mapIn);
    }

    @Override
    public List<Link> findByStashIdOrderByCreatedAtDesc(final UUID stashId) {
        // Use jOOQ for custom query with position-based ordering
        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .orderBy(LINKS.POSITION.asc())
                .fetch()
                .map(this::mapIn); // mapIn: from jOOQ record TO domain
    }

    @Override
    public List<Link> searchByStashIdAndQuery(final UUID stashId, final String query) {
        // Use PostgreSQL full-text search combined with trigram ILIKE fallback.
        // The FTS path handles natural-language content (title, description, page_content).
        // The ILIKE path catches URL substring matches (e.g. "pnpm" matching "https://pnpm.io")
        // and is fast because GIN trigram indexes (idx_links_url_trgm, idx_links_title_trgm)
        // are used by PostgreSQL for patterns longer than 2 characters.
        final String likePattern = "%" + query.toLowerCase() + "%";

        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .and(
                        DSL.condition("search_vector @@ plainto_tsquery('english', {0})", query)
                                .or(DSL.condition("LOWER(url) LIKE {0}", likePattern))
                                .or(DSL.condition("LOWER(title) LIKE {0}", likePattern))
                                .or(DSL.condition("LOWER(description) LIKE {0}", likePattern)))
                .orderBy(
                        DSL.field(
                                        "ts_rank(search_vector, plainto_tsquery('english', {0})) DESC",
                                        query))
                .fetch()
                .map(this::mapIn); // mapIn: from jOOQ record TO domain
    }

    @Override
    public void deleteById(final UUID id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public List<Link> findByStashIdPaged(final UUID stashId, final int page, final int size) {
        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .orderBy(LINKS.POSITION.asc())
                .limit(size)
                .offset((long) page * size)
                .fetch()
                .map(this::mapIn);
    }

    @Override
    public long countByStashId(final UUID stashId) {
        final Long count =
                dsl.selectCount()
                        .from(LINKS)
                        .where(LINKS.STASH_ID.eq(stashId))
                        .fetchOne(0, Long.class);
        return count != null ? count : 0L;
    }

    @Override
    public void shiftPositionsDown(final UUID stashId) {
        dsl.update(LINKS)
                .set(LINKS.POSITION, LINKS.POSITION.add(1))
                .where(LINKS.STASH_ID.eq(stashId))
                .execute();
    }

    @Override
    public void reorderLinks(
            final UUID stashId, final List<UUID> movedLinkIds, final UUID insertAfterId) {
        // Load all IDs in position order (cheap — only fetching IDs, not full rows)
        final List<UUID> allIds =
                dsl.select(LINKS.ID)
                        .from(LINKS)
                        .where(LINKS.STASH_ID.eq(stashId))
                        .orderBy(LINKS.POSITION.asc())
                        .fetch(LINKS.ID);

        // Remove moved IDs from their current positions
        final Set<UUID> movedSet = new HashSet<>(movedLinkIds);
        final List<UUID> remaining = new ArrayList<>(allIds.size());
        for (UUID id : allIds) {
            if (!movedSet.contains(id)) {
                remaining.add(id);
            }
        }

        // Find insertion point: after the anchor, or at start if anchor is null
        int insertionIndex;
        if (insertAfterId == null) {
            insertionIndex = 0;
        } else {
            final int anchorPos = remaining.indexOf(insertAfterId);
            insertionIndex = anchorPos >= 0 ? anchorPos + 1 : remaining.size();
        }

        // Build the new full order
        final List<UUID> newOrder = new ArrayList<>(allIds.size());
        newOrder.addAll(remaining.subList(0, insertionIndex));
        newOrder.addAll(movedLinkIds);
        newOrder.addAll(remaining.subList(insertionIndex, remaining.size()));

        // Batch update positions
        if (!newOrder.isEmpty()) {
            final var queries =
                    IntStream.range(0, newOrder.size())
                            .mapToObj(
                                    i ->
                                            (Query)
                                                    dsl.update(LINKS)
                                                            .set(LINKS.POSITION, i)
                                                            .where(
                                                                    LINKS.ID
                                                                            .eq(newOrder.get(i))
                                                                            .and(
                                                                                    LINKS.STASH_ID
                                                                                            .eq(
                                                                                                    stashId))))
                            .toList();
            dsl.batch(queries).execute();
        }
    }

    /** Maps FROM jOOQ record TO domain (mapIn pattern). */
    private Link mapIn(final org.jooq.Record record) {
        final Integer pos = record.get(LINKS.POSITION);
        return new Link(
                record.get(LINKS.ID),
                record.get(LINKS.STASH_ID),
                record.get(LINKS.CREATED_AT) != null
                        ? record.get(LINKS.CREATED_AT)
                                .withOffsetSameInstant(ZoneOffset.UTC)
                                .toLocalDateTime()
                        : null,
                record.get(LINKS.UPDATED_AT) != null
                        ? record.get(LINKS.UPDATED_AT)
                                .withOffsetSameInstant(ZoneOffset.UTC)
                                .toLocalDateTime()
                        : null,
                Url.of(record.get(LINKS.URL)),
                record.get(LINKS.TITLE) != null ? LinkTitle.of(record.get(LINKS.TITLE)) : null,
                record.get(LINKS.DESCRIPTION) != null
                        ? LinkDescription.of(record.get(LINKS.DESCRIPTION))
                        : null,
                record.get(LINKS.FAVICON_URL) != null
                        ? Url.of(record.get(LINKS.FAVICON_URL))
                        : null,
                record.get(LINKS.PAGE_CONTENT),
                record.get(LINKS.FINAL_URL) != null ? Url.of(record.get(LINKS.FINAL_URL)) : null,
                record.get(LINKS.SCREENSHOT_KEY) != null
                        ? ScreenshotKey.of(record.get(LINKS.SCREENSHOT_KEY))
                        : null,
                record.get(LINKS.SCREENSHOT_GENERATED_AT) != null
                        ? record.get(LINKS.SCREENSHOT_GENERATED_AT)
                                .withOffsetSameInstant(ZoneOffset.UTC)
                                .toLocalDateTime()
                        : null,
                pos != null ? pos : 0);
    }
}
