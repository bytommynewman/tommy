import React from 'react';
import { usePathname } from 'expo-router';
import { SegmentedTabLayout } from '../../../components/ui/SegmentedTabLayout';

export default function InvestLayout() {
  const pathname = usePathname();
  const active = pathname.includes('/invest/watchlist')
    ? 'watchlist'
    : pathname.includes('/invest/market')
      ? 'market'
      : 'portfolio';

  return (
    <SegmentedTabLayout
      title="Invest"
      basePath="/invest"
      activeKey={active}
      segments={[
        { key: 'portfolio', label: 'Portfolio' },
        { key: 'watchlist', label: 'Watchlist' },
        { key: 'market', label: 'Market' },
      ]}
    />
  );
}
