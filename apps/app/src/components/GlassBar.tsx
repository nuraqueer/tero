import {
  Children,
  forwardRef,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { navigation } from '@tero/ui';
import { GlassSurface } from './GlassSurface';
import { useNavigationBar } from '@/lib/navigation-bar';
import { useLocale } from '@/lib/locale';
import { bottomControlOffset } from '@/lib/bottom-clearance';

/**
 * Content passes under the Hino glass capsule. Modern Android uses its efficient
 * blur API; older Android keeps a translucent tint instead of costly software blur.
 */
export const GlassBar = forwardRef<
  View,
  ViewProps & {
    children?: ReactNode;
    activeIndex: number;
    activeLabel: string;
    tabCount: number;
    reduceMotion: boolean;
    blurTarget: RefObject<View | null>;
    reduceTransparency: boolean;
  }
>(function GlassBar(
  {
    children,
    style,
    activeIndex,
    activeLabel,
    tabCount,
    reduceMotion,
    blurTarget,
    reduceTransparency,
    ...props
  },
  ref,
) {
  const insets = useSafeAreaInsets();
  const navigationBar = useNavigationBar();
  const { t } = useLocale();
  const collapsed = navigationBar?.collapsed === true && activeIndex < tabCount - 1;
  const [wrapWidth, setWrapWidth] = useState(0);
  const rowWidth = Math.max(0, wrapWidth - barHeight - 10);
  const columnWidth = Math.max(0, rowWidth - navigation.innerInset * 2) / (tabCount - 1);
  const items = Children.toArray(children);
  const [position] = useState(() => new Animated.Value(0));
  const [collapse] = useState(() => new Animated.Value(0));
  const previousWidth = useRef(0);

  useEffect(() => {
    collapse.stopAnimation();
    if (reduceMotion) collapse.setValue(collapsed ? 1 : 0);
    else
      Animated.spring(collapse, {
        toValue: collapsed ? 1 : 0,
        ...navigation.collapseSpring,
        // Animate the actual surface bounds so native glass keeps its round shape.
        useNativeDriver: false,
      }).start();
    return () => collapse.stopAnimation();
  }, [collapse, collapsed, reduceMotion]);

  useEffect(() => {
    const target = Math.min(activeIndex, tabCount - 2) * columnWidth;
    // Initial layout and rotation should place the capsule directly under its tab.
    if (reduceMotion || columnWidth !== previousWidth.current) {
      position.stopAnimation();
      position.setValue(target);
    } else {
      Animated.spring(position, {
        toValue: target,
        ...navigation.spring,
        // Shares an animated view with the layout driven collapse value.
        useNativeDriver: false,
      }).start();
    }
    previousWidth.current = columnWidth;
    return () => position.stopAnimation();
  }, [activeIndex, columnWidth, reduceMotion, position, tabCount]);

  return (
    <View
      ref={ref}
      {...props}
      pointerEvents="box-none"
      onLayout={(event) => setWrapWidth(event.nativeEvent.layout.width)}
      style={[styles.wrap, { bottom: bottomControlOffset(insets.bottom) }, style]}
    >
      <Animated.View
        style={{
          width: collapse.interpolate({
            inputRange: [0, 1],
            outputRange: [rowWidth, barHeight],
          }),
          height: barHeight,
        }}
      >
        <GlassSurface
          style={[styles.capsule, StyleSheet.absoluteFill]}
          blurTarget={blurTarget}
          reduceTransparency={reduceTransparency}
        >
          <View style={styles.row}>
            {columnWidth > 0 && activeIndex < tabCount - 1 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.selection,
                  {
                    width: columnWidth,
                    transform: [{ translateX: position }],
                    opacity: collapse.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                  },
                ]}
              />
            )}
            {items.slice(0, -1).map((item, index) => (
              <Animated.View
                key={index}
                pointerEvents={collapsed ? 'none' : 'auto'}
                accessibilityElementsHidden={collapsed}
                importantForAccessibility={collapsed ? 'no-hide-descendants' : 'auto'}
                style={[
                  styles.item,
                  {
                    left: navigation.innerInset,
                    width: collapse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [columnWidth, barHeight - navigation.innerInset * 2],
                    }),
                    transform: [
                      {
                        translateX: collapse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [index * columnWidth, 0],
                        }),
                      },
                    ],
                    opacity:
                      index === activeIndex
                        ? 1
                        : collapse.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0, 0] }),
                  },
                ]}
              >
                {item}
              </Animated.View>
            ))}
          </View>
          {collapsed && (
            <Pressable
              style={StyleSheet.absoluteFill}
              accessibilityRole="button"
              accessibilityLabel={`${activeLabel}, ${t('tabs.showAll')}`}
              onPress={navigationBar?.reveal}
            />
          )}
        </GlassSurface>
      </Animated.View>
      <GlassSurface
        style={styles.profile}
        blurTarget={blurTarget}
        reduceTransparency={reduceTransparency}
      >
        {items.at(-1)}
      </GlassSurface>
    </View>
  );
});

/** iPhone sits low in its home inset; Android clears system navigation buttons. */
const barHeight = Platform.OS === 'android' ? navigation.androidHeight : navigation.height;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: navigation.horizontalInset,
    right: navigation.horizontalInset,
    maxWidth: 488,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: barHeight,
  },
  capsule: {
    flex: 1,
    height: barHeight,
    borderRadius: barHeight / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(31,30,29,0.12)',
    shadowColor: '#141413',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  profile: {
    width: barHeight,
    height: barHeight,
    borderRadius: barHeight / 2,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(31,30,29,0.12)',
    elevation: 3,
  },
  selection: {
    position: 'absolute',
    left: navigation.innerInset,
    top: navigation.innerInset,
    bottom: navigation.innerInset,
    borderRadius: 23,
    backgroundColor: 'rgba(31,30,29,0.065)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: navigation.innerInset,
  },
  item: {
    position: 'absolute',
    top: navigation.innerInset,
    bottom: navigation.innerInset,
  },
});
