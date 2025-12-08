'use client';
import createGlobe from 'cobe';
import type React from 'react';
import type { ComponentProps } from 'react';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

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
  dark = 1,
  scale = 1.1,
  diffuse = 1.2,
  mapSamples = 16_000,
  mapBrightness = 1.8,
  baseColor = [0.4, 0.6509, 1],
  markerColor = [1, 0, 0],
  glowColor = [0.2745, 0.5765, 0.898],
  markers = [],
  markerSize = 0.05,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markersRef = useRef<Marker[]>(markers);

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
      dark,
      scale,
      diffuse,
      mapSamples,
      mapBrightness,
      baseColor,
      markerColor,
      glowColor,
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
      }
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, [
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
