import { useEffect, useRef } from "react";

type ModalProps = {
	open: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	}, [open]);

	function handleCancel(e: React.SyntheticEvent<HTMLDialogElement>) {
		e.preventDefault();
		onClose();
	}

	function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
		if (e.target === dialogRef.current) {
			onClose();
		}
	}

	return (
		<dialog
			ref={dialogRef}
			onCancel={handleCancel}
			onClick={handleBackdropClick}
			className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-0 max-w-lg w-full shadow-2xl backdrop:bg-black/60"
		>
			<div className="flex justify-between items-center px-6 pt-6">
				<h2 className="text-lg font-bold">{title}</h2>
				<button
					onClick={onClose}
					className="text-slate-400 hover:text-slate-100 transition-colors duration-150"
					aria-label="Close"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 20 20"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<line x1="4" y1="4" x2="16" y2="16" />
						<line x1="16" y1="4" x2="4" y2="16" />
					</svg>
				</button>
			</div>
			<div className="px-6 pb-6 pt-4">{children}</div>
		</dialog>
	);
}
