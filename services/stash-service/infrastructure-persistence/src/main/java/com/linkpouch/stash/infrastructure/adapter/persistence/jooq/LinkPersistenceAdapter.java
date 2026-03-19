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

import com.linkpouch.stash.domain.model.AiSummaryStatus;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.LinkDescription;
import com.linkpouch.stash.domain.model.LinkStatus;
import com.linkpouch.stash.domain.model.LinkTitle;
import com.linkpouch.stash.domain.model.ScreenshotKey;
import com.linkpouch.stash.domain.model.Url;
import com.linkpouch.stash.domain.port.outbound.LinkRepository;

import lombok.RequiredArgsConstructor;

/**
 * jOOQ Adapter for Link Repository. Uses jOOQ for all read operations and position management.
 * Write operations (save/delete) are handled by {@link StashPersistenceAdapter} via JPA cascade.
 * NOTE: Transaction boundaries are managed in the application layer.
 */
@Component
@RequiredArgsConstructor
public class LinkPersistenceAdapter implements LinkRepository {

    private final DSLContext dsl;

    @Override
    public Optional<Link> findById(final UUID id) {
        return dsl.selectFrom(LINKS).where(LINKS.ID.eq(id)).fetchOptional().map(this::mapIn);
    }

    @Override
    public List<Link> findByStashIdOrderByCreatedAtDesc(final UUID stashId) {
        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .orderBy(LINKS.POSITION.asc())
                .fetch()
                .map(this::mapIn);
    }

    @Override
    public List<Link> searchByStashIdAndQuery(final UUID stashId, final String query) {
        final String likePattern = "%" + query.toLowerCase() + "%";

        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .and(DSL.condition("search_vector @@ plainto_tsquery('english', {0})", query)
                        .or(DSL.condition("LOWER(url) LIKE {0}", likePattern))
                        .or(DSL.condition("LOWER(title) LIKE {0}", likePattern))
                        .or(DSL.condition("LOWER(description) LIKE {0}", likePattern)))
                .orderBy(DSL.field("ts_rank(search_vector, plainto_tsquery('english', {0})) DESC", query))
                .fetch()
                .map(this::mapIn);
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
                dsl.selectCount().from(LINKS).where(LINKS.STASH_ID.eq(stashId)).fetchOne(0, Long.class);
        return count != null ? count : 0L;
    }

    @Override
    public List<Link> findByStashIdNullFolderPaged(final UUID stashId, final int page, final int size) {
        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .and(LINKS.FOLDER_ID.isNull())
                .orderBy(LINKS.POSITION.asc())
                .limit(size)
                .offset((long) page * size)
                .fetch()
                .map(this::mapIn);
    }

