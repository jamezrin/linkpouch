package com.linkpouch.stash.infrastructure.adapter.grpc.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.grpc.server.service.GrpcService;

import com.google.protobuf.Empty;

import com.linkpouch.stash.domain.exception.NotFoundException;
import com.linkpouch.stash.domain.model.AccountAiSettings;
import com.linkpouch.stash.domain.model.AiProvider;
import com.linkpouch.stash.domain.model.LinkStatus;
import com.linkpouch.stash.domain.port.in.FindLinkByIdQuery;
import com.linkpouch.stash.domain.port.in.GetAccountAiSettingsQuery;
import com.linkpouch.stash.domain.port.in.UpdateAiSummaryCommand;
import com.linkpouch.stash.domain.port.in.UpdateAiSummaryUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkMetadataCommand;
import com.linkpouch.stash.domain.port.in.UpdateLinkMetadataUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkScreenshotUseCase;
import com.linkpouch.stash.domain.port.in.UpdateLinkStatusUseCase;
import com.linkpouch.stash.domain.port.outbound.AccountRepository;
import com.linkpouch.stash.grpc.indexer.v1.AiSummaryStatus;
import com.linkpouch.stash.grpc.indexer.v1.GetAiCredentialsRequest;
import com.linkpouch.stash.grpc.indexer.v1.GetAiCredentialsResponse;
import com.linkpouch.stash.grpc.indexer.v1.IndexerCallbackServiceGrpc;
import com.linkpouch.stash.grpc.indexer.v1.UpdateLinkAiSummaryRequest;
import com.linkpouch.stash.grpc.indexer.v1.UpdateLinkMetadataRequest;
import com.linkpouch.stash.grpc.indexer.v1.UpdateLinkScreenshotRequest;
import com.linkpouch.stash.grpc.indexer.v1.UpdateLinkStatusRequest;
import com.linkpouch.stash.infrastructure.adapter.grpc.interceptor.IndexerAuthInterceptor;

import io.grpc.Status;
import io.grpc.stub.StreamObserver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@GrpcService(interceptors = {IndexerAuthInterceptor.class})
@RequiredArgsConstructor
public class IndexerCallbackGrpcService extends IndexerCallbackServiceGrpc.IndexerCallbackServiceImplBase {

    private final UpdateLinkMetadataUseCase updateLinkMetadataUseCase;
    private final UpdateLinkStatusUseCase updateLinkStatusUseCase;
    private final UpdateAiSummaryUseCase updateAiSummaryUseCase;
    private final UpdateLinkScreenshotUseCase updateLinkScreenshotUseCase;
    private final FindLinkByIdQuery findLinkByIdQuery;
    private final GetAccountAiSettingsQuery getAccountAiSettingsQuery;
    private final AccountRepository accountRepository;

    @Value("${linkpouch.ai.included-api-key:}")
    private String includedApiKey;

    @Override
    public void updateLinkMetadata(
            final UpdateLinkMetadataRequest request, final StreamObserver<Empty> responseObserver) {
        try {
            final UUID linkId = UUID.fromString(request.getLinkId());
            updateLinkMetadataUseCase.execute(new UpdateLinkMetadataCommand(
                    linkId,
                    request.hasTitle() ? request.getTitle() : null,
                    request.hasDescription() ? request.getDescription() : null,
                    request.hasFaviconUrl() ? request.getFaviconUrl() : null,
                    request.hasPageContent() ? request.getPageContent() : null,
                    request.hasFinalUrl() ? request.getFinalUrl() : null));
            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();
        } catch (NotFoundException e) {
            responseObserver.onError(
                    Status.NOT_FOUND.withDescription(e.getMessage()).asException());
        } catch (Exception e) {
            log.error("Error in updateLinkMetadata for linkId={}", request.getLinkId(), e);
            responseObserver.onError(
                    Status.INTERNAL.withDescription(e.getMessage()).asException());
        }
    }

    @Override
    public void updateLinkStatus(final UpdateLinkStatusRequest request, final StreamObserver<Empty> responseObserver) {
        try {
            final UUID linkId = UUID.fromString(request.getLinkId());
            final LinkStatus status = toLinkStatus(request.getStatus());
            updateLinkStatusUseCase.execute(linkId, status);
            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();
        } catch (NotFoundException e) {
            responseObserver.onError(
                    Status.NOT_FOUND.withDescription(e.getMessage()).asException());
        } catch (Exception e) {
            log.error("Error in updateLinkStatus for linkId={}", request.getLinkId(), e);
            responseObserver.onError(
                    Status.INTERNAL.withDescription(e.getMessage()).asException());
        }
    }

