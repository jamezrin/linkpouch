package com.linkpouch.stash.infrastructure.adapter.http;

import java.util.concurrent.TimeUnit;

import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Bean
    public RestClient embeddabilityRestClient() {
        final var requestConfig =
                RequestConfig.custom()
                        .setConnectionRequestTimeout(5, TimeUnit.SECONDS)
                        .setResponseTimeout(5, TimeUnit.SECONDS)
                        .build();
        final var httpClient =
                HttpClients.custom().setDefaultRequestConfig(requestConfig).build();
        final var factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        return RestClient.builder().requestFactory(factory).build();
    }
}
