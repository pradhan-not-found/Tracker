'use client'

import { useEffect, useState } from 'react'
import type { Platform } from './downloads'

type UAData = {
  platform?: string
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string }>
}

export type DetectedPlatform = {
  os: Platform | null
  /** Only known on Chromium browsers via UA Client Hints; null otherwise. */
  macArch: 'arm' | 'x86' | null
}

function detectOS(): Platform {
  const nav = navigator as Navigator & { userAgentData?: UAData }
  const hint = nav.userAgentData?.platform?.toLowerCase() ?? ''
  const ua = navigator.userAgent.toLowerCase()
  const source = hint || ua
  // iOS / Android get the "other" treatment, since Tracker is desktop only.
  if (/iphone|ipad|ipod|android/.test(ua)) return 'other'
  if (source.includes('win')) return 'windows'
  if (source.includes('mac')) {
    // iPadOS reports as Mac but has touch points.
    if (navigator.maxTouchPoints > 1) return 'other'
    return 'mac'
  }
  return 'other'
}

export function usePlatform(): DetectedPlatform {
  const [state, setState] = useState<DetectedPlatform>({ os: null, macArch: null })

  useEffect(() => {
    const os = detectOS()
    setState({ os, macArch: null })
    const uaData = (navigator as Navigator & { userAgentData?: UAData }).userAgentData
    if (os === 'mac' && uaData?.getHighEntropyValues) {
      uaData
        .getHighEntropyValues(['architecture'])
        .then((v) => {
          if (v.architecture === 'arm' || v.architecture === 'x86') {
            setState({ os, macArch: v.architecture })
          }
        })
        .catch(() => {})
    }
  }, [])

  return state
}
