'use client';

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import React, { type ReactNode, useEffect, useRef, useState } from 'react';

function DefaultMapBackground() {
  const [randomValues] = useState(() => {
    const horizontalRoads = [30 + Math.random() * 10, 60 + Math.random() * 10];
    const verticalRoads = [25 + Math.random() * 10, 65 + Math.random() * 10];

    const secondaryHorizontal = Array.from({ length: 3 }, () =>
      Math.floor(15 + Math.random() * 70)
    );
    const secondaryVertical = Array.from({ length: 4 }, () =>
      Math.floor(10 + Math.random() * 80)
    );

    const isTooCloseToCenter = (
      top: number,
      left: number,
      height: number,
      width: number
    ) => {
      const _centerTop = 50;
      const _centerLeft = 50;
      const buildingCenterTop = top + height / 2;
      const buildingCenterLeft = left + width / 2;

      return (
        buildingCenterTop > 35 &&
        buildingCenterTop < 65 &&
        buildingCenterLeft > 35 &&
        buildingCenterLeft < 65
      );
    };

    const isOverlapping = (
      b1: { top: number; left: number; height: number; width: number },
      b2: { top: number; left: number; height: number; width: number }
    ) => {
      const minDistance = 5;

      const b1Right = b1.left + b1.width;
      const b1Bottom = b1.top + b1.height;
      const b2Right = b2.left + b2.width;
      const b2Bottom = b2.top + b2.height;

      return !(
        b1Right + minDistance < b2.left ||
        b2Right + minDistance < b1.left ||
        b1Bottom + minDistance < b2.top ||
        b2Bottom + minDistance < b1.top
      );
    };

    const buildings: Array<{
      top: number;
      left: number;
      height: number;
      width: number;
      delay: number;
    }> = [];

    let attempts = 0;
    const maxAttempts = 100;

    while (buildings.length < 6 && attempts < maxAttempts) {
      const building = {
        top: Math.floor(5 + Math.random() * 70),
        left: Math.floor(5 + Math.random() * 80),
        height: Math.floor(10 + Math.random() * 15),
        width: Math.floor(8 + Math.random() * 12),
        delay: 0.5 + Math.random() * 0.3,
      };

      const tooCloseToCenter = isTooCloseToCenter(
        building.top,
        building.left,
        building.height,
        building.width
      );
      const overlapsExisting = buildings.some((existing) =>
        isOverlapping(existing, building)
      );

      if (!(tooCloseToCenter || overlapsExisting)) {
        buildings.push(building);
      }

      attempts++;
    }

    return {
      horizontalRoads,
      verticalRoads,
      secondaryHorizontal,
      secondaryVertical,
      buildings,
    };
  });

  return (
    <>
      <div className="absolute inset-0 bg-muted" />
      <svg
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <title>Map visualization</title>
        {randomValues.horizontalRoads.map((y, i) => (
          <motion.line
            animate={{ pathLength: 1 }}
            className="stroke-foreground/25"
            initial={{ pathLength: 0 }}
            key={`main-h-${i}-${y.toFixed(2)}`}
            strokeWidth="4"
            transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
            x1="0%"
            x2="100%"
            y1={`${y}%`}
            y2={`${y}%`}
          />
        ))}
        {randomValues.verticalRoads.map((x, i) => (
          <motion.line
            animate={{ pathLength: 1 }}
            className="stroke-foreground/20"
            initial={{ pathLength: 0 }}
            key={`main-v-${i}-${x.toFixed(2)}`}
            strokeWidth="3"
            transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
            x1={`${x}%`}
            x2={`${x}%`}
            y1="0%"
            y2="100%"
          />
        ))}
        {randomValues.secondaryHorizontal.map((y, i) => (
          <motion.line
            animate={{ pathLength: 1 }}
            className="stroke-foreground/10"
            initial={{ pathLength: 0 }}
            key={`sec-h-${i}-${y}`}
            strokeWidth="1.5"
            transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
            x1="0%"
            x2="100%"
            y1={`${y}%`}
            y2={`${y}%`}
          />
        ))}
        {randomValues.secondaryVertical.map((x, i) => (
          <motion.line
            animate={{ pathLength: 1 }}
            className="stroke-foreground/10"
            initial={{ pathLength: 0 }}
            key={`sec-v-${i}-${x}`}
            strokeWidth="1.5"
            transition={{ duration: 0.5, delay: 0.7 + i * 0.1 }}
            x1={`${x}%`}
            x2={`${x}%`}
            y1="0%"
            y2="100%"
          />
        ))}
      </svg>
      {randomValues.buildings.map((building) => (
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="absolute rounded-sm border border-muted-foreground/20 bg-muted-foreground/30"
          initial={{ opacity: 0, scale: 0.8 }}
          key={`building-${building.top}-${building.left}`}
          style={{
            top: `${building.top}%`,
            left: `${building.left}%`,
            height: `${building.height}%`,
            width: `${building.width}%`,
          }}
          transition={{ duration: 0.4, delay: building.delay }}
        />
      ))}
    </>
  );
}