    @Override
    public void updateLinkAiSummary(
            final UpdateLinkAiSummaryRequest request, final StreamObserver<Empty> responseObserver) {
        try {
            final UUID linkId = UUID.fromString(request.getLinkId());
            final var link = findLinkByIdQuery
                    .execute(linkId)
                    .orElseThrow(() -> new NotFoundException("Link not found: " + linkId));
            final com.linkpouch.stash.domain.model.AiSummaryStatus status =
                    request.getStatus() == AiSummaryStatus.AI_COMPLETED
                            ? com.linkpouch.stash.domain.model.AiSummaryStatus.COMPLETED
                            : com.linkpouch.stash.domain.model.AiSummaryStatus.FAILED;
            updateAiSummaryUseCase.execute(new UpdateAiSummaryCommand(
                    linkId,
                    link.getStashId(),
                    request.hasSummary() ? request.getSummary() : null,
                    status,
                    request.hasModel() ? request.getModel() : null,
                    request.hasInputTokens() ? request.getInputTokens() : null,
                    request.hasOutputTokens() ? request.getOutputTokens() : null,
                    request.hasElapsedMs() ? request.getElapsedMs() : null));
            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();
        } catch (NotFoundException e) {
            responseObserver.onError(
                    Status.NOT_FOUND.withDescription(e.getMessage()).asException());
        } catch (Exception e) {
            log.error("Error in updateLinkAiSummary for linkId={}", request.getLinkId(), e);
            responseObserver.onError(
                    Status.INTERNAL.withDescription(e.getMessage()).asException());
        }
    }

    @Override
    public void updateLinkScreenshot(
            final UpdateLinkScreenshotRequest request, final StreamObserver<Empty> responseObserver) {
        try {
            final UUID linkId = UUID.fromString(request.getLinkId());
            updateLinkScreenshotUseCase.execute(linkId, request.getScreenshotKey());
            responseObserver.onNext(Empty.getDefaultInstance());
            responseObserver.onCompleted();
        } catch (NotFoundException e) {
            responseObserver.onError(
                    Status.NOT_FOUND.withDescription(e.getMessage()).asException());
        } catch (Exception e) {
            log.error("Error in updateLinkScreenshot for linkId={}", request.getLinkId(), e);
            responseObserver.onError(
                    Status.INTERNAL.withDescription(e.getMessage()).asException());
        }
    }

    @Override
    public void getAiCredentials(
            final GetAiCredentialsRequest request, final StreamObserver<GetAiCredentialsResponse> responseObserver) {
        try {
            final UUID stashId = UUID.fromString(request.getStashId());
            final Optional<UUID> accountIdOpt = accountRepository.findClaimerAccountId(stashId);
            if (accountIdOpt.isEmpty()) {
                responseObserver.onNext(
                        GetAiCredentialsResponse.newBuilder().setApiKey("").build());
                responseObserver.onCompleted();
                return;
            }
            final Optional<AccountAiSettings> settingsOpt = getAccountAiSettingsQuery.execute(accountIdOpt.get());
            if (settingsOpt.isEmpty() || settingsOpt.get().getProvider() == AiProvider.NONE) {
                responseObserver.onNext(
                        GetAiCredentialsResponse.newBuilder().setApiKey("").build());
                responseObserver.onCompleted();
                return;
            }
            final AccountAiSettings settings = settingsOpt.get();
            final String apiKey = settings.getProvider() == AiProvider.OPENROUTER_INCLUDED
                    ? includedApiKey
                    : (settings.getApiKey() != null ? settings.getApiKey() : "");
            responseObserver.onNext(
                    GetAiCredentialsResponse.newBuilder().setApiKey(apiKey).build());
            responseObserver.onCompleted();
        } catch (Exception e) {
            log.error("Error in getAiCredentials for stashId={}", request.getStashId(), e);
            responseObserver.onError(
                    Status.INTERNAL.withDescription(e.getMessage()).asException());
        }
    }

    private static LinkStatus toLinkStatus(final com.linkpouch.stash.grpc.indexer.v1.LinkStatus protoStatus) {
        return switch (protoStatus) {
            case INDEXED -> LinkStatus.INDEXED;
            case FAILED -> LinkStatus.FAILED;
            default -> LinkStatus.PENDING;
        };
    }
}
