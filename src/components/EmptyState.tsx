type EmptyStateProps = {
	icon: React.ReactNode;
	title: string;
	description: string;
	action?: { label: string; onClick: () => void };
};

export function EmptyState({
	icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-24">
			<div className="text-slate-600">{icon}</div>
			<h2 className="text-xl font-bold text-slate-300 mt-6">{title}</h2>
			<p className="text-slate-500 mt-2 max-w-sm text-center">{description}</p>
			{action && (
				<button
					onClick={action.onClick}
					className="mt-8 bg-accent-400 text-slate-950 font-semibold px-6 py-3 rounded-xl hover:bg-accent-500 transition-colors duration-150"
				>
					{action.label}
				</button>
			)}
		</div>
	);
}
