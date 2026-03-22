import { create } from "zustand";

type AppView = "canvas" | "sensitivity" | "templates" | "history";

const VIEW_ORDER: AppView[] = ["canvas", "sensitivity", "templates", "history"];

interface AppState {
	activeView: AppView;
	sidebarCollapsed: boolean;
	newDecisionModalOpen: boolean;
	shortcutsHelpOpen: boolean;
	setActiveView: (view: AppView) => void;
	navigatePrevView: () => void;
	navigateNextView: () => void;
	toggleSidebar: () => void;
	setNewDecisionModalOpen: (open: boolean) => void;
	setShortcutsHelpOpen: (open: boolean) => void;
}

export type { AppView };
export { VIEW_ORDER };

export const useAppStore = create<AppState>((set, get) => ({
	activeView: "canvas",
	sidebarCollapsed: false,
	newDecisionModalOpen: false,
	shortcutsHelpOpen: false,
	setActiveView: (view) => set({ activeView: view }),
	navigatePrevView: () => {
		const idx = VIEW_ORDER.indexOf(get().activeView);
		const prev = VIEW_ORDER[(idx - 1 + VIEW_ORDER.length) % VIEW_ORDER.length];
		set({ activeView: prev });
	},
	navigateNextView: () => {
		const idx = VIEW_ORDER.indexOf(get().activeView);
		const next = VIEW_ORDER[(idx + 1) % VIEW_ORDER.length];
		set({ activeView: next });
	},
	toggleSidebar: () =>
		set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
	setNewDecisionModalOpen: (open) => set({ newDecisionModalOpen: open }),
	setShortcutsHelpOpen: (open) => set({ shortcutsHelpOpen: open }),
}));
