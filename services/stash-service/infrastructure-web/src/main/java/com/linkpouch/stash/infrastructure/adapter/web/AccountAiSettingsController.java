package com.linkpouch.stash.infrastructure.adapter.web;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

import jakarta.servlet.http.HttpServletRequest;

import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import com.linkpouch.stash.api.controller.AccountAiSettingsApi;
import com.linkpouch.stash.api.model.AiModelsResponseDTO;
import com.linkpouch.stash.api.model.AiSettingsResponseDTO;
import com.linkpouch.stash.api.model.UpsertAiSettingsRequestDTO;
import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.exception.UnauthorizedException;
import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.model.AiProvider;
import com.linkpouch.stash.domain.port.in.GetAccountAiSettingsQuery;
import com.linkpouch.stash.domain.port.in.UpsertAccountAiSettingsCommand;
import com.linkpouch.stash.domain.port.in.UpsertAccountAiSettingsUseCase;
import com.linkpouch.stash.domain.service.AccountClaims;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequiredArgsConstructor
public class AccountAiSettingsController implements AccountAiSettingsApi {

    private final GetAccountAiSettingsQuery getAccountAiSettingsQuery;
    private final UpsertAccountAiSettingsUseCase upsertAccountAiSettingsUseCase;
    private final ObjectMapper objectMapper;
    private final HttpServletRequest httpRequest;

    @Override
    public ResponseEntity<AiSettingsResponseDTO> getAiSettings() {
        final AccountClaims claims = getClaims();
        final Optional<AccountAiSettings> settings = getAccountAiSettingsQuery.execute(claims.accountId());
        return settings.map(s -> ResponseEntity.ok(toDto(s)))
                .orElseThrow(() -> new NotFoundException("No AI settings configured"));
    }

    @Override
    public ResponseEntity<AiSettingsResponseDTO> upsertAiSettings(final UpsertAiSettingsRequestDTO body) {
        final AccountClaims claims = getClaims();
        final AiProvider aiProvider = AiProvider.valueOf(body.getProvider().name());
        final JsonNullable<String> apiKeyNullable = body.getApiKey();
        final String apiKey = apiKeyNullable != null && apiKeyNullable.isPresent() ? apiKeyNullable.get() : null;
        final JsonNullable<String> customPromptNullable = body.getCustomPrompt();
        final String customPrompt =
                customPromptNullable != null && customPromptNullable.isPresent() ? customPromptNullable.get() : null;
        final JsonNullable<String> modelNullable = body.getModel();
        final String model = modelNullable != null && modelNullable.isPresent() ? modelNullable.get() : null;
        final AccountAiSettings saved = upsertAccountAiSettingsUseCase.execute(
                new UpsertAccountAiSettingsCommand(claims.accountId(), aiProvider, apiKey, model, customPrompt));
        return ResponseEntity.ok(toDto(saved));
    }

    @Override
    public ResponseEntity<AiModelsResponseDTO> getAiModels(final String provider, final String apiKey) {
        // Ensure authenticated
        getClaims();

        final AiProvider aiProvider = AiProvider.valueOf(provider);
        final List<String> models = fetchModels(aiProvider, apiKey);
        final AiModelsResponseDTO response = new AiModelsResponseDTO().models(models);
        return ResponseEntity.ok(response);
    }

    private List<String> fetchModels(final AiProvider provider, final String apiKey) {
        try {
            final HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();
            return switch (provider) {
                case NONE -> List.of();
                case INCLUDED, OPENROUTER -> fetchOpenRouterModels(client);
                case OPENAI -> fetchOpenAiModels(client, apiKey);
                case ANTHROPIC -> fetchAnthropicModels(client, apiKey);
                case OPENCODE -> fetchOpenCodeModels(client, apiKey);
            };
        } catch (Exception e) {
            log.warn("Failed to fetch models for provider {}: {}", provider, e.getMessage());
            return List.of();
        }
    }

    private List<String> fetchOpenRouterModels(final HttpClient client) throws Exception {
        final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://openrouter.ai/api/v1/models"))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        final HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        final JsonNode root = objectMapper.readTree(response.body());
        final JsonNode data = root.get("data");
        if (data == null || !data.isArray()) return List.of();
        return data.findValuesAsText("id");
    }

    private List<String> fetchOpenAiModels(final HttpClient client, final String apiKey) throws Exception {
        if (apiKey == null || apiKey.isBlank()) return List.of();
        final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/models"))
                .header("Authorization", "Bearer " + apiKey)
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        final HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        final JsonNode root = objectMapper.readTree(response.body());
        final JsonNode data = root.get("data");
        if (data == null || !data.isArray()) return List.of();
        return data.findValuesAsText("id").stream()
                .filter(id -> id.startsWith("gpt-"))
                .sorted()
                .toList();
    }

    private List<String> fetchAnthropicModels(final HttpClient client, final String apiKey) throws Exception {
        if (apiKey == null || apiKey.isBlank()) return List.of();
        final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/models"))
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        final HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        final JsonNode root = objectMapper.readTree(response.body());
        final JsonNode data = root.get("data");
        if (data == null || !data.isArray()) return List.of();
        return data.findValuesAsText("id");
    }

    private List<String> fetchOpenCodeModels(final HttpClient client, final String apiKey) throws Exception {
        if (apiKey == null || apiKey.isBlank()) return List.of();
        final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.opencode.ai/v1/models"))
                .header("Authorization", "Bearer " + apiKey)
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        final HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        final JsonNode root = objectMapper.readTree(response.body());
        final JsonNode data = root.get("data");
        if (data == null || !data.isArray()) return List.of();
        return data.findValuesAsText("id");
    }

    private AiSettingsResponseDTO toDto(final AccountAiSettings settings) {
        final AiSettingsResponseDTO dto = new AiSettingsResponseDTO()
                .provider(AiSettingsResponseDTO.ProviderEnum.fromValue(
                        settings.getProvider().name()))
                .model(settings.getModel())
                .hasApiKey(settings.getApiKey() != null && !settings.getApiKey().isBlank());
        if (settings.getCustomPrompt() != null) {
            dto.customPrompt(settings.getCustomPrompt());
        }
        return dto;
    }

    private AccountClaims getClaims() {
        final AccountClaims claims = (AccountClaims) httpRequest.getAttribute(AccountJwtInterceptor.CLAIMS_ATTR);
        if (claims == null) {
            throw new UnauthorizedException("Missing authentication claims");
        }
        return claims;
    }
}
