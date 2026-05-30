import type { Metadata } from 'next';
import LandingBridgeSwitcher from '@/components/marketing/LandingBridgeSwitcher';

export const metadata: Metadata = {
  title: {
    absolute: 'Remnus | MCP-Native workspace for vibe coders',
  },
  description: 'The workspace built for vibe coders and AI agents. Build databases, kanban boards, and pages that Claude, Cursor, Windsurf, and any MCP client can read and write.',
  alternates: {
    canonical: 'https://remnus.com',
    languages: {
      'en': 'https://remnus.com',
      'tr': 'https://remnus.com',
      'hi': 'https://remnus.com',
      'es': 'https://remnus.com',
      'fr': 'https://remnus.com',
      'de': 'https://remnus.com',
      'x-default': 'https://remnus.com',
    },
  },
  openGraph: {
    title: 'Remnus | MCP-Native workspace for vibe coders',
    description: 'The workspace built for vibe coders and AI agents. Build databases, kanban boards, and pages that Claude, Cursor, Windsurf, and any MCP client can read and write.',
  },
  twitter: {
    title: 'Remnus | MCP-Native workspace for vibe coders',
    description: 'The workspace built for vibe coders and AI agents. Build databases, kanban boards, and pages that Claude, Cursor, Windsurf, and any MCP client can read and write.',
  },
};

export default function HomePage() {
  return <LandingBridgeSwitcher />;
}
