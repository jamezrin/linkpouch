package com.linkpouch.stash.application.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.port.outbound.AccountAiSettingsRepository;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.domain.port.outbound.AiProviderPort;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Orchestrates AI summarization: resolves account AI settings for the stash, calls the AI
 * provider, and delegates transactional state writes to AiSummarizationExecutor.
 *
 * <p>This bean is @Async so callers return immediately; the actual work runs on aiTaskExecutor.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiSummarizationService {

    private static final String DEFAULT_SYSTEM_PROMPT =
            "Summarize the following web page in clear, well-structured markdown. Cover the main topic,"
                    + " key points, and any notable facts or data. Use headings and bullet points where appropriate.";

    private final AccountRepository accountRepository;
    private final AccountAiSettingsRepository accountAiSettingsRepository;
    private final AiProviderPort aiProviderPort;
    private final AiSummarizationExecutor executor;

    @Value("${linkpouch.ai.system-prompt:" + DEFAULT_SYSTEM_PROMPT + "}")
    private String systemPrompt;

    @Async("aiTaskExecutor")
    public void summarize(final UUID linkId, final UUID stashId, final String pageContent) {
        log.debug("Starting AI summarization for link {} in stash {}", linkId, stashId);

        final Optional<AccountAiSettings> settingsOpt = resolveSettings(stashId);
        if (settingsOpt.isEmpty()) {
            log.debug("No enabled AI settings found for stash {} — skipping link {}", stashId, linkId);
            executor.markSkipped(linkId, stashId);
            return;
        }

        final AccountAiSettings settings = settingsOpt.get();
        executor.markGenerating(linkId, stashId);

        try {
            final String summary = aiProviderPort.generateSummary(settings, systemPrompt, pageContent);
            executor.completeSummary(linkId, stashId, summary);
        } catch (Exception e) {
            log.error("AI summarization failed for link {} — {}", linkId, e.getMessage(), e);
            executor.markFailed(linkId, stashId);
        }
    }

    private Optional<AccountAiSettings> resolveSettings(final UUID stashId) {
        final List<UUID> accountIds = accountRepository.findAccountIdsByStashId(stashId);
        for (final UUID accountId : accountIds) {
            final List<AccountAiSettings> allSettings = accountAiSettingsRepository.findAllByAccountId(accountId);
            final Optional<AccountAiSettings> enabled =
                    allSettings.stream().filter(AccountAiSettings::isEnabled).findFirst();
            if (enabled.isPresent()) {
                return enabled;
            }
        }
        return Optional.empty();
    }
}
