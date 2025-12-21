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
    'expo-application',
    'expo-device',
    'expo-localization',
    'expo-router',
    'expo-file-system',
    '@react-native-async-storage/async-storage',
    'react-native-device-info',
    'react-native-localize',
    '@react-navigation/native',
    '@react-native-community/netinfo',
  ],
});
