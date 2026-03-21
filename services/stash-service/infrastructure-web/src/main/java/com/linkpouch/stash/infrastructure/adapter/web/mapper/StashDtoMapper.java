package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.linkpouch.stash.api.model.StashResponseDTO;
import com.linkpouch.stash.domain.model.Stash;

@Mapper(componentModel = "spring", uses = WebValueObjectMapper.class, config = WebMappingConfig.class)
public interface StashDtoMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "name", source = "name")
    @Mapping(target = "passwordProtected", expression = "java(stash.isPasswordProtected())")
    @Mapping(target = "visibility", source = "visibility")
    @Mapping(target = "linkPermissions", source = "linkPermissions")
    @Mapping(target = "linkCount", constant = "0")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "signedUrl", ignore = true)
    StashResponseDTO mapOut(Stash stash);

    List<StashResponseDTO> mapOut(List<Stash> stashes);
}
