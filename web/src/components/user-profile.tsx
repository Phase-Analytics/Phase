import { faker } from '@faker-js/faker';
import Avatar from 'boring-avatars';

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
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return `${firstName} ${lastName}`;
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
  return (
    <Avatar
      colors={colors}
      name={seed || 'anonymous'}
      size={size}
      variant={variant}
    />
  );
}