    @Override
    public long countByStashIdNullFolder(final UUID stashId) {
        final Long count = dsl.selectCount()
                .from(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .and(LINKS.FOLDER_ID.isNull())
                .fetchOne(0, Long.class);
        return count != null ? count : 0L;
    }

    @Override
    public List<Link> findByStashIdAndFolderIdPaged(
            final UUID stashId, final UUID folderId, final int page, final int size) {
        return dsl.selectFrom(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .and(LINKS.FOLDER_ID.eq(folderId))
                .orderBy(LINKS.POSITION.asc())
                .limit(size)
                .offset((long) page * size)
                .fetch()
                .map(this::mapIn);
    }

    @Override
    public long countByStashIdAndFolderId(final UUID stashId, final UUID folderId) {
        final Long count = dsl.selectCount()
                .from(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .and(LINKS.FOLDER_ID.eq(folderId))
                .fetchOne(0, Long.class);
        return count != null ? count : 0L;
    }

    @Override
    public void shiftPositionsDown(final UUID stashId, final UUID folderId) {
        final var query =
                dsl.update(LINKS).set(LINKS.POSITION, LINKS.POSITION.add(1)).where(LINKS.STASH_ID.eq(stashId));

        if (folderId == null) {
            query.and(LINKS.FOLDER_ID.isNull()).execute();
        } else {
            query.and(LINKS.FOLDER_ID.eq(folderId)).execute();
        }
    }

    @Override
    public void shiftPositionsDownBy(final UUID stashId, final int count) {
        if (count <= 0) return;
        dsl.update(LINKS)
                .set(LINKS.POSITION, LINKS.POSITION.add(count))
                .where(LINKS.STASH_ID.eq(stashId))
                .execute();
    }

    @Override
    public Set<String> findUrlsByStashId(final UUID stashId) {
        return new HashSet<>(dsl.select(LINKS.URL)
                .from(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .fetch(LINKS.URL));
    }

    @Override
    public void reorderLinks(final UUID stashId, final List<UUID> movedLinkIds, final UUID insertAfterId) {
        final List<UUID> allIds = dsl.select(LINKS.ID)
                .from(LINKS)
                .where(LINKS.STASH_ID.eq(stashId))
                .orderBy(LINKS.POSITION.asc())
                .fetch(LINKS.ID);

        final Set<UUID> movedSet = new HashSet<>(movedLinkIds);
        final List<UUID> remaining = new ArrayList<>(allIds.size());
        for (final UUID id : allIds) {
            if (!movedSet.contains(id)) {
                remaining.add(id);
            }
        }

        int insertionIndex;
        if (insertAfterId == null) {
            insertionIndex = 0;
        } else {
            final int anchorPos = remaining.indexOf(insertAfterId);
            insertionIndex = anchorPos >= 0 ? anchorPos + 1 : remaining.size();
        }

        final List<UUID> newOrder = new ArrayList<>(allIds.size());
        newOrder.addAll(remaining.subList(0, insertionIndex));
        newOrder.addAll(movedLinkIds);
        newOrder.addAll(remaining.subList(insertionIndex, remaining.size()));

        if (!newOrder.isEmpty()) {
            final var queries = IntStream.range(0, newOrder.size())
                    .mapToObj(i -> (Query) dsl.update(LINKS)
                            .set(LINKS.POSITION, i)
                            .where(LINKS.ID.eq(newOrder.get(i)).and(LINKS.STASH_ID.eq(stashId))))
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
                record.get(LINKS.DESCRIPTION) != null ? LinkDescription.of(record.get(LINKS.DESCRIPTION)) : null,
                record.get(LINKS.FAVICON_URL) != null ? Url.of(record.get(LINKS.FAVICON_URL)) : null,
                record.get(LINKS.PAGE_CONTENT),
                record.get(LINKS.FINAL_URL) != null ? Url.of(record.get(LINKS.FINAL_URL)) : null,
                record.get(LINKS.SCREENSHOT_KEY) != null ? ScreenshotKey.of(record.get(LINKS.SCREENSHOT_KEY)) : null,
                record.get(LINKS.SCREENSHOT_GENERATED_AT) != null
                        ? record.get(LINKS.SCREENSHOT_GENERATED_AT)
                                .withOffsetSameInstant(ZoneOffset.UTC)
                                .toLocalDateTime()
                        : null,
                pos != null ? pos : 0,
                record.get(LINKS.FOLDER_ID),
                parseLinkStatus(record.get("status", String.class)),
                record.get("ai_summary", String.class),
                parseAiSummaryStatus(record.get("ai_summary_status", String.class)));
    }

    private static LinkStatus parseLinkStatus(final String value) {
        if (value == null) return LinkStatus.PENDING;
        try {
            return LinkStatus.valueOf(value);
        } catch (IllegalArgumentException e) {
            return LinkStatus.PENDING;
        }
    }

    private static AiSummaryStatus parseAiSummaryStatus(final String value) {
        if (value == null) return AiSummaryStatus.SKIPPED;
        try {
            return AiSummaryStatus.valueOf(value);
        } catch (IllegalArgumentException e) {
            return AiSummaryStatus.SKIPPED;
        }
    }
}
