'use client';

import { Folder, HeartHandshakeIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type AnimatedFlowProps = {
  className?: string;
  methods?: [string, string, string, string];
  topBadge?: {
    icon?: React.ReactNode;
    text: string;
  };
  innerBadges?: Array<{ icon: React.ReactNode; text: string }>;
  centerCircle?: string | React.ReactNode;
  lightColor?: string;
};

const AnimatedFlow = ({
  className,
  methods = ['GET', 'POST', 'PUT', 'DELETE'],
  topBadge = {
    icon: <DatabaseIcon x="0" y="0" />,
    text: 'Data exchange using a customized REST API',
  },
  innerBadges = [
    { icon: <HeartHandshakeIcon className="size-4" />, text: 'LegionDev' },
    { icon: <Folder className="size-4" />, text: 'v2_updates' },
  ],
  centerCircle = 'SVG',
  lightColor,
}: AnimatedFlowProps) => (
  <div
    className={cn(
      'relative flex h-[300px] w-full max-w-4xl select-none flex-col items-center sm:h-[350px] lg:h-[400px]',
      className
    )}
  >
    <svg
      aria-label="Database with REST API"
      className="h-full text-muted sm:w-full"
      height="100%"
      role="img"
      viewBox="0 0 200 100"
      width="100%"
    >
      <g
        fill="none"
        pathLength="100"
        stroke="currentColor"
        strokeDasharray="100 100"
        strokeWidth="0.4"
      >
        <path d="M 35 10 v 15 q 0 5 5 5 h 55 q 5 0 5 5 v 10" />
        <path d="M 81 10 v 10 q 0 5 5 5 h 9 q 5 0 5 5 v 10" />
        <path d="M 127 10 v 10 q 0 5 -5 5 h -18 q -5 0 -5 5 v 10" />
        <path d="M 173 10 v 15 q 0 5 -5 5 h -63 q -5 0 -5 5 v 10" />
        <animate
          attributeName="stroke-dashoffset"
          calcMode="spline"
          dur="2s"
          from="100"
          keySplines="0.25,0.1,0.5,1"
          keyTimes="0; 1"
          repeatCount="indefinite"
          to="0"
        />
      </g>
      <g mask="url(#db-mask-1)">
        <circle
          className="database db-light-1"
          cx="0"
          cy="0"
          fill="url(#db-blue-grad)"
          r="12"
        >
          <animateMotion
            dur="3s"
            path="M 35 10 v 15 q 0 5 5 5 h 55 q 5 0 5 5 v 10"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <g mask="url(#db-mask-2)">
        <circle
          className="database db-light-2"
          cx="0"
          cy="0"
          fill="url(#db-blue-grad)"
          r="12"
        >
          <animateMotion
            begin="0.3s"
            dur="2.5s"
            path="M 81 10 v 10 q 0 5 5 5 h 9 q 5 0 5 5 v 10"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <g mask="url(#db-mask-3)">
        <circle
          className="database db-light-3"
          cx="0"
          cy="0"
          fill="url(#db-blue-grad)"
          r="12"
        >
          <animateMotion
            begin="0.6s"
            dur="2.5s"
            path="M 127 10 v 10 q 0 5 -5 5 h -18 q -5 0 -5 5 v 10"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <g mask="url(#db-mask-4)">
        <circle
          className="database db-light-4"
          cx="0"
          cy="0"
          fill="url(#db-blue-grad)"
          r="12"
        >
          <animateMotion
            begin="0.9s"
            dur="3s"
            path="M 173 10 v 15 q 0 5 -5 5 h -63 q -5 0 -5 5 v 10"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <g fill="none" stroke="currentColor" strokeWidth="0.4">
        <g>
          <rect fill="#18181B" height="13" rx="5" width="46" x="12" y="4" />
          <UserGroupIcon x="16" y="8" />
          <text
            dominantBaseline="central"
            fill="#a1a1aa"
            fontSize="6"
            fontWeight="500"
            stroke="none"
            textAnchor="middle"
            x="38"
            y="10.5"
          >
            {methods[0]}
          </text>
        </g>
        <g>
          <rect fill="#18181B" height="13" rx="5" width="46" x="58" y="4" />
          <PlaySquareIcon x="62" y="8" />
          <text
            dominantBaseline="central"
            fill="#a1a1aa"
            fontSize="6"
            fontWeight="500"
            stroke="none"
            textAnchor="middle"
            x="84"
            y="10.5"
          >
            {methods[1]}
          </text>
        </g>
        <g>
          <rect fill="#18181B" height="13" rx="5" width="46" x="104" y="4" />
          <CursorPointerIcon x="108" y="8" />
          <text
            dominantBaseline="central"
            fill="#a1a1aa"
            fontSize="6"
            fontWeight="500"
            stroke="none"
            textAnchor="middle"
            x="130"
            y="10.5"
          >
            {methods[2]}
          </text>
        </g>
        <g>
          <rect fill="#18181B" height="13" rx="5" width="46" x="150" y="4" />
          <ScreenIcon x="154" y="8" />
          <text
            dominantBaseline="central"
            fill="#a1a1aa"
            fontSize="6"
            fontWeight="500"
            stroke="none"
            textAnchor="middle"
            x="176"
            y="10.5"
          >
            {methods[3]}
          </text>
        </g>
      </g>
      <defs>
        <mask id="db-mask-1">
          <path
            d="M 35 10 v 15 q 0 5 5 5 h 55 q 5 0 5 5 v 10"
            stroke="white"
            strokeWidth="0.5"
          />
        </mask>
        <mask id="db-mask-2">
          <path
            d="M 81 10 v 10 q 0 5 5 5 h 9 q 5 0 5 5 v 10"
            stroke="white"
            strokeWidth="0.5"
          />
        </mask>
        <mask id="db-mask-3">
          <path
            d="M 127 10 v 10 q 0 5 -5 5 h -18 q -5 0 -5 5 v 10"
            stroke="white"
            strokeWidth="0.5"
          />
        </mask>
        <mask id="db-mask-4">
          <path
            d="M 173 10 v 15 q 0 5 -5 5 h -63 q -5 0 -5 5 v 10"
            stroke="white"
            strokeWidth="0.5"
          />
        </mask>
        <radialGradient fx="1" id="db-blue-grad">
          <stop offset="0%" stopColor={lightColor || '#f97316'} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
    <div className="absolute bottom-10 flex w-full flex-col items-center">
      <div className="-bottom-4 absolute h-[100px] w-[62%] rounded-lg bg-accent/30" />
      <div className="-top-3 sm:-top-4 absolute z-20 flex items-center justify-center rounded-lg border bg-[#101112] px-2 py-1 sm:py-1.5">
        {topBadge.icon}
        <span className="ml-2 text-muted-foreground text-xs sm:text-sm">
          {topBadge.text}
        </span>
      </div>
      <div className="-bottom-8 absolute z-30 grid h-[60px] w-[60px] place-items-center rounded-full border-t bg-[#141516] font-semibold text-xs">
        {typeof centerCircle === 'string' ? (
          centerCircle
        ) : (
          <div className="flex items-center justify-center">{centerCircle}</div>
        )}
      </div>
      <div className="relative z-10 flex h-[140px] w-[95%] items-center justify-center overflow-hidden rounded-lg border bg-background shadow-md sm:h-[150px] sm:w-full lg:h-[170px]">
        {innerBadges[0] && (
          <div className="absolute bottom-8 left-12 z-10 flex h-7 items-center gap-2 rounded-full border bg-[#101112] px-3 text-xs sm:text-sm">
            {innerBadges[0].icon}
            <span className="text-muted-foreground">{innerBadges[0].text}</span>
          </div>
        )}
        {innerBadges[1] && (
          <div className="absolute right-16 z-10 hidden h-7 items-center gap-2 rounded-full border bg-[#101112] px-3 text-xs sm:flex sm:text-sm">
            {innerBadges[1].icon}
            <span className="text-muted-foreground">{innerBadges[1].text}</span>
          </div>
        )}
        <motion.div
          animate={{
            scale: [0.98, 1.02, 0.98, 1, 1, 1, 1, 1, 1],
          }}
          className="-bottom-14 absolute h-[100px] w-[100px] rounded-full border-t bg-accent/5"
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          animate={{
            scale: [1, 1, 1, 0.98, 1.02, 0.98, 1, 1, 1],
          }}
          className="-bottom-20 absolute h-[145px] w-[145px] rounded-full border-t bg-accent/5"
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          animate={{
            scale: [1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1, 1],
          }}
          className="-bottom-[100px] absolute h-[190px] w-[190px] rounded-full border-t bg-accent/5"
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        />
        <motion.div
          animate={{
            scale: [1, 1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1],
          }}
          className="-bottom-[120px] absolute h-[235px] w-[235px] rounded-full border-t bg-accent/5"
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
        />
      </div>
    </div>
  </div>
);

export default AnimatedFlow;

const DatabaseIcon = ({ x = '0', y = '0' }: { x: string; y: string }) => (
  <svg
    aria-label="Database icon"
    fill="none"
    height="5"
    role="img"
    stroke="white"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
    width="5"
    x={x}
    xmlns="http://www.w3.org/2000/svg"
    y={y}
  >
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

const UserGroupIcon = ({ x = '0', y = '0' }: { x: string; y: string }) => (
  <svg
    aria-label="User group icon"
    fill="none"
    height="5"
    role="img"
    stroke="white"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="5"
    x={x}
    xmlns="http://www.w3.org/2000/svg"
    y={y}
  >
    <path d="M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" />
    <path d="M15 11C17.2091 11 19 9.20914 19 7C19 4.79086 17.2091 3 15 3" />
    <path d="M11 14H7C4.23858 14 2 16.2386 2 19C2 20.1046 2.89543 21 4 21H14C15.1046 21 16 20.1046 16 19C16 16.2386 13.7614 14 11 14Z" />
    <path d="M17 14C19.7614 14 22 16.2386 22 19C22 20.1046 21.1046 21 20 21H18.5" />
  </svg>
);

const PlaySquareIcon = ({ x = '0', y = '0' }: { x: string; y: string }) => (
  <svg
    aria-label="Play square icon"
    fill="none"
    height="5"
    role="img"
    stroke="white"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="5"
    x={x}
    xmlns="http://www.w3.org/2000/svg"
    y={y}
  >
    <path d="M14.9531 12.3948C14.8016 13.0215 14.0857 13.4644 12.6539 14.3502C11.2697 15.2064 10.5777 15.6346 10.0199 15.4625C9.78934 15.3913 9.57925 15.2562 9.40982 15.07C9 14.6198 9 13.7465 9 12C9 10.2535 9 9.38018 9.40982 8.92995C9.57925 8.74381 9.78934 8.60868 10.0199 8.53753C10.5777 8.36544 11.2697 8.79357 12.6539 9.64983C14.0857 10.5356 14.8016 10.9785 14.9531 11.6052C15.0156 11.8639 15.0156 12.1361 14.9531 12.3948Z" />
    <path d="M2.5 12C2.5 7.52166 2.5 5.28249 3.89124 3.89124C5.28249 2.5 7.52166 2.5 12 2.5C16.4783 2.5 18.7175 2.5 20.1088 3.89124C21.5 5.28249 21.5 7.52166 21.5 12C21.5 16.4783 21.5 18.7175 20.1088 20.1088C18.7175 21.5 16.4783 21.5 12 21.5C7.52166 21.5 5.28249 21.5 3.89124 20.1088C2.5 18.7175 2.5 16.4783 2.5 12Z" />
  </svg>
);

const CursorPointerIcon = ({ x = '0', y = '0' }: { x: string; y: string }) => (
  <svg
    aria-label="Cursor pointer icon"
    fill="none"
    height="5"
    role="img"
    stroke="white"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="5"
    x={x}
    xmlns="http://www.w3.org/2000/svg"
    y={y}
  >
    <path d="M14.5352 11.0865L18.5575 12.6605C20.8775 13.5683 22.0375 14.0222 21.9991 14.7422C21.9606 15.4622 20.75 15.7924 18.3288 16.4527C17.6079 16.6493 17.2475 16.7476 16.9976 16.9976C16.7476 17.2475 16.6493 17.6079 16.4527 18.3288C15.7924 20.75 15.4622 21.9606 14.7422 21.9991C14.0222 22.0375 13.5683 20.8775 12.6605 18.5575L11.0865 14.5352C10.136 12.1062 9.6608 10.8918 10.2763 10.2763C10.8918 9.6608 12.1062 10.136 14.5352 11.0865Z" />
    <path d="M10.8576 7.08329C11.0714 7.43808 11.5323 7.55239 11.8871 7.33861C12.2419 7.12483 12.3562 6.66392 12.1424 6.30913L10.8576 7.08329ZM6.30914 12.1424C6.66392 12.3562 7.12483 12.2419 7.33861 11.8871C7.55239 11.5323 7.43808 11.0714 7.08329 10.8576L6.30914 12.1424ZM5.75 8.5C5.75 6.98122 6.98123 5.75 8.5 5.75V4.25C6.15281 4.25 4.25 6.15279 4.25 8.5H5.75ZM8.5 5.75C9.49944 5.75 10.3752 6.28272 10.8576 7.08329L12.1424 6.30913C11.3999 5.07687 10.0469 4.25 8.5 4.25V5.75ZM7.08329 10.8576C6.28272 10.3752 5.75 9.49945 5.75 8.5H4.25C4.25 10.0469 5.07688 11.3999 6.30914 12.1424L7.08329 10.8576Z" />
    <path d="M14.2515 8.13498C14.2778 8.54836 14.6342 8.86216 15.0476 8.83587C15.461 8.80958 15.7748 8.45316 15.7485 8.03979L14.2515 8.13498ZM8.04118 15.7485C8.45457 15.7747 8.81093 15.4608 8.83714 15.0475C8.86335 14.6341 8.54948 14.2777 8.1361 14.2515L8.04118 15.7485ZM2.75 8.50661C2.75 5.32733 5.32736 2.75 8.50664 2.75V1.25C4.49895 1.25 1.25 4.49889 1.25 8.50661H2.75ZM8.50664 2.75C11.561 2.75 14.0604 5.12926 14.2515 8.13498L15.7485 8.03979C15.5074 4.24925 12.3576 1.25 8.50664 1.25V2.75ZM8.1361 14.2515C5.12986 14.0609 2.75 11.5614 2.75 8.50661H1.25C1.25 12.358 4.25002 15.5081 8.04118 15.7485L8.1361 14.2515Z" />
  </svg>
);

const ScreenIcon = ({ x = '0', y = '0' }: { x: string; y: string }) => (
  <svg
    aria-label="Screen icon"
    fill="none"
    height="5"
    role="img"
    stroke="white"
    strokeLinecap="round"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    width="5"
    x={x}
    xmlns="http://www.w3.org/2000/svg"
    y={y}
  >
    <path d="M4 21C4 19.8954 3.10457 19 2 19M8 21C8 17.6863 5.31371 15 2 15M12 21C12 15.4772 7.52285 11 2 11" />
    <path d="M3 8.00027C3.0779 6.12787 3.32904 4.97985 4.1387 4.17164C5.31244 3 7.20153 3 10.9797 3H13.9853C17.7634 3 19.6525 3 20.8263 4.17164C22 5.34327 22 7.229 22 11.0004V12.0005C22 15.7719 22 17.6577 20.8263 18.8293C19.7612 19.8924 18.1071 19.9909 14.9871 20" />
  </svg>
);
