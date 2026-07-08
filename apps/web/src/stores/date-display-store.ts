import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DateDisplayMode = 'absolute' | 'relative';

type DateDisplayStore = {
  mode: DateDisplayMode;
  setMode: (mode: DateDisplayMode) => void;
  toggleMode: () => void;
};

export const useDateDisplayStore = create<DateDisplayStore>()(
  persist(
    (set, get) => ({
      mode: 'absolute',
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set({ mode: get().mode === 'absolute' ? 'relative' : 'absolute' }),
    }),
    {
      name: 'date-display-mode',
    }
  )
);
