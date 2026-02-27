import { useQuery } from '@tanstack/react-query';
import { WaybackMonthSummary, WaybackSnapshot } from '../types';

// Proxied through our api-gateway to avoid CORS restrictions on the CDX API.
const CDX_PROXY = '/api/wayback/cdx';

/**
 * Parses a CDX JSON response (first row is header, rest are data rows).
 * Returns an array of objects keyed by the header fields.
 */
function parseCdxJson(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const [header, ...data] = rows;
  return data
    .filter((row) => Array.isArray(row) && row.length === header.length)
    .map((row) => Object.fromEntries(header.map((key, i) => [key, row[i]])));
}

/**
 * Phase 1: Fetches one representative row per month (collapsed by 6-digit
 * timestamp prefix) for the given URL, filtered to HTTP 2xx/3xx responses only.
 *
 * CDX timestamp format: YYYYMMDDhhmmss (14 digits)
 * collapse=timestamp:6 → collapses to YYYYMM
 *
 * Note: showSkipCount is not used because archive.org's CDX API returns null
 * for the skipcount field on collapsed queries. Month presence (has/has-not)
 * is sufficient for the heatmap — exact counts are fetched per month in Phase 2.
 */
async function fetchMonthSummaries(url: string): Promise<WaybackMonthSummary[]> {
  const params = new URLSearchParams({
    url,
    output: 'json',
    fl: 'timestamp',
    filter: 'statuscode:[23][0-9][0-9]',
    collapse: 'timestamp:6',
    limit: '500', // up to ~40 years of monthly data
  });

  const res = await fetch(`${CDX_PROXY}?${params.toString()}`);
  if (!res.ok) {
    const err = new Error(`CDX proxy error: ${res.status}`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  const json: string[][] = await res.json();
  const rows = parseCdxJson(json);

  return rows.map((row) => {
    const ts = row['timestamp'] ?? '';
    const year = parseInt(ts.slice(0, 4), 10);
    const month = parseInt(ts.slice(4, 6), 10);
    return {
      year,
      month,
      count: 1, // placeholder — real counts shown after Phase 2 drill-down
      latestTimestamp: ts,
    };
  });
}

/**
 * Phase 2: Fetches individual snapshots within a given year/month,
 * collapsed to one per day (8-digit timestamp prefix), up to 62 results.
 */
async function fetchSnapshotsForMonth(
  url: string,
  year: number,
  month: number,
): Promise<WaybackSnapshot[]> {
  const mm = String(month).padStart(2, '0');
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMM = String(nextMonth).padStart(2, '0');

  const params = new URLSearchParams({
    url,
    output: 'json',
    fl: 'timestamp,statuscode',
    filter: 'statuscode:[23][0-9][0-9]',
    from: `${year}${mm}01`,
    to: `${nextYear}${nextMM}01`,
    collapse: 'timestamp:8',
    limit: '62',
  });

  const res = await fetch(`${CDX_PROXY}?${params.toString()}`);
  if (!res.ok) throw new Error(`CDX proxy error: ${res.status}`);

  const json: string[][] = await res.json();
  const rows = parseCdxJson(json);

  return rows.map((row) => ({
    timestamp: row['timestamp'] ?? '',
    statuscode: row['statuscode'] ?? '',
  }));
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetches monthly capture summaries for the given URL via the CDX proxy.
 * Only runs when `enabled` is true (i.e., when in archive mode).
 */
export function useWaybackMonths(url: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['wayback-months', url],
    queryFn: () => fetchMonthSummaries(url!),
    enabled: enabled && !!url,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Fetches individual day-level snapshots for a specific year/month via the CDX proxy.
 * Only runs when `enabled` is true (i.e., when the user has clicked a month).
 */
export function useWaybackSnapshotsForMonth(
  url: string | null | undefined,
  year: number | null,
  month: number | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['wayback-snapshots', url, year, month],
    queryFn: () => fetchSnapshotsForMonth(url!, year!, month!),
    enabled: enabled && !!url && year !== null && month !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}
