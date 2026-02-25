package com.linkpouch.stash.infrastructure.adapter.web;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class S3Configuration {

    @Bean
    public S3Client s3Client(
            @Value("${linkpouch.s3.endpoint}") final String endpoint,
            @Value("${linkpouch.s3.access-key}") final String accessKey,
            @Value("${linkpouch.s3.secret-key}") final String secretKey) {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .credentialsProvider(
                        StaticCredentialsProvider.create(
                                AwsBasicCredentials.create(accessKey, secretKey)))
                .region(Region.US_EAST_1)
                .forcePathStyle(true)
                .build();
    }
}
