package com.linkpouch.stash.infrastructure.adapter.persistence.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.linkpouch.stash.domain.model.Folder;
import com.linkpouch.stash.domain.model.FolderName;
import com.linkpouch.stash.infrastructure.adapter.persistence.jpa.entity.FolderJpaEntity;

@Mapper(componentModel = "spring", config = MappingConfig.class)
public interface FolderEntityMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "stashId", source = "stash.id")
    @Mapping(target = "parentFolderId", source = "parentFolderId")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "position", source = "position")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    Folder mapIn(FolderJpaEntity entity);

    @Mapping(target = "id", source = "id")
    @Mapping(target = "stash", ignore = true)
    @Mapping(target = "parentFolderId", source = "parentFolderId")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "position", source = "position")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    FolderJpaEntity mapOut(Folder folder);

    default String folderNameToString(FolderName name) {
        return name != null ? name.getValue() : null;
    }

    default FolderName stringToFolderName(String value) {
        return value != null ? FolderName.of(value) : null;
    }
}
