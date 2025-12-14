import { notFound } from 'next/navigation';
import { ImageResponse } from 'next/og';
import { getPageImage, source } from '@/app/docs/docs-source';

export const revalidate = false;

const colors = {
  background: '#0a0a0a',
  foreground: '#ededed',
  muted: '#a3a3a3',
  secondary: '#3a3a3a',
};

async function loadFonts() {
  const [monoResponse, sansResponse] = await Promise.all([
    fetch(
      'https://cdn.jsdelivr.net/fontsource/fonts/jetbrains-mono@latest/latin-400-normal.ttf'
    ),
    fetch(
      'https://cdn.jsdelivr.net/fontsource/fonts/geist-sans@latest/latin-400-normal.ttf'
    ),
  ]);
  return {
    mono: await monoResponse.arrayBuffer(),
    sans: await sansResponse.arrayBuffer(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const [{ slug }, fonts] = await Promise.all([params, loadFonts()]);
  const page = source.getPage(slug.slice(0, -1));
  if (!page) {
    notFound();
  }

  const padding = 60;

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        backgroundColor: colors.background,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: padding,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: colors.secondary,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: padding,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: colors.secondary,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: padding,
          top: 0,
          bottom: 0,
          width: 1,
          backgroundColor: colors.secondary,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: padding,
          top: 0,
          bottom: 0,
          width: 1,
          backgroundColor: colors.secondary,
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          padding: padding + 40,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              width: 80,
              height: 80,
              backgroundColor: colors.foreground,
              borderRadius: 8,
            }}
          />

          <span
            style={{
              fontSize: 20,
              fontWeight: 400,
              fontFamily: 'JetBrains Mono',
              letterSpacing: '0.1em',
              color: colors.foreground,
            }}
          >
            DOCUMENTATION
          </span>

          <span
            style={{
              fontSize: 56,
              fontWeight: 600,
              fontFamily: 'JetBrains Mono',
              color: colors.foreground,
              lineHeight: 1.1,
            }}
          >
            {page.data.title}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 400,
              fontFamily: 'Geist Sans',
              color: colors.foreground,
            }}
          >
            Phase
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg
              aria-label="GitHub"
              fill={colors.muted}
              height="24"
              role="img"
              viewBox="0 0 24 24"
              width="24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span
              style={{
                fontSize: 20,
                fontWeight: 400,
                fontFamily: 'Geist Sans',
                color: colors.muted,
              }}
            >
              phase-analytics/Phase
            </span>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'JetBrains Mono',
          data: fonts.mono,
          style: 'normal',
          weight: 400,
        },
        {
          name: 'Geist Sans',
          data: fonts.sans,
          style: 'normal',
          weight: 400,
        },
      ],
    }
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    slug: getPageImage(page).segments,
  }));
}
