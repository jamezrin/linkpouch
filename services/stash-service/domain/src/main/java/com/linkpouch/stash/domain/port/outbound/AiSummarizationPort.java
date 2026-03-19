package com.linkpouch.stash.domain.port.outbound;

import java.util.UUID;

public interface AiSummarizationPort {

    /** Fire-and-forget: triggers async AI summarization for a link. */
    void requestSummarization(UUID linkId, UUID stashId, String pageContent);
}
