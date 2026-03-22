type CriteriaWeightSliderProps = {
	criterionName: string;
	baselineWeight: number;
	currentWeight: number;
	onChange: (value: number) => void;
};

export function CriteriaWeightSlider({
	criterionName,
	baselineWeight,
	currentWeight,
	onChange,
}: CriteriaWeightSliderProps) {
	const hasChanged = currentWeight !== baselineWeight;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-baseline justify-between gap-2">
				<span
					className={`text-sm font-medium truncate ${hasChanged ? "text-accent-300" : "text-slate-300"}`}
				>
					{criterionName}
				</span>
				{hasChanged && (
					<span className="text-xs text-slate-500 shrink-0 whitespace-nowrap">
						baseline: {baselineWeight.toFixed(1)}
					</span>
				)}
			</div>
			<div className="flex items-center gap-3">
				<input
					type="range"
					min={0}
					max={10}
					step={0.5}
					value={currentWeight}
					onChange={(e) => onChange(parseFloat(e.target.value))}
					className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
					style={{ accentColor: "var(--color-accent-400)" }}
				/>
				<span className="font-mono text-sm text-slate-300 w-8 text-right shrink-0">
					{currentWeight.toFixed(1)}
				</span>
			</div>
		</div>
	);
}
