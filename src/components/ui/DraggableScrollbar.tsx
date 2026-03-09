import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, PanResponder, GestureResponderEvent, PanResponderGestureState, Platform } from 'react-native';

/**
 * DraggableScrollbar
 * Overlay-Scrollbar für RN/Expo (iOS/Android/Web), der rechts angezeigt wird,
 * sich per Drag verschieben lässt und synchron zur Scroll-Position läuft.
 *
 * Verwendung:
 * - In einer View über die Nachrichtenliste absolut positionieren.
 * - Props aus onScroll, onContentSizeChange und onLayout befüllen.
 *
 * Beispiel in einer Chat-Ansicht:
 *   - onLayout -> viewportHeight setzen
 *   - onContentSizeChange -> contentHeight setzen
 *   - onScroll -> scrollOffset setzen
 *   - onRequestScrollTo -> FlatList.scrollToOffset({ offset, animated: false })
 */
export interface DraggableScrollbarProps {
  scrollOffset: number;         // aktueller offset (y) der Liste
  contentHeight: number;        // gesamte Inhalts-Höhe der Liste
  viewportHeight: number;       // sichtbare Höhe (Container-Höhe)
  onRequestScrollTo: (offset: number) => void; // beim Drag gewünschtes Scroll-Ziel setzen

  trackWidth?: number;          // Breite des Tracks
  thumbMinHeight?: number;      // minimale Höhe des Thumbs
  trackColor?: string;          // Farbe des Tracks
  thumbColor?: string;          // Farbe des Thumbs
  visible?: boolean;            // explizite Sichtbarkeit, überschreibt auto-hide
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function DraggableScrollbar({
  scrollOffset,
  contentHeight,
  viewportHeight,
  onRequestScrollTo,
  trackWidth = 6,
  thumbMinHeight = 30,
  trackColor = Platform.OS === 'web' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
  thumbColor = Platform.OS === 'web' ? '#059669' : 'rgba(255,255,255,0.75)',
  visible,
}: DraggableScrollbarProps) {
  // Track-Höhe entspricht dem verfügbaren Viewport
  const trackHeight = viewportHeight;

  // Auto-Hide wenn kein Scroll nötig
  const autoHide = contentHeight <= viewportHeight || viewportHeight <= 0;
  const isVisible = visible !== undefined ? visible : !autoHide;

  // Thumb-Höhe proportional zur Relation Viewport/Content
  const thumbHeight = useMemo(() => {
    if (autoHide) return thumbMinHeight;
    const ratio = viewportHeight / contentHeight;
    return clamp(ratio * trackHeight, thumbMinHeight, trackHeight);
  }, [viewportHeight, contentHeight, trackHeight, autoHide, thumbMinHeight]);

  const maxThumbTop = Math.max(0, trackHeight - thumbHeight);

  // Position des Thumbs aus aktuellem Scroll-Offset ableiten
  const thumbTop = useMemo(() => {
    if (autoHide) return 0;
    const maxScroll = Math.max(0, contentHeight - viewportHeight);
    const ratio = maxScroll === 0 ? 0 : scrollOffset / maxScroll;
    return clamp(ratio * maxThumbTop, 0, maxThumbTop);
  }, [scrollOffset, contentHeight, viewportHeight, maxThumbTop, autoHide]);

  // Drag-State
  const startTopRef = useRef(0);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (_evt: GestureResponderEvent, _gs: PanResponderGestureState) => true,
    onMoveShouldSetPanResponder: (_evt, gs) => Math.abs(gs.dy) > 1,
    onPanResponderGrant: () => {
      startTopRef.current = thumbTop;
    },
    onPanResponderMove: (_evt, gs) => {
      if (autoHide) return;
      const nextTop = clamp(startTopRef.current + gs.dy, 0, maxThumbTop);
      const ratio = maxThumbTop === 0 ? 0 : nextTop / maxThumbTop;
      const maxScroll = Math.max(0, contentHeight - viewportHeight);
      const nextOffset = clamp(ratio * maxScroll, 0, maxScroll);
      // Direkte Synchronisierung für "reibungslose" Bewegung ohne merkbare Verzögerung
      onRequestScrollTo(nextOffset);
    },
    onPanResponderRelease: () => {
      // kein zusätzlicher Abschluss nötig
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => {},
  });

  if (!isVisible) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.overlayContainer]}>
      {/* Track */}
      <View
        pointerEvents="none"
        style={[
          styles.track,
          {
            width: trackWidth,
            backgroundColor: trackColor,
            borderRadius: trackWidth / 2,
          },
        ]}
      />
      {/* Thumb */}
      <View
        // Nur der Thumb nimmt Pointer-Events; Track bleibt "none"
        pointerEvents="auto"
        {...panResponder.panHandlers}
        style={[
          styles.thumb,
          {
            width: trackWidth,
            height: thumbHeight,
            top: thumbTop,
            borderRadius: trackWidth / 2,
            backgroundColor: thumbColor,
            // Optional leichter Schatten/Glow auf mobilen Plattformen
            shadowColor: Platform.OS === 'web' ? 'transparent' : '#000',
            shadowOpacity: Platform.OS === 'web' ? 0 : 0.25,
            shadowRadius: Platform.OS === 'web' ? 0 : 2,
            elevation: Platform.OS === 'web' ? 0 : 3,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 20, // Begrenzte Breite, damit Swipes im Chat nicht blockiert werden
    zIndex: 100, // über dem Listen-Content
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  track: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
  },
  thumb: {
    position: 'absolute',
    right: 0,
  },
});