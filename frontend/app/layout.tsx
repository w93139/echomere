import type { Metadata } from 'next';
import { Cormorant_Garamond, Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PreviewNavigator } from '@/components/preview-navigator';
import { SpectralCursor } from '@/components/spectral-cursor';

const sans = Noto_Sans_SC({ variable: '--font-sans', subsets: ['latin'], weight: ['400', '500', '600'] });
const serif = Noto_Serif_SC({ variable: '--font-serif', subsets: ['latin'], weight: ['300', '400', '500'] });
const display = Cormorant_Garamond({ variable: '--font-display', subsets: ['latin'], weight: ['300', '400', '500'] });

export const metadata: Metadata = {
  title: 'ECHOMERE 洄映｜一念成漪，照见未见',
  description: '以八字与星盘为双重映照，于时间的回响中，辨认此刻的自己与前行的纹理。',
  openGraph: { title: 'ECHOMERE 洄映', description: '一念成漪，照见未见。', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'ECHOMERE 洄映', description: '一念成漪，照见未见。' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body className={`${sans.variable} ${serif.variable} ${display.variable}`}><Providers>{children}<PreviewNavigator /><SpectralCursor /></Providers></body></html>;
}
