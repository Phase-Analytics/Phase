import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'expo/index': 'src/expo/index.tsx',
  },
  format: ['cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  splitting: false,
  treeshake: false,
  target: 'es2020',
  platform: 'node',
  external: [
    'react',
    'react-native',
    'expo-application',
    'expo-device',
    'expo-localization',
    'expo-router',
    'expo-file-system',
  ],
});
