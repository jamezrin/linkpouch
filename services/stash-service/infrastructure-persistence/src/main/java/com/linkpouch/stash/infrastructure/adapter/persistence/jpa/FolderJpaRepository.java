package com.linkpouch.stash.infrastructure.adapter.persistence.jpa;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.FolderJpaEntity;

@Repository
public interface FolderJpaRepository extends JpaRepository<FolderJpaEntity, UUID> {

    @Query(
            "SELECT f FROM FolderJpaEntity f WHERE f.stash.id = :stashId ORDER BY f.parentFolderId ASC NULLS FIRST, f.position ASC")
    List<FolderJpaEntity> findByStashId(@Param("stashId") UUID stashId);
}
