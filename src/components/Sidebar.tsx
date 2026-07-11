import type { AppView } from "../store/app-store";
import { useAppStore } from "../store/app-store";
import { useDecisionStore } from "../store/decision-store";

type NavItemProps = {
	label: string;
	active?: boolean;
	onClick?: () => void;
	shortcut?: string;
};

function NavItem({ label, active, onClick, shortcut }: NavItemProps) {
	return (
		<button
			onClick={onClick}
			className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 flex items-center
				${active ? "bg-slate-800 text-slate-100 font-semibold" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}
		>
			<span className="flex-1">{label}</span>
			{shortcut && (
				<kbd className="text-[10px] text-slate-600 font-mono">{shortcut}</kbd>
			)}
		</button>
	);
}

const NAV_ITEMS: { label: string; view: AppView; shortcut: string }[] = [
	{ label: "Decision Canvas", view: "canvas", shortcut: "⌘1" },
	{ label: "Sensitivity Analysis", view: "sensitivity", shortcut: "⌘2" },
	{ label: "Templates", view: "templates", shortcut: "⌘3" },
	{ label: "History", view: "history", shortcut: "⌘4" },
];

export function Sidebar() {
	const decisions = useDecisionStore((s) => s.decisions);
	const activeDecisionId = useDecisionStore((s) => s.activeDecisionId);
	const setActiveDecision = useDecisionStore((s) => s.setActiveDecision);

	const activeView = useAppStore((s) => s.activeView);
	const setActiveView = useAppStore((s) => s.setActiveView);
	const setNewDecisionModalOpen = useAppStore((s) => s.setNewDecisionModalOpen);
	const setDataSafetyModalOpen = useAppStore((s) => s.setDataSafetyModalOpen);

	return (
		<aside className="w-60 h-screen bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
			{/* App header */}
			<div className="px-5 pt-6 pb-4">
				<h1 className="text-lg font-bold tracking-tight">Tradeoff Atlas</h1>
			</div>

			{/* Navigation */}
			<nav className="px-3 pb-4">
				{NAV_ITEMS.map(({ label, view, shortcut }) => (
					<NavItem
						key={view}
						label={label}
						active={activeView === view}
						onClick={() => setActiveView(view)}
						shortcut={shortcut}
					/>
				))}
			</nav>

			<div className="mx-5 border-t border-slate-800" />

			{/* Decision list — scrollable */}
			<div className="flex-1 overflow-y-auto px-3 py-4">
				{decisions.map((d) => (
					<button
						key={d.id}
						onClick={() => {
							void setActiveDecision(d.id);
							setActiveView("canvas");
						}}
						className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-colors duration-150
							${
								activeDecisionId === d.id
									? "bg-slate-800 text-slate-100"
									: "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
							}`}
					>
						<span className="block truncate font-medium">{d.name}</span>
						<span className="block text-[11px] text-slate-600 mt-0.5">
							{new Date(d.createdAt).toLocaleDateString()}
						</span>
					</button>
				))}
			</div>

			{/* Data safety and New Decision buttons */}
			<div className="p-4 border-t border-slate-800 flex flex-col gap-2">
				<button
					onClick={() => setDataSafetyModalOpen(true)}
					className="w-full border border-slate-700 text-slate-300 font-medium py-2.5 rounded-xl hover:bg-slate-800 hover:text-slate-100 transition-colors duration-150 text-sm"
				>
					Data Safety
				</button>
				<button
					onClick={() => setNewDecisionModalOpen(true)}
					className="w-full bg-accent-400 text-slate-950 font-semibold py-2.5 rounded-xl hover:bg-accent-500 transition-colors duration-150 text-sm flex items-center justify-center gap-2"
				>
					<span>+ New Decision</span>
					<kbd className="text-[10px] font-mono opacity-60">⌘N</kbd>
				</button>
			</div>
		</aside>
	);
}
