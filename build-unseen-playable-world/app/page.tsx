import UnseenWorld from '@/components/unseen-world'

export default function Page() {
  return <UnseenWorld />
}

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'UNSEEN — a field guide for paying attention',
  description: 'Enter a quiet, playable world built to make you look closer.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const route = '/world'
