package com.linkpouch.stash.infrastructure.adapter.persistence.jooq;

import static com.linkpouch.stash.infrastructure.jooq.generated.Tables.FOLDERS;
import static com.linkpouch.stash.infrastructure.jooq.generated.Tables.LINKS;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import org.jooq.CommonTableExpression;
import org.jooq.DSLContext;
import org.jooq.Query;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Component;

import com.linkpouch.stash.domain.model.Folder;
import com.linkpouch.stash.domain.model.FolderName;
import com.linkpouch.stash.domain.port.outbound.FolderRepository;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.FolderJpaRepository;

import lombok.RequiredArgsConstructor;

/**
 * Adapter for FolderRepository. Uses jOOQ for all reads and writes (avoids JPA self-ref complexity).
 */
@Component
@RequiredArgsConstructor
public class FolderPersistenceAdapter implements FolderRepository {

    private final FolderJpaRepository folderJpaRepository;
    private final DSLContext dsl;

    @Override
    public Folder save(final Folder folder) {
        dsl.insertInto(FOLDERS)
                .set(FOLDERS.ID, folder.getId())
                .set(FOLDERS.STASH_ID, folder.getStashId())
                .set(FOLDERS.PARENT_FOLDER_ID, folder.getParentFolderId())
                .set(FOLDERS.NAME, folder.getName().getValue())
                .set(FOLDERS.POSITION, folder.getPosition())
                .onConflict(FOLDERS.ID)
                .doUpdate()
                .set(FOLDERS.PARENT_FOLDER_ID, folder.getParentFolderId())
                .set(FOLDERS.NAME, folder.getName().getValue())
                .set(FOLDERS.POSITION, folder.getPosition())
                .execute();

        return findById(folder.getId()).orElse(folder);
    }

    @Override
    public Optional<Folder> findById(final UUID id) {
        return dsl.selectFrom(FOLDERS).where(FOLDERS.ID.eq(id)).fetchOptional().map(this::mapIn);
    }

    @Override
    public List<Folder> findByStashId(final UUID stashId) {
        return dsl.selectFrom(FOLDERS)
                .where(FOLDERS.STASH_ID.eq(stashId))
                .orderBy(FOLDERS.PARENT_FOLDER_ID.asc().nullsFirst(), FOLDERS.POSITION.asc())
                .fetch()
                .map(this::mapIn);
    }

    @Override
    public void deleteById(final UUID id) {
        dsl.deleteFrom(FOLDERS).where(FOLDERS.ID.eq(id)).execute();
    }

    @Override
    public List<UUID> findDescendantIds(final UUID folderId) {
        // Recursive CTE: start with the folder itself, then find all children recursively
        final CommonTableExpression<?> descendants = DSL.name("descendants")
                .as(DSL.select(FOLDERS.ID)
                        .from(FOLDERS)
                        .where(FOLDERS.ID.eq(folderId))
                        .unionAll(DSL.select(FOLDERS.ID)
                                .from(FOLDERS)
                                .join(DSL.table(DSL.name("descendants")))
                                .on(FOLDERS.PARENT_FOLDER_ID.eq(
                                        DSL.field(DSL.name("descendants", "id"), UUID.class)))));

        return dsl.withRecursive(descendants)
                .select(DSL.field(DSL.name("descendants", "id"), UUID.class))
                .from(DSL.table(DSL.name("descendants")))
                .fetch(0, UUID.class);
    }

    @Override
    public List<UUID> findLinkIdsByFolderIds(final List<UUID> folderIds) {
        if (folderIds == null || folderIds.isEmpty()) return List.of();
        return dsl.select(LINKS.ID)
                .from(LINKS)
                .where(LINKS.FOLDER_ID.in(folderIds))
                .fetch(LINKS.ID);
    }

    @Override
    public void shiftFolderPositionsDown(final UUID stashId, final UUID parentFolderId) {
        final var query = dsl.update(FOLDERS)
                .set(FOLDERS.POSITION, FOLDERS.POSITION.add(1))
                .where(FOLDERS.STASH_ID.eq(stashId));

        if (parentFolderId == null) {
            query.and(FOLDERS.PARENT_FOLDER_ID.isNull()).execute();
        } else {
            query.and(FOLDERS.PARENT_FOLDER_ID.eq(parentFolderId)).execute();
        }
    }

    @Override
    public void reorderFolders(
            final UUID stashId, final UUID parentFolderId, final List<UUID> movedFolderIds, final UUID insertAfterId) {

        final var selectQuery = dsl.select(FOLDERS.ID).from(FOLDERS).where(FOLDERS.STASH_ID.eq(stashId));

        final List<UUID> allIds;
        if (parentFolderId == null) {
            allIds = selectQuery
                    .and(FOLDERS.PARENT_FOLDER_ID.isNull())
                    .orderBy(FOLDERS.POSITION.asc())
                    .fetch(FOLDERS.ID);
        } else {
            allIds = selectQuery
                    .and(FOLDERS.PARENT_FOLDER_ID.eq(parentFolderId))
                    .orderBy(FOLDERS.POSITION.asc())
                    .fetch(FOLDERS.ID);
        }

        final Set<UUID> movedSet = new HashSet<>(movedFolderIds);
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
        newOrder.addAll(movedFolderIds);
        newOrder.addAll(remaining.subList(insertionIndex, remaining.size()));

        if (!newOrder.isEmpty()) {
            final var queries = IntStream.range(0, newOrder.size())
                    .mapToObj(i -> (Query) dsl.update(FOLDERS)
                            .set(FOLDERS.POSITION, i)
                            .where(FOLDERS.ID.eq(newOrder.get(i)).and(FOLDERS.STASH_ID.eq(stashId))))
                    .toList();
            dsl.batch(queries).execute();
        }
    }

    /** Maps FROM jOOQ record TO domain Folder. */
    private Folder mapIn(final org.jooq.Record record) {
        return new Folder(
                record.get(FOLDERS.ID),
                record.get(FOLDERS.STASH_ID),
                record.get(FOLDERS.PARENT_FOLDER_ID),
                FolderName.of(record.get(FOLDERS.NAME)),
                record.get(FOLDERS.POSITION) != null ? record.get(FOLDERS.POSITION) : 0,
                record.get(FOLDERS.CREATED_AT) != null
                        ? record.get(FOLDERS.CREATED_AT)
                                .withOffsetSameInstant(ZoneOffset.UTC)
                                .toLocalDateTime()
                        : null,
                record.get(FOLDERS.UPDATED_AT) != null
                        ? record.get(FOLDERS.UPDATED_AT)
                                .withOffsetSameInstant(ZoneOffset.UTC)
                                .toLocalDateTime()
                        : null);
    }
}
