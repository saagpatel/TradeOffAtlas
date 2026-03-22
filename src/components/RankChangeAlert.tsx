import type { RankChange } from "../types";
import { RankBadge } from "./RankBadge";

type RankChangeAlertProps = {
	rankChanges: RankChange[];
};

export function RankChangeAlert({ rankChanges }: RankChangeAlertProps) {
	if (rankChanges.length === 0) return null;

	return (
		<div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
			<p className="text-sm font-bold text-amber-400 mb-3">Rank Changes</p>
			<ul className="space-y-2">
				{rankChanges.map((change) => (
					<li
						key={change.optionId}
						className="flex items-center gap-2 text-sm text-slate-300"
					>
						<span className="font-medium truncate">{change.optionName}</span>
						<span className="text-slate-500 shrink-0">moved from</span>
						<RankBadge rank={change.previousRank} />
						<span className="text-slate-500 shrink-0">→</span>
						<RankBadge rank={change.newRank} />
					</li>
				))}
			</ul>
		</div>
	);
}
