import { RELEASES_URL } from './downloads'

/** Single source for the visible FAQ and the FAQPage JSON-LD. */
export type FaqItem = { q: string; a: string; link?: { text: string; href: string; after?: string } }

export const faqs: FaqItem[] = [
  {
    q: 'Is Tracker free?',
    a: 'Yes. Tracker is free to download and use, with no account, trial or subscription.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Directly on your desktop. Tracker is entirely local-first, so all your data remains securely on your computer in your complete control. Nothing is ever uploaded to external servers or the cloud.',
  },
  {
    q: 'How do updates work?',
    a: 'Tracker checks for a new version every time it opens and shows it until you update. One click downloads it, and Tracker restarts and installs it by itself. Updates replace the app only: your workspaces, sheets and files are never touched.',
  },
  {
    q: 'macOS says Apple could not verify Tracker. What do I do?',
    a: 'Tracker for Mac is not yet notarized by Apple, so macOS asks once. Click Done, open System Settings › Privacy & Security, scroll down and click Open Anyway next to Tracker, then confirm with your password. After that it opens normally, and updates from inside Tracker do not ask again.',
  },
  {
    q: 'Which Mac download do I need?',
    a: 'Choose Apple Silicon for Macs with an M-series chip (most Macs from late 2020 onward) and Intel for older Macs. You can check under Apple menu, About This Mac.',
  },
  {
    q: 'Can I bring in my existing spreadsheets?',
    a: 'Yes. Import CSV or Excel files into a sheet, and export any sheet, or your whole workspace, to CSV, Excel (.xlsx) or JSON.',
  },
  {
    q: 'Windows warns about an unrecognised app.',
    a: 'Windows SmartScreen may show a warning for new apps. Click “More info”, then “Run anyway”. Prefer not to install anything? Use the portable .exe instead.',
  },
  {
    q: 'Where can I find older versions or release notes?',
    a: 'Every build and changelog is on the',
    link: { text: 'GitHub releases page', href: RELEASES_URL, after: '.' },
  },
]

export const faqPlain = (f: FaqItem) => (f.link ? `${f.a} ${f.link.text} (${f.link.href})${f.link.after ?? ''}` : f.a)
