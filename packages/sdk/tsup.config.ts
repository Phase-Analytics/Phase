import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'expo/index': 'src/expo/index.tsx',
    'react-native/index': 'src/react-native/index.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  minify: true,
  splitting: true,
  treeshake: true,
  target: 'es2020',
  external: [
    'react',
    'react-native',
    '@react-native-async-storage/async-storage',
    '@react-native-community/netinfo',
    '@react-navigation/native',
    'expo-application',
    'expo-constants',
    'expo-localization',
    'expo-router',
  ],
});
