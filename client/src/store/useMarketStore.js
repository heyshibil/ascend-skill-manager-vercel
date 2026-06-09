import { create } from "zustand";
import { toast } from "sonner";

export const useMarketStore = create((set, get) => ({
  skills: [],
  sseConnections: null,

  // Connect to stream
  initializeMarketStream: () => {
    // If connection already exists, dont need another
    if (get().sseConnections) return;

    const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000/api";
    const streamUrl = `${serverUrl.replace(/\/$/, "")}/market/stream`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);

      if (parsedData.type === "INITIAL_DATA") {
        set({ skills: parsedData.payload });
      } else if (parsedData.type === "NEW_SKILL") {
        set((state) => ({
          skills: [parsedData.payload, ...state.skills],
        }));

        toast.info(`Market Shift: ${parsedData.payload.skillName} is surging!`);
      } else if (parsedData.type === "UPDATE_SKILL") {
        set((state) => ({
          skills: state.skills.map((skill) =>
            skill._id === parsedData.payload._id ? parsedData.payload : skill,
          ),
        }));
      } else if (parsedData.type === "DELETE_SKILL") {
        set((state) => ({
          skills: state.skills.filter(
            (skill) => skill._id !== parsedData.payload,
          ),
        }));
      } else if (parsedData.type === "ERROR") {
        toast.error(parsedData.message);
      }
    };

    eventSource.onerror = () => {
      console.error("Market SSE Connection Lost.");
      eventSource.close();
      set({ sseConnections: null }); // Allow reconnect later
    };

    set({ sseConnections: eventSource });
  },

  // Clean up
  closeMarketStream: () => {
    const { sseConnections } = get();
    if (sseConnections) {
      sseConnections.close();
      set({ sseConnections: null, skills: [] });
    }
  },
}));
