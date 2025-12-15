'use client';

import { faker } from '@faker-js/faker';
import Avatar from 'boring-avatars';
import { useEffect, useState } from 'react';

type AvatarVariant =
  | 'marble'
  | 'beam'
  | 'pixel'
  | 'sunset'
  | 'ring'
  | 'bauhaus';

export function getGeneratedName(seed: string): string {
  if (!seed) {
    return 'Anonymous';
  }
  const numericSeed = seed
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  faker.seed(numericSeed);

  const adjective = faker.word.adjective();
  const firstName = faker.person.firstName();

  const capitalize = (str: string) =>
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

  return `${capitalize(adjective)} ${firstName}`;
}

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
