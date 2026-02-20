import { create } from "zustand";

export type Tool = "discovery" | "search";

interface ToolState {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: "discovery",
  setActiveTool: (tool) => set({ activeTool: tool }),
}));
