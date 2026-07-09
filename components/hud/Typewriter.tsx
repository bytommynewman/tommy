import React, { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

// Types text in character-by-character, terminal style. Reduced motion (or
// charMs 0) renders instantly. Re-runs when `text` changes (new daily read).
export function Typewriter({
  text,
  style,
  charMs = 18,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  charMs?: number;
}) {
  const reduceMotion = useReducedMotion();
  const instant = reduceMotion || charMs <= 0;
  const [count, setCount] = useState(instant ? text.length : 0);

  useEffect(() => {
    if (instant) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const timer = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(timer);
          return c;
        }
        return c + 1;
      });
    }, charMs);
    return () => clearInterval(timer);
  }, [text, charMs, instant]);

  return <Text style={style}>{text.slice(0, count)}</Text>;
}
