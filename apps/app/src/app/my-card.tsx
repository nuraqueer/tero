import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, space } from '@tero/ui';
import { CardBack } from '@/components/CardBack';
import { MemberCard } from '@/components/MemberCard';
import { useLocale } from '@/lib/locale';
import { useFullSession } from '@/lib/session';

/** Your own card, alone on a dark table: it arrives face down and turns over. */
export default function MyCard() {
  const { t } = useLocale();
  const session = useFullSession();
  const { width, height } = useWindowDimensions();
  const turn = useRef(new Animated.Value(0)).current;
  const [faceUp, setFaceUp] = useState(false);

  const flip = (up: boolean) => {
    setFaceUp(up);
    Animated.timing(turn, {
      toValue: up ? 1 : 0,
      duration: 700,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  // Turn over by itself after a short pause; at once if the phone asks for less motion.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        turn.setValue(1);
        setFaceUp(true);
      } else timer = setTimeout(() => flip(true), 450);
    });
    return () => clearTimeout(timer);
  }, []);

  if (!session || session.arcana === null) return null;

  const cardWidth = Math.min(width - 64, (height - 220) / 1.55, 340);
  const front = turn.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });
  const back = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.table}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('myCard.turn')}
        onPress={() => flip(!faceUp)}
        style={{ width: cardWidth, height: cardWidth * 1.55 }}
      >
        <Animated.View
          style={[styles.face, { transform: [{ perspective: 1200 }, { rotateY: back }] }]}
        >
          <CardBack width={cardWidth} />
        </Animated.View>
        <Animated.View
          style={[styles.face, { transform: [{ perspective: 1200 }, { rotateY: front }] }]}
        >
          <MemberCard arcana={session.arcana} sequence={session.sequence} width={cardWidth} />
        </Animated.View>
      </Pressable>
      <Text style={styles.hint}>{t('myCard.hint')}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.close}>
        <Text style={styles.closeLabel}>{t('card.done')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    flex: 1,
    backgroundColor: '#0E0E0D',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
  },
  face: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backfaceVisibility: 'hidden',
  },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  close: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(230,201,168,0.5)',
  },
  closeLabel: { fontFamily: fonts.bodySemibold, fontSize: 16, color: colors.goldLight },
});
