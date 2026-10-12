import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'expo/index': 'src/expo/index.tsx',
    'react-native/index': 'src/react-native/index.tsx',
  },
  // CJS only: ESM output would rewrite the guarded optional-peer `require()`
  // calls into a shim Metro can't see, silently dropping those packages.
  format: ['cjs'],
  dts: true,
  clean: true,
  // Metro ignores input source maps from node_modules, so they'd only bloat the tarball.
  sourcemap: false,
  minify: true,
  splitting: false,
  treeshake: false,
  target: 'es2020',
  platform: 'neutral',
  // Bundled so only gzipSync ships, instead of all of fflate in every app.
  noExternal: ['fflate'],
  banner: {
    js: '/*! fflate (bundled) | MIT License | Copyright (c) 2023 Arjun Barrett */',
  },
  external: [
    'react',
    'react/jsx-runtime',
    'react-native',
    'expo-application',
    'expo-device',
    'expo-localization',
    'expo-router',
    '@react-native-async-storage/async-storage',
    'react-native-device-info',
    'react-native-localize',
    '@react-native-community/netinfo',
  ],
});
