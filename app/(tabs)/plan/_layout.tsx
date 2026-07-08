import React from 'react';
import { usePathname } from 'expo-router';
import { SegmentedTabLayout } from '../../../components/ui/SegmentedTabLayout';

export default function PlanLayout() {
  const pathname = usePathname();
  const active = pathname.includes('/plan/goals')
    ? 'goals'
    : pathname.includes('/plan/content')
      ? 'content'
      : 'calendar';

  return (
    <SegmentedTabLayout
      title="Plan"
      basePath="/plan"
      activeKey={active}
      segments={[
        { key: 'calendar', label: 'Calendar' },
        { key: 'goals', label: 'Goals' },
        { key: 'content', label: 'Content' },
      ]}
    />
  );
}
