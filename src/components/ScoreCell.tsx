import { useEffect, useRef, useState } from "react";

interface ScoreCellProps {
	value: number;
	onChange: (value: number) => void;
}

export function ScoreCell({ value, onChange }: ScoreCellProps) {
	const [localValue, setLocalValue] = useState(String(value));
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setLocalValue(String(value));
	}, [value]);

	function commit() {
		const parsed = parseInt(localValue, 10);
		const clamped = Number.isNaN(parsed)
			? 0
			: Math.max(0, Math.min(10, parsed));
		onChange(clamped);
		setLocalValue(String(clamped));
	}

	function getTintClass(): string {
		const v = parseInt(localValue, 10);
		if (Number.isNaN(v) || v > 3) {
			if (!Number.isNaN(v) && v >= 7) return "bg-teal-500/5";
			return "";
		}
		return "bg-red-500/5";
	}

	return (
		<input
			ref={inputRef}
			type="text"
			inputMode="numeric"
			value={localValue}
			onChange={(e) => {
				const v = e.target.value;
				if (v === "" || /^\d{1,2}$/.test(v)) {
					setLocalValue(v);
				}
			}}
			onBlur={commit}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					inputRef.current?.blur();
				} else if (e.key === "Escape") {
					setLocalValue(String(value));
					inputRef.current?.blur();
				}
			}}
			className={`w-12 h-9 text-center font-mono text-sm bg-transparent border border-slate-700/50 rounded-md focus:ring-2 focus:ring-accent-400 focus:border-transparent outline-none transition-all duration-150 ${getTintClass()}`}
		/>
	);
}
