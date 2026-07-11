import { useEffect, useState } from "react";
import { DataSafetyModal } from "./components/DataSafetyModal";
import { DecisionCanvasView } from "./components/DecisionCanvasView";
import { DecisionHistoryView } from "./components/DecisionHistoryView";
import { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
import { NewDecisionModal } from "./components/NewDecisionModal";
import { SensitivityAnalysisView } from "./components/SensitivityAnalysisView";
import { Sidebar } from "./components/Sidebar";
import { TemplateLibraryView } from "./components/TemplateLibraryView";
import { initializeDatabase } from "./lib/db";
import { userMessageForDurabilityError } from "./lib/durability";
import { useKeyboardShortcuts } from "./lib/use-keyboard-shortcuts";
import { useAppStore } from "./store/app-store";
import { useDecisionStore } from "./store/decision-store";

function App() {
	const [dbReady, setDbReady] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [recoveryNotice, setRecoveryNotice] = useState(false);
	const activeView = useAppStore((s) => s.activeView);
	const newDecisionModalOpen = useAppStore((s) => s.newDecisionModalOpen);
	const setNewDecisionModalOpen = useAppStore((s) => s.setNewDecisionModalOpen);
	const dataSafetyModalOpen = useAppStore((s) => s.dataSafetyModalOpen);
	const setDataSafetyModalOpen = useAppStore((s) => s.setDataSafetyModalOpen);
	const setActiveView = useAppStore((s) => s.setActiveView);

	useKeyboardShortcuts();

	useEffect(() => {
		initializeDatabase()
			.then((result) => {
				setRecoveryNotice(result.recoveredInterruptedRestore);
				setDbReady(true);
				return useDecisionStore.getState().loadDecisions();
			})
			.catch((err: unknown) => {
				const message = userMessageForDurabilityError(err);
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
		<>
			<div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased">
				<Sidebar />
				<main className="flex-1 min-w-0 flex flex-col overflow-hidden">
					{recoveryNotice && (
						<div role="status" className="bg-emerald-950/70 border-b border-emerald-900 px-5 py-3 text-sm text-emerald-300">
							An interrupted restore was detected. Your original database was recovered automatically.
						</div>
					)}
					{activeView === "canvas" && <DecisionCanvasView />}
					{activeView === "sensitivity" && <SensitivityAnalysisView />}
					{activeView === "templates" && <TemplateLibraryView />}
					{activeView === "history" && <DecisionHistoryView />}
				</main>
			</div>
			<NewDecisionModal
				open={newDecisionModalOpen}
				onClose={() => setNewDecisionModalOpen(false)}
			/>
			<KeyboardShortcutsModal />
			<DataSafetyModal
				open={dataSafetyModalOpen}
				onClose={() => setDataSafetyModalOpen(false)}
				onRestored={async () => {
					await useDecisionStore.getState().setActiveDecision(null);
					await useDecisionStore.getState().loadDecisions();
					setActiveView("canvas");
				}}
			/>
		</>
	);
}

export default App;
