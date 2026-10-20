import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const stroke = (props: P) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...props,
})

export const WindowsIcon = (props: P) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} {...props}>
    <path d="M3 5.1 10.4 4v7.1H3V5.1Zm8.3-1.2L21 2.5v8.6h-9.7V3.9ZM3 12.9h7.4V20L3 18.9v-6Zm8.3 0H21v8.6l-9.7-1.4v-7.2Z" />
  </svg>
)

export const AppleIcon = (props: P) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} {...props}>
    <path d="M16.37 12.62c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.78.74 2.99.72 1.24-.02 2.02-1.12 2.77-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.39-.92-2.4-3.69ZM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.67 1.37-.58.67-1.1 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28Z" />
  </svg>
)

export const DownloadIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" />
  </svg>
)

export const ArrowRight = (props: P) => (
  <svg {...stroke({ width: 14, height: 14, ...props })}>
    <path d="M5 12h14m0 0-5-5m5 5-5 5" />
  </svg>
)

export const GridIcon = (props: P) => (
  <svg {...stroke(props)}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M9.5 9.5v10" />
  </svg>
)

export const ColumnsIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M5 7h5M5 12h3M5 17h4" />
    <rect x="13" y="5" width="6" height="4" rx="1.2" />
    <path d="M13 13.5l2 2 4-4" />
  </svg>
)

export const LayersIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="m12 4 8 4-8 4-8-4 8-4Z" />
    <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
  </svg>
)

export const HistoryIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4v4.5h4.5M12 8v4l3 2" />
  </svg>
)

export const BellIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
  </svg>
)

export const SwapIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M7 4v13m0 0-3-3m3 3 3-3M17 20V7m0 0-3 3m3-3 3 3" />
  </svg>
)

export const LockIcon = (props: P) => (
  <svg {...stroke(props)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 1 1 8 0v2.5M12 14.5v2" />
  </svg>
)

export const DatabaseIcon = (props: P) => (
  <svg {...stroke(props)}>
    <ellipse cx="12" cy="6" rx="7" ry="2.5" />
    <path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
  </svg>
)

export const WifiOffIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4.2-2.6M12 9.5a10 10 0 0 1 7 3.5M2 9.5a15 15 0 0 1 5-3M11 5.6A15 15 0 0 1 22 9.5" />
    <circle cx="12" cy="19.5" r=".6" fill="currentColor" />
  </svg>
)

export const SunMoonIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17V3.5Z" fill="currentColor" fillOpacity=".12" />
    <circle cx="12" cy="12" r="8.5" />
  </svg>
)

export const TableIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M3.5 14.5h17M10 9.5v10" />
  </svg>
)

export const CalendarIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
)

export const ChartIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <path d="M4 20h16M7 16v-4M12 16V7M17 16v-6" />
  </svg>
)

export const CheckSquareIcon = (props: P) => (
  <svg {...stroke(props)}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="m8.5 12 2.5 2.5 4.5-5" />
  </svg>
)

export const BoxIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="m12 3.5 8 4v9l-8 4-8-4v-9l8-4Z" />
    <path d="m4 7.5 8 4 8-4M12 11.5v9" />
  </svg>
)

export const ChevronDown = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const SearchIcon = (props: P) => (
  <svg {...stroke({ width: 13, height: 13, ...props })}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
)

export const MenuIcon = (props: P) => (
  <svg {...stroke({ width: 13, height: 13, ...props })}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
)

export const PlusIcon = (props: P) => (
  <svg {...stroke({ width: 13, height: 13, ...props })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const TrashIcon = (props: P) => (
  <svg {...stroke({ width: 14, height: 14, ...props })}>
    <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />
  </svg>
)

export const CheckIcon = (props: P) => (
  <svg {...stroke({ width: 12, height: 12, strokeWidth: 2.4, ...props })}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const HomeIcon = (props: P) => (
  <svg {...stroke({ width: 13, height: 13, ...props })}>
    <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
    <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
  </svg>
)

export const ActivityIcon = (props: P) => (
  <svg {...stroke({ width: 13, height: 13, ...props })}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.5" />
    <path d="M4 4v4.5h4.5M12 8v4l3 2" />
  </svg>
)

export const FolderIcon = (props: P) => (
  <svg {...stroke({ width: 13, height: 13, ...props })}>
    <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-10Z" />
  </svg>
)

export const AwardIcon = (props: P) => (
  <svg {...stroke(props)}>
    <circle cx="12" cy="9" r="5.5" />
    <path d="m9 13.8-1.5 6.7L12 18l4.5 2.5-1.5-6.7" />
    <path d="m10 9 1.4 1.4L14.2 7.6" />
  </svg>
)

export const UsersCheckIcon = (props: P) => (
  <svg {...stroke(props)}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6 1.4 0 2.6.4 3.6 1.2" />
    <path d="m15 17.5 2 2 4-4.5" />
    <path d="M15.5 5.5a3.2 3.2 0 0 1 0 6.2" />
  </svg>
)

export const TablePlusIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M12 19.5H6A2.5 2.5 0 0 1 3.5 17V7A2.5 2.5 0 0 1 6 4.5h12A2.5 2.5 0 0 1 20.5 7v5" />
    <path d="M3.5 9.5h17M9.5 9.5v10" />
    <path d="M18 15v6M15 18h6" />
  </svg>
)

export const CalendarDayIcon = (props: P) => (
  <svg {...stroke(props)}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
    <rect x="13" y="13" width="3.5" height="3.5" rx="0.8" fill="currentColor" stroke="none" />
  </svg>
)

export const DashboardIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M4 20h16M7 20V11M12 20V4M17 20V14" />
  </svg>
)

export const CloseIcon = (props: P) => (
  <svg {...stroke(props)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const CpuIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
  </svg>
)

export const PackageIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
    <path d="m7.5 5.5 8 4.5" />
  </svg>
)

export const GitHubIcon = (props: P) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable={false} {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
  </svg>
)

export const TagIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <path d="m12.5 3.5 8 8a2.12 2.12 0 0 1 0 3l-5 5a2.12 2.12 0 0 1-3 0l-8-8V3.5h8Z" />
    <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

export const HelpCircleIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <circle cx="12" cy="17" r="0.75" fill="currentColor" stroke="none" />
  </svg>
)

export const ArrowUpIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)

export const TemplateIcon = (props: P) => (
  <svg {...stroke({ width: 16, height: 16, ...props })}>
    <rect width="18" height="7" x="3" y="3" rx="1.5" />
    <rect width="9" height="7" x="3" y="14" rx="1.5" />
    <rect width="5" height="7" x="16" y="14" rx="1.5" />
  </svg>
)
