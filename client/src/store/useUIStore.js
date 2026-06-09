import { create } from "zustand";

const useUIStore = create((set) => ({
  isAppReady: false,
  setAppReady: (ready) => set({ isAppReady: ready }),
}));

export default useUIStore;
