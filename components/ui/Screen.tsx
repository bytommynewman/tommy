import React from 'react';
import { ScrollView, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../lib/theme';

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  // Screens without a native header (Today, segmented children, auth) must
  // clear the notch/status bar themselves; screens inside a native-header
  // stack (modals, recovery stack) must not double-pad.
  safeTop?: boolean;
};

export function Screen({ scroll, padded = true, safeTop = false, style, children, ...rest }: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  const paddingTop = safeTop ? insets.top + spacing.sm : padded ? spacing.lg : 0;
  const content = {
    paddingTop,
    paddingHorizontal: padded ? spacing.lg : 0,
    paddingBottom: padded ? spacing.xl : 0,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[{ flex: 1, backgroundColor: colors.background }, style]}
        contentContainerStyle={content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={[{ flex: 1, backgroundColor: colors.background }, content, style]} {...rest}>
      {children}
    </View>
  );
}
