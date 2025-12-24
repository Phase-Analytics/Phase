import Image from 'next/image';
import { InfiniteSlider } from '@/components/ui/infinite-slider';
import { cn } from '@/lib/utils';

type Logo = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
};

type LogoCloudProps = React.ComponentProps<'div'> & {
  logos: Logo[];
};

export function LogoCloud({ className, logos, ...props }: LogoCloudProps) {
  return (
    <div
      {...props}
      className={cn(
        'mask-[linear-gradient(to_right,transparent,black,transparent)] overflow-hidden py-4',
        className
      )}
    >
      <InfiniteSlider duration={80} durationOnHover={25} gap={42}>
        {logos.map((logo) => (
          <Image
            alt={logo.alt}
            className={cn(
              'pointer-events-none h-4 select-none md:h-5',
              logo.className
            )}
            height={logo.height || 16}
            key={`logo-${logo.alt}`}
            loading="lazy"
            src={logo.src}
            width={logo.width || 16}
          />
        ))}
      </InfiniteSlider>
    </div>
  );
}
