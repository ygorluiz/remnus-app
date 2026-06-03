import { NextRequest, NextResponse } from 'next/server';
import dns from 'node:dns/promises';
import net from 'node:net';
import { getCurrentUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 6000;

// ── SSRF guards ──────────────────────────────────────────────────────────
// String-matching a hostname is not enough: an attacker can point a public DNS
// name at a private/loopback address, use IPv6 / IPv4-mapped forms, decimal IPs,
// or a redirect to a metadata endpoint. We therefore resolve every host and
// classify every returned address, and re-validate on each redirect hop.

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable → treat as unsafe
  const inRange = (base: string, bits: number) => {
    const b = ipv4ToInt(base)!;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (b & mask);
  };
  return (
    inRange('0.0.0.0', 8) || // "this" network / unspecified
    inRange('10.0.0.0', 8) ||
    inRange('100.64.0.0', 10) || // CGNAT
    inRange('127.0.0.0', 8) || // loopback
    inRange('169.254.0.0', 16) || // link-local (incl. cloud metadata)
    inRange('172.16.0.0', 12) ||
    inRange('192.0.0.0', 24) ||
    inRange('192.0.2.0', 24) ||
    inRange('192.168.0.0', 16) ||
    inRange('198.18.0.0', 15) || // benchmarking
    inRange('224.0.0.0', 4) || // multicast
    inRange('240.0.0.0', 4) // reserved / broadcast
  );
}

function isPrivateIPv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0]; // strip zone id
  if (addr === '::1' || addr === '::') return true; // loopback / unspecified
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/); // IPv4-mapped
  if (mapped) return isPrivateIPv4(mapped[1]);
  const first = parseInt(addr.split(':')[0] || '0', 16);
  if (Number.isNaN(first)) return true;
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  return false;
}

function isPrivateAddr(ip: string): boolean {
  const fam = net.isIP(ip);
  if (fam === 4) return isPrivateIPv4(ip);
  if (fam === 6) return isPrivateIPv6(ip);
  return true; // not an IP we understand → unsafe
}

// Validate protocol + that the host resolves only to public addresses.
async function isSafeUrl(url: URL): Promise<boolean> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost')) return false;

  if (net.isIP(host)) return !isPrivateAddr(host);

  try {
    const addrs = await dns.lookup(host, { all: true });
    if (!addrs.length) return false;
    // Reject if ANY resolved address is private/loopback/etc.
    return addrs.every(a => !isPrivateAddr(a.address));
  } catch {
    return false;
  }
  // NOTE: a residual DNS-rebinding TOCTOU window exists between this lookup and
  // the fetch's own resolution. Fully closing it requires pinning the resolved
  // IP via a custom undici dispatcher (preserving SNI); per-hop revalidation
  // below keeps the exposure small.
}

function parseUrlNoCreds(raw: string, base?: URL): URL | null {
  try {
    const u = new URL(raw, base);
    u.username = '';
    u.password = '';
    return u;
  } catch {
    return null;
  }
}

// Manually follow redirects, re-validating every hop against the SSRF guard.
async function safeFetch(initial: URL, signal: AbortSignal): Promise<Response | null> {
  let current = initial;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!(await isSafeUrl(current))) return null;
    const res = await fetch(current.toString(), {
      signal,
      redirect: 'manual',
      headers: { 'User-Agent': 'RemnusBot/1.0 (+https://remnus.com)' },
    });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null;
    if (!location) return res;
    res.body?.cancel().catch(() => {});
    const next = parseUrlNoCreds(location, current);
    if (!next) return null;
    current = next;
  }
  return null; // too many redirects
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

function pickMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']` +
        `|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
      'i',
    );
    const m = html.match(re);
    if (m) {
      const val = (m[1] ?? m[2] ?? '').trim();
      if (val) return decodeEntities(val);
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const target = req.nextUrl.searchParams.get('url');
  if (!target) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const url = parseUrlNoCreds(target);
  if (!url || !(await isSafeUrl(url))) {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await safeFetch(url, controller.signal);
    if (!res || !res.ok) {
      return NextResponse.json({ url: url.toString(), title: url.hostname }, { status: 200 });
    }

    // Only read up to </head> — meta tags live there.
    const reader = res.body?.getReader();
    let html = '';
    if (reader) {
      const decoder = new TextDecoder();
      for (let i = 0; i < 20; i++) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        if (html.length > 200_000 || /<\/head>/i.test(html)) break;
      }
      reader.cancel().catch(() => {});
    } else {
      html = await res.text();
    }

    const title =
      pickMeta(html, ['og:title', 'twitter:title']) ||
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
      url.hostname;
    const description = pickMeta(html, ['og:description', 'twitter:description', 'description']) || '';
    const image = pickMeta(html, ['og:image', 'twitter:image', 'twitter:image:src']) || '';
    const favicon = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;

    let absImage = '';
    if (image) {
      try {
        absImage = new URL(image, url).toString();
      } catch {
        absImage = '';
      }
    }

    return NextResponse.json({
      url: url.toString(),
      title: decodeEntities(title),
      description,
      image: absImage,
      favicon,
    });
  } catch {
    return NextResponse.json({ url: url.toString(), title: url.hostname }, { status: 200 });
  } finally {
    clearTimeout(timeout);
  }
}
