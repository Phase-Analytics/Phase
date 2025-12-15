'use client';
import createGlobe from 'cobe';
import { useTheme } from 'next-themes';
import type React from 'react';
import type { ComponentProps } from 'react';
import { useEffect, useRef } from 'react';
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
  markers = [],
  markerSize = 0.05,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markersRef = useRef<Marker[]>(markers);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    let width = 0;
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();
    let phi = 0;

    if (!canvasRef.current) {
      return;
    }

    const isDark = resolvedTheme === 'dark';
    const themeBaseColor: [number, number, number] =
      baseColor ?? (isDark ? hexToRgb('#ffffff') : hexToRgb('#ffffff'));
    const themeGlowColor: [number, number, number] =
      glowColor ?? (isDark ? hexToRgb('#ffffff') : hexToRgb('#e6f2ff'));

    const themeMarkerColor: [number, number, number] =
      markerColor ?? (isDark ? hexToRgb('#5cd688') : hexToRgb('#3eb96e'));
    const themeMapBrightness = mapBrightness ?? (isDark ? 1.8 : 1.8);
    const themeDark = dark ?? (isDark ? 1.1 : 0.1);

    const processedMarkers: MarkerWithColor[] = markersRef.current.map(
      (marker: Marker) => ({
        location: marker.location,
        size: marker.size ?? markerSize,
        color: marker.color,
      })
    );

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
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
      markers: processedMarkers,
      onRender: (state: Record<string, unknown>) => {
        const currentProcessedMarkers: MarkerWithColor[] =
          markersRef.current.map((marker: Marker) => ({
            location: marker.location,
            size: marker.size ?? markerSize,
            color: marker.color,
          }));
        state.markers = currentProcessedMarkers;

        state.phi = phi;
        phi += 0.003;

        state.width = width * 2;
        state.height = width * 2;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = '1';
        canvasRef.current.style.filter = isDark
          ? 'brightness(1.1)'
          : 'brightness(0.95)';
      }
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [
    resolvedTheme,
    theta,
    dark,
    scale,
    diffuse,
    mapSamples,
    mapBrightness,
    baseColor,
    markerColor,
    glowColor,
    markerSize,
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
