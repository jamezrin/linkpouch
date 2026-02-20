package com.linkpouch.stash.application.mapper;

import com.linkpouch.stash.application.dto.LinkResponse;
import com.linkpouch.stash.application.dto.StashResponse;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Stash;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface DomainToDtoMapper {
    
    /**
     * Maps FROM domain TO response DTO (mapOut pattern).
     */
    @Mapping(target = "signature", ignore = true)  // Will be set separately
    StashResponse mapOut(Stash stash);
    
    /**
     * Maps FROM domain TO response DTO (mapOut pattern).
     */
    LinkResponse mapOut(Link link);
    
    /**
     * Maps list FROM domain TO response DTO.
     */
    List<LinkResponse> mapOutLinks(List<Link> links);
}
