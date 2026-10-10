import type { Metadata } from 'next';import './globals.css';
export const metadata:Metadata={title:'IELTS Fashion Academy',description:'Learn IELTS • Earn Coins • Dress Your Avatar'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}
