package com.linkpouch.stash.application.mapper;

import com.linkpouch.stash.application.dto.LinkResponse;
import com.linkpouch.stash.application.dto.StashResponse;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Stash;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-02-20T01:22:05+0100",
    comments = "version: 1.6.3, compiler: javac, environment: Java 21.0.2 (Oracle Corporation)"
)
@Component
public class DomainToDtoMapperImpl implements DomainToDtoMapper {

    @Override
    public StashResponse mapOut(Stash stash) {
        if ( stash == null ) {
            return null;
        }

        UUID id = null;
        String name = null;
        LocalDateTime createdAt = null;
        LocalDateTime updatedAt = null;

        id = stash.getId();
        name = stashNameToString( stash.getName() );
        createdAt = stash.getCreatedAt();
        updatedAt = stash.getUpdatedAt();

        String signature = null;

        StashResponse stashResponse = new StashResponse( id, name, signature, createdAt, updatedAt );

        return stashResponse;
    }

    @Override
    public LinkResponse mapOut(Link link) {
        if ( link == null ) {
            return null;
        }

        UUID id = null;
        String url = null;
        String title = null;
        String description = null;
        String faviconUrl = null;
        String finalUrl = null;
        String screenshotKey = null;
        LocalDateTime screenshotGeneratedAt = null;
        LocalDateTime createdAt = null;

        id = link.getId();
        url = urlToString( link.getUrl() );
        title = linkTitleToString( link.getTitle() );
        description = linkDescriptionToString( link.getDescription() );
        faviconUrl = urlToString( link.getFaviconUrl() );
        finalUrl = urlToString( link.getFinalUrl() );
        screenshotKey = screenshotKeyToString( link.getScreenshotKey() );
        screenshotGeneratedAt = link.getScreenshotGeneratedAt();
        createdAt = link.getCreatedAt();

        LinkResponse linkResponse = new LinkResponse( id, url, title, description, faviconUrl, finalUrl, screenshotKey, screenshotGeneratedAt, createdAt );

        return linkResponse;
    }

    @Override
    public List<LinkResponse> mapOutLinks(List<Link> links) {
        if ( links == null ) {
            return null;
        }

        List<LinkResponse> list = new ArrayList<LinkResponse>( links.size() );
        for ( Link link : links ) {
            list.add( mapOut( link ) );
        }

        return list;
    }
}
