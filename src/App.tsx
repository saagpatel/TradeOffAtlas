import { useEffect, useState } from "react";
import { getDb } from "./lib/db";

function App() {
	const [dbReady, setDbReady] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		getDb()
			.then(() => setDbReady(true))
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : String(err);
				setError(message);
				console.error("DB init failed:", err);
			});
	}, []);

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 p-8">
			<h1 className="text-3xl font-bold tracking-tight">Tradeoff Atlas</h1>
			{error ? (
				<p className="mt-2 text-red-400">Database error: {error}</p>
			) : (
				<p className="mt-2 text-slate-400">
					{dbReady ? "Database initialized" : "Initializing..."}
				</p>
			)}
		</div>
	);
}

export default App;
