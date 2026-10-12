'use client';
import createGlobe from 'cobe';
import { useReducedMotion } from 'motion/react';
import { useTheme } from 'next-themes';
import type React from 'react';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

const HEX_REGEX = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;

const hexToRgb = (hex: string): [number, number, number] => {
  const result = HEX_REGEX.exec(hex);
  return result
    ? [
        Number.parseInt(result[1], 16) / 255,
        Number.parseInt(result[2], 16) / 255,
        Number.parseInt(result[3], 16) / 255,
      ]
    : [0, 0, 0];
};

type Marker = {
  location: [number, number];
  size?: number;
  color?: [number, number, number];
};

type MarkerWithColor = {
  location: [number, number];
  size: number;
  color?: [number, number, number];
};

type EarthProps = ComponentProps<'div'> & {
  className?: string;
  theta?: number;
  dark?: number;
  scale?: number;
  diffuse?: number;
  mapSamples?: number;
  mapBrightness?: number;
  baseColor?: [number, number, number];
  markerColor?: [number, number, number];
  glowColor?: [number, number, number];
  markers?: Marker[];
  markerSize?: number;
};
const EMPTY_MARKERS: Marker[] = [];
const MAX_DEVICE_PIXEL_RATIO = 2;

const Earth: React.FC<EarthProps> = ({
  className,
  theta = 0.2,
  dark,
  scale = 1.1,
  diffuse = 1.2,
  mapSamples = 16_000,
  mapBrightness,
  baseColor,
  markerColor,
  glowColor,
  markers = EMPTY_MARKERS,
  markerSize = 0.05,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion() ?? false;

  const processedMarkers = useMemo<MarkerWithColor[]>(
    () =>
      markers.map((marker) => ({
        location: marker.location,
        size: marker.size ?? markerSize,
        color: marker.color,
      })),
    [markers, markerSize]
  );
  const markersRef = useRef(processedMarkers);
  const markersDirtyRef = useRef(false);
  const redrawRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    markersRef.current = processedMarkers;
    markersDirtyRef.current = true;
    redrawRef.current?.();
  }, [processedMarkers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const pixelRatio = Math.min(
      window.devicePixelRatio || 1,
      MAX_DEVICE_PIXEL_RATIO
    );
    let width = canvas.offsetWidth;
    let phi = 0;
    let inView = true;

    const isDark = resolvedTheme === 'dark';
    const themeBaseColor: [number, number, number] =
      baseColor ?? hexToRgb('#ffffff');
    const themeGlowColor: [number, number, number] =
      glowColor ?? (isDark ? hexToRgb('#ffffff') : hexToRgb('#e6f2ff'));
    const themeMarkerColor: [number, number, number] =
      markerColor ?? (isDark ? hexToRgb('#5cd688') : hexToRgb('#3eb96e'));
    const themeMapBrightness = mapBrightness ?? 1.8;
    const themeDark = dark ?? (isDark ? 1.1 : 0.1);

    markersDirtyRef.current = false;
    const globe = createGlobe(canvas, {
      devicePixelRatio: pixelRatio,
      width: width * pixelRatio,
      height: width * pixelRatio,
      phi: 0,
      theta,
      dark: themeDark,
      scale,
      diffuse,
      mapSamples,
      mapBrightness: themeMapBrightness,
      baseColor: themeBaseColor,
      markerColor: themeMarkerColor,
      glowColor: themeGlowColor,
      opacity: 1,
      offset: [0, 0],
      markers: markersRef.current,
      onRender: (state: Record<string, unknown>) => {
        // cobe re-encodes marker uniforms whenever state.markers is set.
        if (markersDirtyRef.current) {
          state.markers = markersRef.current;
          markersDirtyRef.current = false;
        }

        state.phi = phi;
        if (!reducedMotion) {
          phi += 0.003;
        }

        state.width = width * pixelRatio;
        state.height = width * pixelRatio;
      },
    });

    const isVisible = () => inView && !document.hidden;

    // cobe applies onRender state after drawing, so a still frame needs two passes.
    const renderStill = () => {
      if (!globe.shouldRender && isVisible()) {
        globe.render();
        globe.render();
      }
    };

    const syncPlayback = () => {
      globe.toggle(isVisible() && !reducedMotion);
      renderStill();
    };

    const onResize = () => {
      width = canvas.offsetWidth;
      renderStill();
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? true;
      syncPlayback();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', syncPlayback);
    window.addEventListener('resize', onResize);
    redrawRef.current = renderStill;
    syncPlayback();

    const revealTimeout = setTimeout(() => {
      canvas.style.opacity = '1';
      canvas.style.filter = isDark ? 'brightness(1.1)' : 'brightness(0.95)';
    });

    return () => {
      clearTimeout(revealTimeout);
      redrawRef.current = null;
      observer.disconnect();
      document.removeEventListener('visibilitychange', syncPlayback);
      window.removeEventListener('resize', onResize);
      globe.destroy();
    };
  }, [
    resolvedTheme,
    reducedMotion,
    theta,
    dark,
    scale,
    diffuse,
    mapSamples,
    mapBrightness,
    baseColor,
    markerColor,
    glowColor,
  ]);

  return (
    <div
      className={cn(
        'z-10 mx-auto flex w-full max-w-[350px] items-center justify-center',
        className
      )}
    >
      <canvas
        className="contain-[layout_paint_size] h-full w-full opacity-0 transition-opacity duration-500"
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          aspectRatio: '1',
        }}
      />
    </div>
  );
};

export default Earth;
