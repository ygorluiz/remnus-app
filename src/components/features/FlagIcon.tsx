'use client';

/**
 * Inline SVG flag icons.
 *
 * Flag emojis (🇹🇷, 🇬🇧, …) rely on the OS/system font having emoji-flag
 * glyphs. Windows ships no flag glyphs, so Chrome and the Tauri WebView render
 * them as broken/blank boxes. These SVGs are font-independent and render
 * identically on every platform.
 */

type FlagCode = 'en' | 'tr' | 'hi' | 'es' | 'fr' | 'de' | 'br';

const flags: Record<FlagCode, React.ReactNode> = {
  // United Kingdom — Union Jack
  en: (
    <>
      <path fill="#012169" d="M0 0h640v480H0z" />
      <path
        fill="#fff"
        d="M75 0l244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z"
      />
      <path
        fill="#c8102e"
        d="M424 281l216 159v40L369 281zM240 301l6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z"
      />
      <path fill="#fff" d="M241 0v480h160V0zM0 160v160h640V160z" />
      <path fill="#c8102e" d="M0 193v96h640v-96zM273 0v480h96V0z" />
    </>
  ),
  // Turkey
  tr: (
    <>
      <path fill="#e30a17" d="M0 0h640v480H0z" />
      <circle cx="247" cy="240" r="120" fill="#fff" />
      <circle cx="277" cy="240" r="96" fill="#e30a17" />
      <path
        fill="#fff"
        d="M350.7 240l101.3-32.9-62.6 86.2v-106.6l62.6 86.2z"
      />
    </>
  ),
  // India
  hi: (
    <>
      <path fill="#f93" d="M0 0h640v160H0z" />
      <path fill="#fff" d="M0 160h640v160H0z" />
      <path fill="#128807" d="M0 320h640v160H0z" />
      <g transform="translate(320 240)">
        <circle r="44" fill="none" stroke="#008" strokeWidth="9" />
        <circle r="6" fill="#008" />
        <g>
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={i}
              x1="0"
              y1="0"
              x2="44"
              y2="0"
              stroke="#008"
              strokeWidth="2"
              transform={`rotate(${i * 15})`}
            />
          ))}
        </g>
      </g>
    </>
  ),
  // Spain
  es: (
    <>
      <path fill="#c60b1e" d="M0 0h640v480H0z" />
      <path fill="#ffc400" d="M0 120h640v240H0z" />
    </>
  ),
  // France
  fr: (
    <>
      <path fill="#fff" d="M0 0h640v480H0z" />
      <path fill="#002654" d="M0 0h213.3v480H0z" />
      <path fill="#ce1126" d="M426.7 0H640v480H426.7z" />
    </>
  ),
  // Germany
  de: (
    <>
      <path fill="#000" d="M0 0h640v160H0z" />
      <path fill="#d00" d="M0 160h640v160H0z" />
      <path fill="#ffce00" d="M0 320h640v160H0z" />
    </>
  ),
  // Brazil
  br: (
    <>
      <path fill="#009739" d="M0 0h640v480H0z" />
      <path fill="#fedf00" d="M127.7 240 320 86.2 512.4 240 320 393.8z" />
      <circle cx="320" cy="240" r="80" fill="#002776" />
      <path fill="#fff" d="M294 220l-2 4 4 4-2 4-2 8 2 4 2 8v8l-2 4-2 4v4l2 4 2 4 2-4v-4l2-4 2-8v-8l-2-8 2-4 4-4-2-4-2-4z" transform="rotate(-15 320 240)" />
    </>
  ),
};

export default function FlagIcon({
  code,
  size = 16,
  className,
}: {
  code: string;
  size?: number;
  className?: string;
}) {
  const normalized: FlagCode = code === 'pt-BR' ? 'br' : code as FlagCode;
  const flag = flags[normalized];
  if (!flag) return null;
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 640 480"
      className={`inline-block shrink-0 rounded-xs ${className ?? ''}`}
      role="presentation"
      aria-hidden="true"
    >
      {flag}
    </svg>
  );
}
