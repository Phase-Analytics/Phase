'use client';

import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { useTheme } from 'next-themes';
import { useEffect, useId, useMemo, useState } from 'react';

type SparklesProps = {
  className?: string;
  size?: number;
  minSize?: number | null;
  density?: number;
  speed?: number;
  minSpeed?: number | null;
  opacity?: number;
  direction?: string;
  opacitySpeed?: number;
  minOpacity?: number | null;
  color?: string;
  mousemove?: boolean;
  hover?: boolean;
  background?: string;
};

export function Sparkles({
  className,
  size = 1.2,
  minSize = null,
  density = 800,
  speed = 1.5,
  minSpeed = null,
  opacity = 1,
  direction = '',
  opacitySpeed = 3,
  minOpacity = null,
  color,
  mousemove = false,
  hover = false,
  background = 'transparent',
}: SparklesProps) {
  const [isReady, setIsReady] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setIsReady(true);
    });
  }, []);

  const id = useId();

  const defaultOptions = useMemo(
    () => ({
      background: {
        color: {
          value: background,
        },
      },
      fullScreen: {
        enable: false,
        zIndex: 1,
      },
      fpsLimit: 300,

      interactivity: {
        events: {
          onClick: {
            enable: true,
            mode: 'push',
          },
          onHover: {
            enable: hover,
            mode: 'grab',
            parallax: {
              enable: mousemove,
              force: 60,
              smooth: 10,
            },
          },
          resize: {
            enable: true,
          },
        },
        modes: {
          push: {
            quantity: 4,
          },
          repulse: {
            distance: 200,
            duration: 0.4,
          },
        },
      },
      particles: {
        color: {
          value: color || (theme === 'dark' ? '#ffffff' : '#000000'),
        },
        move: {
          enable: true,
          direction: direction || 'none',
          speed: {
            min: minSpeed || speed / 130,
            max: speed,
          },
          straight: true,
        },
        collisions: {
          absorb: {
            speed: 2,
          },
          bounce: {
            horizontal: {
              value: 1,
            },
            vertical: {
              value: 1,
            },
          },
          enable: false,
          maxSpeed: 50,
          mode: 'bounce' as const,
          overlap: {
            enable: true,
            retries: 0,
          },
        },
        number: {
          value: density,
        },
        opacity: {
          value: {
            min: minOpacity || opacity / 10,
            max: opacity,
          },
          animation: {
            enable: true,
            sync: false,
            speed: opacitySpeed,
          },
        },
        size: {
          value: {
            min: minSize || size / 1.5,
            max: size,
          },
        },
      },
      detectRetina: true,
    }),
    [
      background,
      hover,
      mousemove,
      color,
      theme,
      direction,
      minSpeed,
      speed,
      density,
      minOpacity,
      opacity,
      opacitySpeed,
      minSize,
      size,
    ]
  );
  return (
    isReady && (
      <Particles
        className={className}
        id={id}
        // @ts-expect-error - tsparticles types are not fully compatible
        options={defaultOptions}
      />
    )
  );
}
