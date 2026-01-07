"use client";

import { useState, useCallback } from "react";

export interface NavigationItem {
  id: string;
  title: string;
  component: string;
  data?: any;
  breadcrumb: {
    label: string;
    icon?: string;
  };
}

interface NavigationStackState {
  items: NavigationItem[];
  currentLevel: number;
}

export function useNavigationStack() {
  const [state, setState] = useState<NavigationStackState>({
    items: [],
    currentLevel: 0,
  });

  const initialize = useCallback((rootItem: NavigationItem) => {
    setState({
      items: [rootItem],
      currentLevel: 0,
    });
  }, []);

  const push = useCallback((item: NavigationItem) => {
    setState((prev) => ({
      items: [...prev.items, item],
      currentLevel: prev.items.length,
    }));
  }, []);

  const pop = useCallback(() => {
    setState((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        items: prev.items.slice(0, -1),
        currentLevel: prev.items.length - 2,
      };
    });
  }, []);

  const navigateToLevel = useCallback((level: number) => {
    setState((prev) => {
      if (level < 0 || level >= prev.items.length) return prev;
      return {
        items: prev.items.slice(0, level + 1),
        currentLevel: level,
      };
    });
  }, []);

  const peek = useCallback((): NavigationItem | null => {
    return state.items[state.currentLevel] || null;
  }, [state.items, state.currentLevel]);

  return {
    navigationStack: state.items,
    currentLevel: state.currentLevel,
    initialize,
    push,
    pop,
    navigateToLevel,
    peek,
  };
}
