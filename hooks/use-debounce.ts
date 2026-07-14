"use client"

import { useCallback, useRef } from "react"

export function useDebouncedCallback<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay]) as T
}
