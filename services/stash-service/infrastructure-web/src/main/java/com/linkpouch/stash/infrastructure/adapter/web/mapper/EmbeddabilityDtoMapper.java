package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.linkpouch.stash.api.model.EmbeddabilityCheckResponseDTO;
import com.linkpouch.stash.domain.model.EmbeddabilityResult;

@Mapper(componentModel = "spring", uses = WebValueObjectMapper.class, config = WebMappingConfig.class)
public interface EmbeddabilityDtoMapper {

    @Mapping(target = "embeddable", source = "embeddable")
    @Mapping(target = "reason", source = "reason")
    EmbeddabilityCheckResponseDTO mapOut(EmbeddabilityResult result);
}