type ExpandCardProps = {
  triggerIcon?: ReactNode;
  triggerText?: string;
  triggerSubtext?: string;
  statusBadge?: {
    text: string;
    color?: string;
  };

  expandedIcon?: ReactNode;
  expandedContent?: ReactNode;
  expandedBackground?: ReactNode;

  collapsedWidth?: number;
  collapsedHeight?: number;
  expandedWidth?: number;
  expandedHeight?: number;

  className?: string;
  iconGlowColor?: string;

  isExpanded?: boolean;
  onToggle?: () => void;
};

type LocationMapProps = {
  location?: string;
  statusText?: string;
  coordinates?: string;
  className?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
};

export function ExpandCard({
  triggerIcon,
  triggerText = 'Click to expand',
  triggerSubtext,
  statusBadge,
  expandedIcon,
  expandedContent,
  expandedBackground,
  collapsedWidth = 240,
  collapsedHeight = 140,
  expandedWidth = 360,
  expandedHeight = 280,
  className,
  iconGlowColor = 'rgba(52, 211, 153, 0.6)',
  isExpanded: controlledIsExpanded,
  onToggle,
}: ExpandCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [internalIsExpanded, setInternalIsExpanded] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  const isExpanded =
    controlledIsExpanded !== undefined
      ? controlledIsExpanded
      : internalIsExpanded;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useTransform(mouseY, [-50, 50], [8, -8]);
  const rotateY = useTransform(mouseX, [-50, 50], [-8, 8]);

  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  useEffect(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX.set, mouseY.set]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || isTouchDevice) {
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  const handleClick = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsExpanded(!internalIsExpanded);
    }
  };

  return (
    <motion.div
      className={`relative cursor-pointer select-none ${className}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      ref={containerRef}
      style={{
        perspective: 1000,
      }}
    >
      <motion.div
        animate={{
          width: isExpanded ? expandedWidth : collapsedWidth,
          height: isExpanded ? expandedHeight : collapsedHeight,
        }}
        className="relative overflow-hidden rounded-md border border-border bg-background"
        initial={{
          width: collapsedWidth,
          height: collapsedHeight,
        }}
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
        }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 35,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-muted/40" />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              animate={{ opacity: 1 }}
              className="pointer-events-none absolute inset-0"
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {expandedBackground || <DefaultMapBackground />}

              {expandedIcon && (
                <motion.div
                  animate={{ scale: 1, y: 0 }}
                  className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2"
                  initial={{ scale: 0, y: -20 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    delay: 0.3,
                  }}
                >
                  {expandedIcon}
                </motion.div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={{ opacity: isExpanded ? 0 : 0.03 }}
          className="absolute inset-0 opacity-[0.03]"
          transition={{ duration: 0.3 }}
        >
          <svg className="absolute inset-0" height="100%" width="100%">
            <title>Grid pattern</title>
            <defs>
              <pattern
                height="20"
                id="grid"
                patternUnits="userSpaceOnUse"
                width="20"
              >
                <path
                  className="stroke-foreground"
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect fill="url(#grid)" height="100%" width="100%" />
          </svg>
        </motion.div>

        <div className="relative z-10 flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            {triggerIcon && (
              <div className="relative">
                <motion.div
                  animate={{
                    opacity: isExpanded ? 0 : 1,
                  }}
                  className="relative"
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    animate={{
                      filter: isHovered
                        ? `drop-shadow(0 0 8px ${iconGlowColor})`
                        : `drop-shadow(0 0 4px ${iconGlowColor.replace('0.6', '0.3')})`,
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {triggerIcon}
                  </motion.div>
                </motion.div>
              </div>
            )}

            {statusBadge && (
              <motion.div
                animate={{
                  scale: isHovered ? 1.05 : 1,
                  backgroundColor: isHovered
                    ? 'hsl(var(--foreground) / 0.08)'
                    : 'hsl(var(--foreground) / 0.05)',
                }}
                className="flex items-center gap-1.5 rounded-full bg-foreground/5 px-2 py-1 backdrop-blur-sm"
                transition={{ duration: 0.2 }}
              >
                <div
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: statusBadge.color || '#34D399' }}
                />
                <span className="font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  {statusBadge.text}
                </span>
              </motion.div>
            )}
          </div>

          <div className="space-y-1">
            <motion.h3
              animate={{
                x: isHovered ? 4 : 0,
              }}
              className="font-medium text-foreground text-sm tracking-tight"
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {triggerText}
            </motion.h3>

            <AnimatePresence>
              {isExpanded && triggerSubtext && (
                <motion.p
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  className="font-mono text-muted-foreground text-xs"
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {triggerSubtext}
                </motion.p>
              )}
              {isExpanded && expandedContent && (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  initial={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                >
                  {expandedContent}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              animate={{
                scaleX: isHovered || isExpanded ? 1 : 0.3,
              }}
              className="h-px bg-gradient-to-r from-orange-500/50 via-orange-400/30 to-transparent"
              initial={{ scaleX: 0, originX: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>

      <motion.p
        animate={{
          opacity: isHovered && !isExpanded ? 1 : 0,
          y: isHovered ? 0 : 4,
        }}
        className="-bottom-6 absolute left-1/2 whitespace-nowrap text-[10px] text-muted-foreground"
        initial={{ opacity: 0 }}
        style={{ x: '-50%' }}
        transition={{ duration: 0.2 }}
      >
        Click to expand
      </motion.p>
    </motion.div>
  );
}

export function LocationMap({
  location = 'San Francisco, CA',
  statusText = 'Live',
  coordinates = '37.7749° N, 122.4194° W',
  className,
  isExpanded,
  onToggle,
}: LocationMapProps) {
  return (
    <ExpandCard
      className={className}
      expandedIcon={
        <svg
          className="drop-shadow-lg"
          fill="none"
          height="32"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.5))',
          }}
          viewBox="0 0 24 24"
          width="32"
        >
          <title>Location pin</title>
          <path
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
            fill="#34D399"
          />
          <circle className="fill-background" cx="12" cy="9" r="2.5" />
        </svg>
      }
      iconGlowColor="rgba(52, 211, 153, 0.6)"
      isExpanded={isExpanded}
      onToggle={onToggle}
      statusBadge={{
        text: statusText,
        color: '#34D399',
      }}
      triggerIcon={
        <svg
          className="text-emerald-400"
          fill="none"
          height="18"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="18"
        >
          <title>Map icon</title>
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
          <line x1="9" x2="9" y1="3" y2="18" />
          <line x1="15" x2="15" y1="6" y2="21" />
        </svg>
      }
      triggerSubtext={coordinates}
      triggerText={location}
    />
  );
}
