'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

function initPostHog() {
  if (!posthogKey || typeof window === 'undefined' || posthog.__loaded) {
    return
  }

  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
  })
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return

    initPostHog()

    let url = window.location.origin + pathname
    const search = searchParams.toString()
    if (search) url += `?${search}`
    posthog.capture('$pageview', { '$current_url': url })
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  if (!posthogKey) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  )
}
