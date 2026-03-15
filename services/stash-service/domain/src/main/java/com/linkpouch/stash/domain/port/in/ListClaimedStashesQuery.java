package com.linkpouch.stash.domain.port.in;

import com.linkpouch.stash.domain.model.ClaimedStashSummary;

public interface ListClaimedStashesQuery {

    PagedResult<ClaimedStashSummary> execute(ListClaimedStashesCommand command);
}
