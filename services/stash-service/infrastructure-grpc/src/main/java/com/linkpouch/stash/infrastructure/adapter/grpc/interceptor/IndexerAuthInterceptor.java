package com.linkpouch.stash.infrastructure.adapter.grpc.interceptor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.grpc.Metadata;
import io.grpc.ServerCall;
import io.grpc.ServerCallHandler;
import io.grpc.ServerInterceptor;
import io.grpc.Status;

@Component
public class IndexerAuthInterceptor implements ServerInterceptor {

    static final Metadata.Key<String> INDEXER_SECRET_KEY =
            Metadata.Key.of("x-indexer-secret", Metadata.ASCII_STRING_MARSHALLER);

    @Value("${linkpouch.indexer.callback-secret}")
    private String indexerCallbackSecret;

    @Override
    public <ReqT, RespT> ServerCall.Listener<ReqT> interceptCall(
            final ServerCall<ReqT, RespT> call, final Metadata headers, final ServerCallHandler<ReqT, RespT> next) {
        final String secret = headers.get(INDEXER_SECRET_KEY);
        if (!indexerCallbackSecret.equals(secret)) {
            call.close(Status.UNAUTHENTICATED.withDescription("Invalid indexer secret"), new Metadata());
            return new ServerCall.Listener<>() {};
        }
        return next.startCall(call, headers);
    }
}
