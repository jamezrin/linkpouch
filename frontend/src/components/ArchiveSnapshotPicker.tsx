import { useEffect, useRef, useState } from 'react';
import { useWaybackMonths, useWaybackSnapshotsForMonth } from '../hooks/useWaybackSnapshots';
import { WaybackMonthSummary } from '../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Parses a CDX timestamp string (YYYYMMDDhhmmss) into a Date object (UTC).
 */
function parseCdxTimestamp(ts: string): Date {
  const year = parseInt(ts.slice(0, 4), 10);
  const month = parseInt(ts.slice(4, 6), 10) - 1;
  const day = parseInt(ts.slice(6, 8), 10);
  const hour = parseInt(ts.slice(8, 10), 10);
  const min = parseInt(ts.slice(10, 12), 10);
  const sec = parseInt(ts.slice(12, 14), 10);
  return new Date(Date.UTC(year, month, day, hour, min, sec));
}

/**
 * Formats a CDX timestamp into a human-readable string.
 * e.g. "20231115142032" → "Nov 15, 2023 at 2:20 PM"
 */
function formatTimestamp(ts: string): string {
  const date = parseCdxTimestamp(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

/**
 * Formats a CDX timestamp into a short date label for the button.
 * e.g. "20231115142032" → "Nov 15, 2023"
 */
function formatTimestampShort(ts: string): string {
  const date = parseCdxTimestamp(ts);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// No heatmap count logic needed — the CDX API's skipcount field is unreliable.
// Month cells simply show "has captures" (indigo) vs "no captures" (grey).

// ─── Sub-components ──────────────────────────────────────────────────────────

interface MonthGridProps {
  months: WaybackMonthSummary[];
  selectedYear: number;
  onSelectMonth: (month: WaybackMonthSummary) => void;
  selectedMonth: WaybackMonthSummary | null;
}

function MonthGrid({ months, selectedYear, onSelectMonth, selectedMonth }: MonthGridProps) {
  const yearMonths = months.filter((m) => m.year === selectedYear);

  return (
    <div className="grid grid-cols-4 gap-1.5 p-3">
      {Array.from({ length: 12 }, (_, i) => {
        const monthNum = i + 1;
        const monthData = yearMonths.find((m) => m.month === monthNum);
        const isSelected =
          selectedMonth?.year === selectedYear && selectedMonth?.month === monthNum;

        if (!monthData) {
          return (
            <div
              key={monthNum}
              className="h-9 rounded-md bg-slate-50 flex items-center justify-center cursor-default"
              title="No captures"
            >
              <span className="text-[11px] font-medium text-slate-300">
                {MONTH_NAMES[i]}
              </span>
            </div>
          );
        }

        return (
          <button
            key={monthNum}
            onClick={() => onSelectMonth(monthData)}
            className={`h-9 rounded-md flex items-center justify-center transition-all hover:ring-2 hover:ring-indigo-400 hover:ring-offset-1 ${
              isSelected
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-1'
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
            title={`${MONTH_NAMES[i]} ${selectedYear} — has captures`}
          >
            <span className="text-[11px] font-semibold">{MONTH_NAMES[i]}</span>
          </button>
        );
      })}
    </div>
  );
}

interface SnapshotListProps {
  url: string;
  year: number;
  month: number;
  onSelect: (timestamp: string) => void;
  currentTimestamp: string | null;
}

function SnapshotList({ url, year, month, onSelect, currentTimestamp }: SnapshotListProps) {
  const { data: snapshots, isLoading, isError } = useWaybackSnapshotsForMonth(
    url,
    year,
    month,
    true,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 text-slate-400 text-xs gap-2">
        <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        Loading snapshots…
      </div>
    );
  }

  if (isError || !snapshots) {
    return (
      <p className="text-xs text-red-400 text-center py-3 px-3">
        Failed to load snapshots for this month.
      </p>
    );
  }

  if (snapshots.length === 0) {
    return (
      <p className="text-xs text-slate-400 text-center py-3 px-3">
        No snapshots found for this month.
      </p>
    );
  }

  return (
    <div className="max-h-48 overflow-y-auto border-t border-slate-100">
      {snapshots.map((snap) => {
        const isActive = snap.timestamp === currentTimestamp;
        return (
          <button
            key={snap.timestamp}
            onClick={() => onSelect(snap.timestamp)}
            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors hover:bg-indigo-50 ${
              isActive ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600'
            }`}
          >
            <svg
              className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-300'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="flex-1 truncate">{formatTimestamp(snap.timestamp)}</span>
            {isActive && (
              <svg className="w-3 h-3 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ArchiveSnapshotPickerProps {
  url: string;
  selectedTimestamp: string | null;
  onSelect: (timestamp: string | null) => void;
}

export function ArchiveSnapshotPicker({ url, selectedTimestamp, onSelect }: ArchiveSnapshotPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<WaybackMonthSummary | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: months, isLoading, isError, error } = useWaybackMonths(url, true);
  const isExcluded = isError && (error as Error & { status?: number })?.status === 403;

  // Derive available years (newest first)
  const years = months
    ? [...new Set(months.map((m) => m.year))].sort((a, b) => b - a)
    : [];

  // Auto-select the most recent year when data loads
  useEffect(() => {
    if (years.length > 0 && selectedYear === null) {
      setSelectedYear(years[0]);
    }
  }, [years, selectedYear]);

  // Reset expanded month when year changes
  useEffect(() => {
    setExpandedMonth(null);
  }, [selectedYear]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleSelectMonth(month: WaybackMonthSummary) {
    setExpandedMonth((prev) =>
      prev?.year === month.year && prev?.month === month.month ? null : month,
    );
  }

  function handleSelectSnapshot(timestamp: string) {
    onSelect(timestamp);
    setOpen(false);
  }

  function handleSelectLatest() {
    onSelect(null);
    setOpen(false);
  }

  const buttonLabel = selectedTimestamp
    ? formatTimestampShort(selectedTimestamp)
    : 'Latest';

  return (
    <div className="relative flex-shrink-0">
      {/* Trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-[12px] font-medium transition-colors ${
          open
            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
        }`}
        title="Select archive snapshot"
      >
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="max-w-[120px] truncate">{buttonLabel}</span>
        {isLoading && (
          <div className="w-2.5 h-2.5 border border-indigo-400 border-t-transparent rounded-full animate-spin ml-0.5" />
        )}
        {!isLoading && (
          <svg
            className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Archive snapshots
            </span>
            {selectedTimestamp && (
              <button
                onClick={handleSelectLatest}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Reset to latest
              </button>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
              <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              Loading archive history…
            </div>
          )}

          {isError && (
            <p className="text-xs text-slate-400 text-center py-6 px-4">
              {isExcluded
                ? 'This URL has been excluded from the Wayback Machine.'
                : 'Could not load archive history for this URL.'}
            </p>
          )}

          {!isLoading && !isError && months && months.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6 px-4">
              No archived snapshots found for this URL.
            </p>
          )}

          {!isLoading && !isError && months && months.length > 0 && selectedYear !== null && (
            <>
              {/* Year tabs */}
              <div className="flex gap-0.5 px-2 pt-2 pb-0 overflow-x-auto">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    className={`px-2.5 py-1 rounded-t-md text-[11px] font-semibold transition-colors flex-shrink-0 ${
                      selectedYear === year
                        ? 'bg-white text-indigo-700 border border-b-white border-slate-200 relative -mb-px z-10'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>

              {/* Month grid */}
              <div className="border-t border-slate-200">
                <MonthGrid
                  months={months}
                  selectedYear={selectedYear}
                  onSelectMonth={handleSelectMonth}
                  selectedMonth={expandedMonth}
                />
              </div>

              {/* Snapshot list for expanded month */}
              {expandedMonth && (
                <SnapshotList
                  url={url}
                  year={expandedMonth.year}
                  month={expandedMonth.month}
                  onSelect={handleSelectSnapshot}
                  currentTimestamp={selectedTimestamp}
                />
              )}
            </>
          )}

          {/* Footer attribution */}
          <div className="border-t border-slate-100 px-3 py-1.5 flex items-center justify-end">
            <a
              href="https://archive.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-slate-400 hover:text-indigo-500 transition-colors"
            >
              Powered by archive.org
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
