package com.linkpouch.stash.application.mapper;

import com.linkpouch.stash.application.dto.AddLinkRequest;
import com.linkpouch.stash.application.dto.CreateStashRequest;
import com.linkpouch.stash.domain.model.Link;
import com.linkpouch.stash.domain.model.Stash;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface DtoToDomainMapper {
    
    // ==================== mapIn (DTO -> Domain) ====================
    
    /**
     * Note: Stash is created via factory method, not direct mapping.
     * This method extracts the name from the request.
     */
    default Stash mapIn(CreateStashRequest request) {
        return Stash.create(request.name());
    }
    
    /**
     * Note: Link is created via factory method with stashId.
     * This method is for reference only.
     */
    default Link mapIn(AddLinkRequest request, java.util.UUID stashId) {
        return Link.create(stashId, request.url());
    }
}
