import React from 'react';
import { usePathname } from 'expo-router';
import { SegmentedTabLayout } from '../../../components/ui/SegmentedTabLayout';

export default function ReflectLayout() {
  const pathname = usePathname();
  const active = pathname.includes('/reflect/chat') ? 'chat' : 'journal';

  return (
    <SegmentedTabLayout
      title="Reflect"
      basePath="/reflect"
      activeKey={active}
      segments={[
        { key: 'journal', label: 'Journal' },
        { key: 'chat', label: 'Therapist' },
      ]}
    />
  );
}
