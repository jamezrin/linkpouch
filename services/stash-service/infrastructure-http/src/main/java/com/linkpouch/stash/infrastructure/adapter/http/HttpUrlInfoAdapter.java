package com.linkpouch.stash.infrastructure.adapter.http;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.linkpouch.stash.domain.model.FetchedUrlInfo;
import com.linkpouch.stash.domain.port.outbound.UrlInfoPort;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class HttpUrlInfoAdapter implements UrlInfoPort {

    private static final Logger log = LoggerFactory.getLogger(HttpUrlInfoAdapter.class);

    private final RestClient embeddabilityRestClient;

    @Override
    public FetchedUrlInfo fetch(final String url) {
        validateUrl(url);
        try {
            return fetchHeaders(url, HttpMethod.HEAD);
        } catch (final RestClientException e) {
            log.debug("Failed to fetch URL headers for {}: {}", url, e.getMessage());
            return new FetchedUrlInfo(false, null, null);
        }
    }

    private FetchedUrlInfo fetchHeaders(final String url, final HttpMethod method) {
        return embeddabilityRestClient
                .method(method)
                .uri(url)
                .exchange(
                        (req, res) -> {
                            if (res.getStatusCode().isSameCodeAs(HttpStatus.METHOD_NOT_ALLOWED)
                                    && method == HttpMethod.HEAD) {
                                return fetchHeaders(url, HttpMethod.GET);
                            }
                            return new FetchedUrlInfo(
                                    true,
                                    res.getHeaders().getFirst("X-Frame-Options"),
                                    res.getHeaders().getFirst("Content-Security-Policy"));
                        });
    }

    private void validateUrl(final String url) {
        final URI uri;
        try {
            uri = URI.create(url);
        } catch (final IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid URL: " + url);
        }

        final String scheme = uri.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            throw new IllegalArgumentException("URL scheme must be http or https, got: " + scheme);
        }

        final String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("URL has no host: " + url);
        }

        try {
            final InetAddress address = InetAddress.getByName(host);
            if (address.isLoopbackAddress()) {
                throw new IllegalArgumentException("URL resolves to loopback address: " + url);
            }
            if (address.isSiteLocalAddress()) {
                throw new IllegalArgumentException(
                        "URL resolves to site-local (private) address: " + url);
            }
            if (address.isLinkLocalAddress()) {
                throw new IllegalArgumentException("URL resolves to link-local address: " + url);
            }
            if (address.isMulticastAddress()) {
                throw new IllegalArgumentException("URL resolves to multicast address: " + url);
            }
        } catch (final UnknownHostException e) {
            throw new IllegalArgumentException("Cannot resolve host: " + host);
        }
    }
}
