'use client';
import { createContext, useContext } from 'react';

export interface SidebarPeekContextValue {
  isPeeking: boolean;
  pin: () => void;
}

export const SidebarPeekContext = createContext<SidebarPeekContextValue>({
  isPeeking: false,
  pin: () => {},
});

export const useSidebarPeek = () => useContext(SidebarPeekContext);
