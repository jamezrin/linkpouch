package com.linkpouch.stash.infrastructure.adapter.web.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.linkpouch.stash.api.model.LinkResponseDTO;
import com.linkpouch.stash.domain.model.Link;

@Mapper(componentModel = "spring", uses = WebValueObjectMapper.class, config = WebMappingConfig.class)
public interface LinkDtoMapper {

    @Mapping(target = "id", source = "id")
    @Mapping(target = "stashId", source = "stashId")
    @Mapping(target = "url", source = "url")
    @Mapping(target = "title", source = "title")
    @Mapping(target = "description", source = "description")
    @Mapping(target = "faviconUrl", source = "faviconUrl")
    @Mapping(target = "screenshotUrl", ignore = true)
    @Mapping(target = "screenshotGeneratedAt", source = "screenshotGeneratedAt")
    @Mapping(target = "createdAt", source = "createdAt")
    @Mapping(target = "updatedAt", source = "updatedAt")
    @Mapping(target = "position", source = "position")
    @Mapping(target = "folderId", source = "folderId")
    @Mapping(target = "status", source = "status")
    @Mapping(target = "aiSummary", source = "aiSummary")
    @Mapping(target = "aiSummaryStatus", source = "aiSummaryStatus")
    @Mapping(target = "aiSummaryModel", source = "aiSummaryModel")
    @Mapping(target = "aiSummaryInputTokens", source = "aiSummaryInputTokens")
    @Mapping(target = "aiSummaryOutputTokens", source = "aiSummaryOutputTokens")
    @Mapping(target = "aiSummaryElapsedMs", source = "aiSummaryElapsedMs")
    LinkResponseDTO mapOut(Link link);

    List<LinkResponseDTO> mapOut(List<Link> links);
}
