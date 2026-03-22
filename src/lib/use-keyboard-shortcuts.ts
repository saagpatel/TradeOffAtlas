import { useEffect } from "react";
import type { AppView } from "../store/app-store";
import { useAppStore } from "../store/app-store";

const VIEW_KEYS: Record<string, AppView> = {
	"1": "canvas",
	"2": "sensitivity",
	"3": "templates",
	"4": "history",
};

function isEditableElement(el: EventTarget | null): boolean {
	if (!(el instanceof HTMLElement)) return false;
	const tag = el.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	if (el.isContentEditable) return true;
	return false;
}

type ShortcutAction =
	| { type: "setView"; view: AppView }
	| { type: "prevView" }
	| { type: "nextView" }
	| { type: "newDecision" }
	| { type: "export" }
	| { type: "toggleHelp" };

export function matchShortcut(
	key: string,
	metaKey: boolean,
	activeView: AppView,
	inEditable: boolean,
): ShortcutAction | null {
	if (!metaKey) return null;

	// Always-active (even in editable elements)
	if (key === "n") return { type: "newDecision" };
	if (key === "/") return { type: "toggleHelp" };

	// Guarded: don't fire when typing
	if (inEditable) return null;

	// View switching
	const view = VIEW_KEYS[key];
	if (view) return { type: "setView", view };

	// View navigation
	if (key === "[") return { type: "prevView" };
	if (key === "]") return { type: "nextView" };

	// Export (canvas only)
	if (key === "e" && activeView === "canvas") return { type: "export" };

	return null;
}

export function useKeyboardShortcuts() {
	const activeView = useAppStore((s) => s.activeView);

	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			const action = matchShortcut(
				e.key,
				e.metaKey,
				activeView,
				isEditableElement(e.target),
			);
			if (!action) return;

			e.preventDefault();
			const store = useAppStore.getState();

			switch (action.type) {
				case "setView":
					store.setActiveView(action.view);
					break;
				case "prevView":
					store.navigatePrevView();
					break;
				case "nextView":
					store.navigateNextView();
					break;
				case "newDecision":
					store.setNewDecisionModalOpen(true);
					break;
				case "export":
					// Export dropdown is controlled locally in DecisionCanvasView.
					// Dispatch a custom event that the dropdown listens for.
					window.dispatchEvent(new CustomEvent("open-export-dropdown"));
					break;
				case "toggleHelp":
					store.setShortcutsHelpOpen(!store.shortcutsHelpOpen);
					break;
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeView]);
}
