import { useEffect, useRef, useState } from "react";

interface InlineEditProps {
	value: string;
	onCommit: (value: string) => void;
	placeholder?: string;
	className?: string;
}

export function InlineEdit({
	value,
	onCommit,
	placeholder = "Untitled",
	className = "",
}: InlineEditProps) {
	const [editing, setEditing] = useState(false);
	const [localValue, setLocalValue] = useState(value);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!editing) {
			setLocalValue(value);
		}
	}, [value, editing]);

	useEffect(() => {
		if (editing) {
			inputRef.current?.focus();
			inputRef.current?.select();
		}
	}, [editing]);

	function commit() {
		const trimmed = localValue.trim();
		if (trimmed.length > 0 && trimmed !== value) {
			onCommit(trimmed);
		} else {
			setLocalValue(value);
		}
		setEditing(false);
	}

	if (editing) {
		return (
			<input
				ref={inputRef}
				type="text"
				value={localValue}
				onChange={(e) => setLocalValue(e.target.value)}
				onBlur={commit}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						commit();
					} else if (e.key === "Escape") {
						setLocalValue(value);
						setEditing(false);
					}
				}}
				className={`bg-slate-800 border border-accent-400 rounded px-1.5 py-0.5 text-sm text-slate-100 outline-none min-w-0 w-full ${className}`}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setEditing(true)}
			title="Click to edit"
			className={`text-left truncate hover:text-accent-300 transition-colors duration-150 cursor-text min-w-0 ${className}`}
		>
			{value || <span className="text-slate-500 italic">{placeholder}</span>}
		</button>
	);
}
