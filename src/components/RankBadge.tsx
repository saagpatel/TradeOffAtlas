interface RankBadgeProps {
	rank: number;
}

const variants: Record<number, string> = {
	1: "bg-amber-400 text-slate-950",
	2: "bg-slate-300 text-slate-900",
	3: "bg-orange-600 text-white",
};

export function RankBadge({ rank }: RankBadgeProps) {
	const variantClass = variants[rank] ?? "bg-slate-700 text-slate-300";
	return (
		<span
			className={`inline-flex items-center justify-center min-w-8 h-7 rounded-full px-2 text-xs font-mono font-bold ${variantClass}`}
		>
			#{rank}
		</span>
	);
}
