import type { SensitivitySummary as SensitivitySummaryData } from "../lib/scoring";

type SensitivitySummaryProps = {
	summary: SensitivitySummaryData;
};

const statusCopy = {
	empty: {
		label: "No ranked options",
		className: "text-slate-400 bg-slate-800",
	},
	flipped: {
		label: "Decision flipped",
		className: "text-rose-300 bg-rose-500/15",
	},
	reordered: {
		label: "Ranking reordered",
		className: "text-amber-300 bg-amber-500/15",
	},
	stable: {
		label: "Stable ranking",
		className: "text-emerald-300 bg-emerald-500/15",
	},
	tied: {
		label: "Fragile tie",
		className: "text-amber-300 bg-amber-500/15",
	},
} as const;

function formatMargin(margin: number | null): string {
	return margin === null ? "—" : `${margin.toFixed(1)} pts`;
}

function descriptionFor(summary: SensitivitySummaryData): string {
	const currentName = summary.currentLeader?.optionName;
	if (!currentName) return "Add scores for at least one option to see decision fragility.";
	if (summary.status === "flipped") {
		return `${currentName} replaced ${summary.baselineLeader?.optionName ?? "the baseline leader"} as the top-ranked option.`;
	}
	if (summary.status === "tied") {
		return `${currentName} is tied for the lead; a small weight change can flip the result.`;
	}
	if (summary.status === "reordered") {
		return `${currentName} remains first, but ${summary.rankChangeCount} option${summary.rankChangeCount === 1 ? " has" : "s have"} changed rank.`;
	}
	if (summary.currentMargin === null) {
		return `${currentName} is the only ranked option.`;
	}
	return `${currentName} remains first with no ranking changes.`;
}

export function SensitivitySummary({ summary }: SensitivitySummaryProps) {
	const status = statusCopy[summary.status];

	return (
		<section
			aria-labelledby="sensitivity-summary-heading"
			className="bg-slate-900/50 rounded-xl border border-slate-800 p-4"
		>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h3
					id="sensitivity-summary-heading"
					className="text-sm font-semibold text-slate-300"
				>
					Decision fragility
				</h3>
				<span
					role="status"
					aria-live="polite"
					className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
				>
					{status.label}
				</span>
			</div>
			<p className="mt-2 text-sm text-slate-400">{descriptionFor(summary)}</p>
			<dl className="mt-4 grid gap-3 sm:grid-cols-3">
				<div>
					<dt className="text-xs uppercase tracking-wider text-slate-500">
						Baseline winner
					</dt>
					<dd className="mt-1 text-sm font-medium text-slate-200">
						{summary.baselineLeader?.optionName ?? "—"}
					</dd>
				</div>
				<div>
					<dt className="text-xs uppercase tracking-wider text-slate-500">
						Current winner
					</dt>
					<dd className="mt-1 text-sm font-medium text-slate-200">
						{summary.currentLeader?.optionName ?? "—"}
					</dd>
				</div>
				<div>
					<dt className="text-xs uppercase tracking-wider text-slate-500">
						Score gap
					</dt>
					<dd className="mt-1 text-sm font-mono text-slate-200">
						{formatMargin(summary.currentMargin)}
					</dd>
				</div>
			</dl>
			<p className="sr-only">
				Baseline score gap: {formatMargin(summary.baselineMargin)}. Current
				score gap: {formatMargin(summary.currentMargin)}. {summary.rankChangeCount}{" "}
				options changed rank.
			</p>
		</section>
	);
}
