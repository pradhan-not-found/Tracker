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
    a: 'Tracker tells you when a new version is available and asks before installing anything. Updates replace the app only: your workspaces, sheets and files are never touched.',
  },
  {
    q: 'macOS says the app can’t be opened. What do I do?',
    a: 'The macOS builds are not yet signed with an Apple Developer ID. On first launch, right-click (or Control-click) Tracker in Applications and choose Open, then confirm. After that it opens normally.',
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
