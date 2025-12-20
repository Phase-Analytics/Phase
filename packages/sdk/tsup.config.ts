import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'expo/index': 'src/expo/index.tsx',
    'react-native/index': 'src/react-native/index.tsx',
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
    '@react-native-async-storage/async-storage',
    '@react-native-community/netinfo',
    '@react-navigation/native',
    'expo-application',
    'expo-device',
    'expo-localization',
    'expo-router',
    'expo-file-system',
  ],
});
