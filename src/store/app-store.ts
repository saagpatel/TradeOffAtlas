import { create } from "zustand";

type AppView = "canvas" | "sensitivity" | "templates" | "history";

interface AppState {
	activeView: AppView;
	sidebarCollapsed: boolean;
	setActiveView: (view: AppView) => void;
	toggleSidebar: () => void;
}

export type { AppView };

export const useAppStore = create<AppState>((set) => ({
	activeView: "canvas",
	sidebarCollapsed: false,
	setActiveView: (view) => set({ activeView: view }),
	toggleSidebar: () =>
		set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
