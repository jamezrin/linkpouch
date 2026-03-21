package com.linkpouch.stash.infrastructure.adapter.web.controller;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import jakarta.servlet.http.HttpServletRequest;

import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import com.linkpouch.stash.api.controller.AccountAiSettingsApi;
import com.linkpouch.stash.api.model.AiModelInfoDTO;
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
import com.linkpouch.stash.infrastructure.adapter.web.interceptor.AccountJwtInterceptor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Slf4j
@RestController
@RequiredArgsConstructor
public class AccountAiSettingsController implements AccountAiSettingsApi {

    private final GetAccountAiSettingsQuery getAccountAiSettingsQuery;
    private final UpsertAccountAiSettingsUseCase upsertAccountAiSettingsUseCase;
    private final ObjectMapper objectMapper;
    private final HttpServletRequest httpRequest;

    @Value("${linkpouch.ai.included-api-key:}")
    private String includedApiKey;

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
        final String apiKey = apiKeyNullable.isPresent() ? apiKeyNullable.get() : null;
        final JsonNullable<String> customPromptNullable = body.getCustomPrompt();
        final String customPrompt = customPromptNullable.isPresent() ? customPromptNullable.get() : null;
        final JsonNullable<String> modelNullable = body.getModel();
        final String model = modelNullable.isPresent() ? modelNullable.get() : null;
        final AccountAiSettings saved = upsertAccountAiSettingsUseCase.execute(
                new UpsertAccountAiSettingsCommand(claims.accountId(), aiProvider, apiKey, model, customPrompt));
        return ResponseEntity.ok(toDto(saved));
    }

    @Override
    public ResponseEntity<AiModelsResponseDTO> getAiModels(final String provider, final String xAiApiKey) {
        getClaims();

        final AiProvider aiProvider = AiProvider.valueOf(provider);
        final List<AiModelInfoDTO> models = fetchModels(aiProvider, xAiApiKey);
        final AiModelsResponseDTO response = new AiModelsResponseDTO().models(models);
        return ResponseEntity.ok(response);
    }

    private List<AiModelInfoDTO> fetchModels(final AiProvider provider, final String apiKey) {
        try {
            final HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();
            return switch (provider) {
                case NONE -> List.of();
                case OPENROUTER_INCLUDED -> fetchOpenRouterModels(client, includedApiKey, true);
                case OPENROUTER -> fetchOpenRouterModels(client, apiKey, false);
                case OPENAI -> fetchOpenAiModels(client, apiKey);
                case ANTHROPIC -> fetchAnthropicModels(client, apiKey);
                case OPENCODE -> fetchOpenCodeModels(client, apiKey);
            };
        } catch (Exception e) {
            log.warn("Failed to fetch models for provider {}: {}", provider, e.getMessage());
            return List.of();
        }
    }

    private List<AiModelInfoDTO> fetchOpenRouterModels(
            final HttpClient client, final String apiKey, final boolean freeOnly) throws Exception {
        final boolean hasKey = apiKey != null && !apiKey.isBlank();
        final String url = hasKey ? "https://openrouter.ai/api/v1/models/user" : "https://openrouter.ai/api/v1/models";
        final HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET();
        if (hasKey) builder.header("Authorization", "Bearer " + apiKey);
        final HttpRequest request = builder.build();
        final HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("OpenRouter returned HTTP " + response.statusCode());
        }
        final JsonNode root = objectMapper.readTree(response.body());
        final JsonNode data = root.get("data");
        if (data == null || !data.isArray()) return List.of();
        final List<AiModelInfoDTO> result = new ArrayList<>();
        for (final JsonNode item : data) {
            final String id = item.path("id").asText(null);
            if (id == null) continue;
            final JsonNode pricing = item.path("pricing");
            Double promptVal = null;
            Double completionVal = null;
            final String promptStr = pricing.path("prompt").asText(null);
            final String completionStr = pricing.path("completion").asText(null);
            if (promptStr != null) {
                try {
                    promptVal = Double.parseDouble(promptStr);
                } catch (NumberFormatException ignored) {
                }
            }
            if (completionStr != null) {
                try {
                    completionVal = Double.parseDouble(completionStr);
                } catch (NumberFormatException ignored) {
                }
            }
            if (freeOnly) {
                final double p = promptVal != null ? promptVal : -1;
                final double c = completionVal != null ? completionVal : -1;
                if (p != 0.0 || c != 0.0) continue;
            }
            final AiModelInfoDTO dto = new AiModelInfoDTO(id);
            final String name = item.path("name").asText(null);
            if (name != null) dto.name(name);
            final String description = item.path("description").asText(null);
            if (description != null) dto.description(description);
            final JsonNode ctxNode = item.path("context_length");
            if (!ctxNode.isMissingNode() && !ctxNode.isNull()) dto.contextLength(ctxNode.asInt());
            if (promptVal != null) dto.pricingPrompt(promptVal);
            if (completionVal != null) dto.pricingCompletion(completionVal);
            result.add(dto);
        }
        return result;
    }

    private List<AiModelInfoDTO> fetchOpenAiModels(final HttpClient client, final String apiKey) throws Exception {
        if (apiKey == null || apiKey.isBlank()) return List.of();
        final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/models"))
                .header("Authorization", "Bearer " + apiKey)
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        final HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("OpenAI returned HTTP " + response.statusCode());
        }
        final JsonNode root = objectMapper.readTree(response.body());
        final JsonNode data = root.get("data");
        if (data == null || !data.isArray()) return List.of();
        return data.findValues("id").stream()
                .map(JsonNode::asText)
                .filter(id -> id.startsWith("gpt-"))
                .sorted()
                .map(AiModelInfoDTO::new)
                .toList();
    }

    private List<AiModelInfoDTO> fetchAnthropicModels(final HttpClient client, final String apiKey) throws Exception {
        if (apiKey == null || apiKey.isBlank()) return List.of();
        final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/models"))
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        final HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Anthropic returned HTTP " + response.statusCode());
        }
        final JsonNode root = objectMapper.readTree(response.body());
        final JsonNode data = root.get("data");
        if (data == null || !data.isArray()) return List.of();
        final List<AiModelInfoDTO> result = new ArrayList<>();
        for (final JsonNode item : data) {
            final String id = item.path("id").asText(null);
            if (id == null) continue;
            final AiModelInfoDTO dto = new AiModelInfoDTO(id);
            final String displayName = item.path("display_name").asText(null);
            if (displayName != null) dto.name(displayName);
            result.add(dto);
        }
        return result;
    }

    private List<AiModelInfoDTO> fetchOpenCodeModels(final HttpClient client, final String apiKey) throws Exception {
        if (apiKey == null || apiKey.isBlank()) return List.of();
        final HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.opencode.ai/v1/models"))
                .header("Authorization", "Bearer " + apiKey)
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        final HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("OpenCode returned HTTP " + response.statusCode());
        }
        final JsonNode root = objectMapper.readTree(response.body());
        final JsonNode data = root.get("data");
        if (data == null || !data.isArray()) return List.of();
        return data.findValues("id").stream()
                .map(JsonNode::asText)
                .map(AiModelInfoDTO::new)
                .toList();
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
