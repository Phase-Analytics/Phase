'use client';

import createGlobe from 'cobe';
import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

const OKLCH_REGEX = /oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/;

export type GlobeMarker = {
  location: [number, number];
  size?: number;
};

type MarkerWithColor = {
  location: [number, number];
  size: number;
  color?: [number, number, number];
};

type GlobeProps = {
  markers?: GlobeMarker[];
  autoRotate?: boolean;
  rotationSpeed?: number;
  className?: string;
};

export function Globe({
  markers = [],
  autoRotate = true,
  rotationSpeed = 0.005,
  className,
}: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let phi = 0;
    let width = 0;
    const onResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.offsetWidth;
      }
    };
    window.addEventListener('resize', onResize);
    onResize();

    if (!canvasRef.current) {
      return;
    }

    const getMarkerColor = (): [number, number, number] => {
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-chart-2')
        .trim();

      const oklchMatch = color.match(OKLCH_REGEX);
      if (oklchMatch) {
        const l = Number.parseFloat(oklchMatch[1]);
        return [l, l, l];
      }

      return resolvedTheme === 'dark'
        ? [0.985, 0.985, 0.985]
        : [0.145, 0.145, 0.145];
    };

    const markerColor = getMarkerColor();

    const processedMarkers: MarkerWithColor[] = markers.map((marker) => ({
      location: marker.location,
      size: marker.size ?? 0.07,
      color: markerColor,
    }));

    const isDark = resolvedTheme === 'dark';
    const baseColor: [number, number, number] = isDark
      ? [0.2, 0.2, 0.2]
      : [0.8, 0.8, 0.8];
    const glowColor: [number, number, number] = isDark
      ? [0.1, 0.1, 0.15]
      : [0.9, 0.9, 1];

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: isDark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 16_000,
      mapBrightness: isDark ? 4 : 6,
      baseColor,
      markerColor,
      glowColor,
      markers: processedMarkers,
      onRender: (state) => {
        if (autoRotate) {
          state.phi = phi;
          phi += rotationSpeed;
          phiRef.current = phi;
        }

        state.width = width * 2;
        state.height = width * 2;
      },
    });

    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.style.opacity = '1';
      }
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [resolvedTheme, markers, autoRotate, rotationSpeed]);

  return (
    <div className={className ?? 'relative aspect-square w-full max-w-[600px]'}>
      <canvas
        className="h-full w-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      <style jsx>{`
        canvas {
          filter: ${resolvedTheme === 'dark' ? 'brightness(1.1)' : 'brightness(0.95)'};
        }
      `}</style>
    </div>
  );
}
