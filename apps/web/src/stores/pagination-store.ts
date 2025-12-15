import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type PaginationSettings = {
  pageSize: number;
  setPageSize: (pageSize: number) => void;
};

export const usePaginationStore = create<PaginationSettings>()(
  persist(
    (set) => ({
      pageSize: 10,
      setPageSize: (pageSize: number) => set({ pageSize }),
    }),
    {
      name: 'pagination-settings',
    }
  )
);
