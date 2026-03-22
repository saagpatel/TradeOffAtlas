import { useEffect, useState } from "react";
import { DecisionCanvasView } from "./components/DecisionCanvasView";
import { Sidebar } from "./components/Sidebar";
import { getDb } from "./lib/db";
import { useAppStore } from "./store/app-store";
import { useDecisionStore } from "./store/decision-store";

function App() {
	const [dbReady, setDbReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const activeView = useAppStore((s) => s.activeView);

	useEffect(() => {
		getDb()
			.then(() => {
				setDbReady(true);
				return useDecisionStore.getState().loadDecisions();
			})
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : String(err);
				setError(message);
				console.error("App init failed:", err);
			});
	}, []);

	if (error) {
		return (
			<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-red-400">Database Error</h1>
					<p className="mt-2 text-slate-400">{error}</p>
				</div>
			</div>
		);
	}

	if (!dbReady) {
		return (
			<div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
				<div className="text-center animate-pulse">
					<h1 className="text-2xl font-bold">Tradeoff Atlas</h1>
					<p className="mt-2 text-slate-400">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased">
			<Sidebar />
			<main className="flex-1 min-w-0 flex flex-col overflow-hidden">
				{activeView === "canvas" && <DecisionCanvasView />}
			</main>
		</div>
	);
}

export default App;
