import { useQuery } from '@tanstack/react-query';
import { WaybackMonthSummary, WaybackSnapshot } from '../types';

const CDX_BASE = 'https://web.archive.org/cdx/search/cdx';

/**
 * Parses a CDX JSON response (first row is header, rest are data rows).
 * Returns an array of objects keyed by the header fields.
 */
function parseCdxJson(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return [];
  const [header, ...data] = rows;
  return data
    .filter((row) => row.length === header.length)
    .map((row) => Object.fromEntries(header.map((key, i) => [key, row[i]])));
}

/**
 * Phase 1: Fetches one row per month (collapsed by 6-digit timestamp prefix)
 * for the given URL, filtered to HTTP 200 responses only.
 * Also requests showSkipCount and lastSkipTimestamp so we know capture counts.
 *
 * CDX timestamp format: YYYYMMDDhhmmss (14 digits)
 * collapse=timestamp:6 → collapses to YYYYMM
 */
async function fetchMonthSummaries(url: string): Promise<WaybackMonthSummary[]> {
  const params = new URLSearchParams({
    url,
    output: 'json',
    fl: 'timestamp',
    filter: 'statuscode:200',
    collapse: 'timestamp:6',
    showSkipCount: 'true',
    lastSkipTimestamp: 'true',
  });

  const res = await fetch(`${CDX_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`CDX API error: ${res.status}`);

  const json: string[][] = await res.json();
  const rows = parseCdxJson(json);

  return rows.map((row) => {
    const ts = row['timestamp'] ?? '';
    const year = parseInt(ts.slice(0, 4), 10);
    const month = parseInt(ts.slice(4, 6), 10);
    // skipcount is the number of *additional* captures after the first; add 1 for the representative row itself
    const skipCount = parseInt(row['skipcount'] ?? '0', 10);
    const lastTs = row['endtimestamp'] ?? ts;
    return {
      year,
      month,
      count: skipCount + 1,
      latestTimestamp: lastTs,
    };
  });
}

/**
 * Phase 2: Fetches individual snapshots within a given year/month,
 * collapsed to one per day (8-digit timestamp prefix), up to 50 results.
 */
async function fetchSnapshotsForMonth(
  url: string,
  year: number,
  month: number,
): Promise<WaybackSnapshot[]> {
  const mm = String(month).padStart(2, '0');
  // Last day of month — use the first day of next month minus 1 second as 'to' approximation
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMM = String(nextMonth).padStart(2, '0');

  const params = new URLSearchParams({
    url,
    output: 'json',
    fl: 'timestamp,statuscode',
    filter: 'statuscode:200',
    from: `${year}${mm}01`,
    to: `${nextYear}${nextMM}01`,
    collapse: 'timestamp:8',
    limit: '62', // at most ~31 days × 2 for safety
  });

  const res = await fetch(`${CDX_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`CDX API error: ${res.status}`);

  const json: string[][] = await res.json();
  const rows = parseCdxJson(json);

  return rows.map((row) => ({
    timestamp: row['timestamp'] ?? '',
    statuscode: row['statuscode'] ?? '',
  }));
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * Fetches monthly capture summaries for the given URL from the Wayback CDX API.
 * Only runs when `enabled` is true (i.e., when in archive mode).
 */
export function useWaybackMonths(url: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['wayback-months', url],
    queryFn: () => fetchMonthSummaries(url!),
    enabled: enabled && !!url,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Fetches individual day-level snapshots for a specific year/month.
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
