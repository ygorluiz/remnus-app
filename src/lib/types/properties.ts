export type SelectOptionColor =
  | 'default' | 'red' | 'orange' | 'yellow'
  | 'green' | 'teal' | 'blue' | 'purple' | 'pink';

export interface SelectOption {
  value: string;
  color?: SelectOptionColor;
}

export const SELECT_COLORS: Record<SelectOptionColor, { bg: string; text: string; dot: string; groupBg: string }> = {
  default: { bg: 'rgba(56,59,65,0.95)',   text: '#9ca3af', dot: '#6b7280', groupBg: 'rgba(56,59,65,0.18)'   },
  red:     { bg: 'rgba(127,29,29,0.95)',  text: '#fca5a5', dot: '#ef4444', groupBg: 'rgba(127,29,29,0.14)'  },
  orange:  { bg: 'rgba(124,45,18,0.95)',  text: '#fdba74', dot: '#f97316', groupBg: 'rgba(124,45,18,0.14)'  },
  yellow:  { bg: 'rgba(113,63,18,0.95)',  text: '#fef08a', dot: '#eab308', groupBg: 'rgba(113,63,18,0.14)'  },
  green:   { bg: 'rgba(20,83,45,0.95)',   text: '#86efac', dot: '#22c55e', groupBg: 'rgba(20,83,45,0.14)'   },
  teal:    { bg: 'rgba(19,78,74,0.95)',   text: '#5eead4', dot: '#14b8a6', groupBg: 'rgba(19,78,74,0.14)'   },
  blue:    { bg: 'rgba(30,58,138,0.95)',  text: '#93c5fd', dot: '#3b82f6', groupBg: 'rgba(30,58,138,0.14)'  },
  purple:  { bg: 'rgba(76,29,149,0.95)',  text: '#c4b5fd', dot: '#a855f7', groupBg: 'rgba(76,29,149,0.14)'  },
  pink:    { bg: 'rgba(131,24,67,0.95)',  text: '#f9a8d4', dot: '#ec4899', groupBg: 'rgba(131,24,67,0.14)'  },
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
