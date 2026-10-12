'use client';

import Avatar from 'boring-avatars';
import { useEffect, useState } from 'react';

type AvatarVariant =
  | 'marble'
  | 'beam'
  | 'pixel'
  | 'sunset'
  | 'ring'
  | 'bauhaus';

type UserAvatarProps = {
  seed: string;
  size?: number;
  variant?: AvatarVariant;
  colors?: string[];
};

export function UserAvatar({
  seed,
  size = 32,
  variant = 'marble',
  colors,
}: UserAvatarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
        }}
      />
    );
  }

  return (
    <Avatar
      colors={colors}
      name={seed || 'anonymous'}
      size={size}
      variant={variant}
    />
  );
}
