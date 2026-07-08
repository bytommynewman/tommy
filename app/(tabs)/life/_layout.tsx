import React from 'react';
import { usePathname } from 'expo-router';
import { SegmentedTabLayout } from '../../../components/ui/SegmentedTabLayout';

export default function LifeLayout() {
  const pathname = usePathname();
  const active = pathname.includes('/life/people') ? 'people' : 'fitness';

  return (
    <SegmentedTabLayout
      title="Life"
      basePath="/life"
      activeKey={active}
      segments={[
        { key: 'fitness', label: 'Fitness' },
        { key: 'people', label: 'People' },
      ]}
    />
  );
}
