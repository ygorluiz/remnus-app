export type SelectOptionColor =
  | 'default' | 'red' | 'orange' | 'yellow'
  | 'green' | 'teal' | 'blue' | 'purple' | 'pink';

export interface SelectOption {
  value: string;
  color?: SelectOptionColor;
}

export const SELECT_COLORS: Record<SelectOptionColor, { bg: string; text: string; dot: string; groupBg: string }> = {
  default: { bg: 'rgba(56,59,65,0.95)',   text: '#9ca3af', dot: '#6b7280', groupBg: 'rgba(56,59,65,0.35)'   },
  red:     { bg: 'rgba(127,29,29,0.95)',  text: '#fca5a5', dot: '#ef4444', groupBg: 'rgba(127,29,29,0.38)'  },
  orange:  { bg: 'rgba(124,45,18,0.95)',  text: '#fdba74', dot: '#f97316', groupBg: 'rgba(124,45,18,0.38)'  },
  yellow:  { bg: 'rgba(113,63,18,0.95)',  text: '#fef08a', dot: '#eab308', groupBg: 'rgba(113,63,18,0.38)'  },
  green:   { bg: 'rgba(20,83,45,0.95)',   text: '#86efac', dot: '#22c55e', groupBg: 'rgba(20,83,45,0.38)'   },
  teal:    { bg: 'rgba(19,78,74,0.95)',   text: '#5eead4', dot: '#14b8a6', groupBg: 'rgba(19,78,74,0.38)'   },
  blue:    { bg: 'rgba(30,58,138,0.95)',  text: '#93c5fd', dot: '#3b82f6', groupBg: 'rgba(30,58,138,0.38)'  },
  purple:  { bg: 'rgba(76,29,149,0.95)',  text: '#c4b5fd', dot: '#a855f7', groupBg: 'rgba(76,29,149,0.38)'  },
  pink:    { bg: 'rgba(131,24,67,0.95)',  text: '#f9a8d4', dot: '#ec4899', groupBg: 'rgba(131,24,67,0.38)'  },
};

export const SELECT_COLOR_ORDER: SelectOptionColor[] = [
  'default', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink',
];

export function normalizeOption(opt: string | SelectOption): SelectOption {
  if (typeof opt === 'string') return { value: opt };
  return opt;
}

export function getOptionColor(
  opt: string | SelectOption,
): { bg: string; text: string; dot: string; groupBg: string } {
  const { color } = normalizeOption(opt);
  return SELECT_COLORS[color ?? 'default'] ?? SELECT_COLORS.default;
}

export function getOptionColorByValue(
  options: (string | SelectOption)[],
  value: string,
): { bg: string; text: string; dot: string; groupBg: string } {
  if (!value) return SELECT_COLORS.default;
  const found = (options ?? []).find((o) => normalizeOption(o).value === value);
  return found ? getOptionColor(found) : SELECT_COLORS.default;
}

/**
 * Returns an ordered list of dot-color hex strings to paint the card's
 * left-border accent. For a `select` column this is one color; for a
 * `multi_select` column one color per selected value (preserving order).
 * Returns [] when there is nothing to paint.
 */
export function getCardBorderDots(
  colSchema: { type: string; options?: (string | SelectOption)[] } | null | undefined,
  value: unknown,
): string[] {
  if (!colSchema) return [];
  const opts = colSchema.options ?? [];

  if (colSchema.type === 'select') {
    if (typeof value !== 'string' || !value) return [];
    return [getOptionColorByValue(opts, value).dot];
  }

  if (colSchema.type === 'multi_select') {
    if (!Array.isArray(value) || value.length === 0) return [];
    return (value as string[]).map((v) => getOptionColorByValue(opts, v).dot);
  }

  return [];
}

/**
 * Returns the groupBg tint color for the card background based on a select/multi_select value.
 * For multi_select, uses the first selected value's color. Returns null when nothing to paint.
 */
export function getCardBgColor(
  colSchema: { type: string; options?: (string | SelectOption)[] } | null | undefined,
  value: unknown,
): string | null {
  if (!colSchema) return null;
  const opts = colSchema.options ?? [];

  if (colSchema.type === 'select') {
    if (typeof value !== 'string' || !value) return null;
    return getOptionColorByValue(opts, value).groupBg;
  }

  if (colSchema.type === 'multi_select') {
    if (!Array.isArray(value) || value.length === 0) return null;
    return getOptionColorByValue(opts, (value as string[])[0]).groupBg;
  }

  return null;
}

export function formatDateValue(val: string, type: 'date' | 'datetime', format?: string): string {
  if (!val) return '—';
  // Date range: "start/end"
  if (val.includes('/')) {
    const [startStr, endStr] = val.split('/');
    const startFmt = formatDateValue(startStr, type, format);
    const endFmt = endStr ? formatDateValue(endStr, type, format) : '';
    return endFmt ? `${startFmt} → ${endFmt}` : startFmt;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;

  const showTime = type === 'datetime';
  const formatStr = format || 'default';

  if (formatStr === 'relative') {
    if (type === 'datetime') {
      const now = new Date();
      const diffMs = d.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);

      if (Math.abs(diffMins) < 1) return 'Just now';
      if (Math.abs(diffMins) < 60) {
        return diffMins > 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
      }
      if (Math.abs(diffHours) < 24) {
        return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
      }
      if (Math.abs(diffDays) < 30) {
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
      }
    } else {
      // Just 'date' property: work exclusively with calendar days
      const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const nowTemp = new Date();
      const nowDate = new Date(nowTemp.getFullYear(), nowTemp.getMonth(), nowTemp.getDate());
      const diffMs = dDate.getTime() - nowDate.getTime();
      const diffDays = Math.round(diffMs / 86400000);

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';
      if (Math.abs(diffDays) < 30) {
        return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
      }
    }
  }

  // YYYY-MM-DD
  if (formatStr === 'iso') {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const datePart = `${yyyy}-${mm}-${dd}`;
    if (showTime) {
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${datePart} ${hh}:${min}`;
    }
    return datePart;
  }

  // DD/MM/YYYY
  if (formatStr === 'uk') {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const datePart = `${dd}/${mm}/${yyyy}`;
    if (showTime) {
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${datePart} ${hh}:${min}`;
    }
    return datePart;
  }

  // MM/DD/YYYY
  if (formatStr === 'us') {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const datePart = `${mm}/${dd}/${yyyy}`;
    if (showTime) {
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${datePart} ${hh}:${min}`;
    }
    return datePart;
  }

  // Default: Month Day, Year (e.g. May 19, 2026)
  const datePart = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  if (showTime) {
    const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} ${timePart}`;
  }
  return datePart;
}
