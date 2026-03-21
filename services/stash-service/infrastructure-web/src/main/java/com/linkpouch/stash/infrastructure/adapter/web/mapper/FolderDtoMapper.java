package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.linkpouch.stash.api.model.FolderResponseDTO;
import com.linkpouch.stash.domain.model.Folder;

@Mapper(componentModel = "spring", uses = WebValueObjectMapper.class, config = WebMappingConfig.class)
public interface FolderDtoMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "stashId", source = "stashId")
    @Mapping(target = "parentFolderId", source = "parentFolderId")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "position", source = "position")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    FolderResponseDTO mapOut(Folder folder);

    List<FolderResponseDTO> mapOut(List<Folder> folders);
}
