import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyVipToken, VIP_COOKIE_NAME } from '@/lib/gatekeeper';
import CampanhaClient from './CampanhaClient';

export const dynamic = 'force-dynamic';

// "Tag de metadado" - SEO e OpenGraph para a aba da campanha
export const metadata: Metadata = {
  title: 'Ateliê Franga Toys',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function CampanhaPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const sp = await searchParams;
  const vipQuery = typeof sp?.vip === 'string' ? sp.vip : undefined;
  const vipCookie = cookieStore.get(VIP_COOKIE_NAME)?.value;

  const access = await verifyVipToken(vipCookie || vipQuery);
  if (!access.valid) {
    redirect('/');
  }

  return <CampanhaClient />;
}
