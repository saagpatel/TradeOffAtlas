export const CHART_COLORS = [
	"#2dd4bf", // teal-400
	"#f87171", // red-400
	"#fbbf24", // amber-400
	"#a78bfa", // violet-400
	"#38bdf8", // sky-400
	"#fb7185", // rose-400
	"#a3e635", // lime-400
	"#fb923c", // orange-400
] as const;

export function getOptionColor(index: number): string {
	return CHART_COLORS[index % CHART_COLORS.length];
}
