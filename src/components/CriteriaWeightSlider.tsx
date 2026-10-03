type CriteriaWeightSliderProps = {
	criterionId: number;
	criterionName: string;
	baselineWeight: number;
	currentWeight: number;
	onChange: (value: number) => void;
};

export function CriteriaWeightSlider({
	criterionId,
	criterionName,
	baselineWeight,
	currentWeight,
	onChange,
}: CriteriaWeightSliderProps) {
	const hasChanged = currentWeight !== baselineWeight;
	const inputId = `criterion-weight-${criterionId}`;
	const baselineId = `${inputId}-baseline`;

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-baseline justify-between gap-2">
				<label
					htmlFor={inputId}
					className={`text-sm font-medium truncate ${hasChanged ? "text-accent-300" : "text-slate-300"}`}
				>
					{criterionName}
				</label>
				{hasChanged && (
					<span
						id={baselineId}
						className="text-xs text-slate-500 shrink-0 whitespace-nowrap"
					>
						baseline: {baselineWeight.toFixed(1)}
					</span>
				)}
			</div>
			<div className="flex items-center gap-3">
				<input
					id={inputId}
					type="range"
					min={0}
					max={10}
					step={0.5}
					value={currentWeight}
					aria-label={`${criterionName} weight`}
					aria-valuemin={0}
					aria-valuemax={10}
					aria-valuenow={currentWeight}
					aria-valuetext={`${currentWeight.toFixed(1)} out of 10`}
					aria-describedby={hasChanged ? baselineId : undefined}
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
