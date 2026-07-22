declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SERVER_URL?: string;
      EXPO_PUBLIC_WEB_URL?: string;
      EXPO_PUBLIC_PHASE_API_KEY?: string;
      APPLE_TEAM_ID?: string;
    }
  }
}

export {};
