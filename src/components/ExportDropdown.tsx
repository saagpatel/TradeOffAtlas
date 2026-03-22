import { useEffect, useRef, useState } from "react";

import type { ExportFormat } from "../lib/export";

type ExportDropdownProps = {
	onExport: (format: ExportFormat) => void;
	disabled?: boolean;
};

export function ExportDropdown({ onExport, disabled }: ExportDropdownProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) {
			document.addEventListener("mousedown", handleClick);
			return () => document.removeEventListener("mousedown", handleClick);
		}
	}, [open]);

	// Listen for keyboard shortcut custom event
	useEffect(() => {
		function handleShortcut() {
			if (!disabled) setOpen((prev) => !prev);
		}
		window.addEventListener("open-export-dropdown", handleShortcut);
		return () =>
			window.removeEventListener("open-export-dropdown", handleShortcut);
	}, [disabled]);

	return (
		<div ref={ref} className="relative">
			<button
				onClick={() => setOpen(!open)}
				disabled={disabled}
				className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-accent-300 hover:bg-accent-500/10 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
			>
				Export
				<kbd className="text-[10px] text-slate-600 font-mono">⌘E</kbd>
			</button>
			{open && (
				<div className="absolute bottom-full mb-1 left-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-40 z-50">
					<button
						onClick={() => {
							onExport("csv");
							setOpen(false);
						}}
						className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
					>
						Export as CSV
					</button>
					<button
						onClick={() => {
							onExport("pdf");
							setOpen(false);
						}}
						className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
					>
						Export as PDF
					</button>
				</div>
			)}
		</div>
	);
}
