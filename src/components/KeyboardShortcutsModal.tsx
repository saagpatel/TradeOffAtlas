import { useAppStore } from "../store/app-store";
import { Modal } from "./Modal";

const SHORTCUTS = [
	{ keys: "⌘ N", description: "New decision" },
	{ keys: "⌘ 1", description: "Decision Canvas" },
	{ keys: "⌘ 2", description: "Sensitivity Analysis" },
	{ keys: "⌘ 3", description: "Template Library" },
	{ keys: "⌘ 4", description: "Decision History" },
	{ keys: "⌘ [", description: "Previous view" },
	{ keys: "⌘ ]", description: "Next view" },
	{ keys: "⌘ E", description: "Export decision" },
	{ keys: "⌘ /", description: "Toggle this help" },
	{ keys: "Esc", description: "Close modal" },
];

export function KeyboardShortcutsModal() {
	const open = useAppStore((s) => s.shortcutsHelpOpen);
	const setOpen = useAppStore((s) => s.setShortcutsHelpOpen);

	return (
		<Modal
			open={open}
			onClose={() => setOpen(false)}
			title="Keyboard Shortcuts"
		>
			<div className="grid grid-cols-2 gap-x-8 gap-y-3">
				{SHORTCUTS.map((s) => (
					<div key={s.keys} className="flex items-center justify-between gap-4">
						<span className="text-sm text-slate-300">{s.description}</span>
						<kbd className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-slate-400 whitespace-nowrap">
							{s.keys}
						</kbd>
					</div>
				))}
			</div>
		</Modal>
	);
}
