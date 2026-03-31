export interface ProxySettingsResponse {
  proxyCountry: string | null;
}

export interface UpsertProxySettingsRequest {
  proxyCountry: string | null;
}

export interface SupportedCountry {
  code: string;
  name: string;
}

export const SUPPORTED_PROXY_COUNTRIES: SupportedCountry[] = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'AU', name: 'Australia' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
];
