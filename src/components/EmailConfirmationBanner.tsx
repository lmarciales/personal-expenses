import { Mail, X } from "lucide-react";

export function EmailConfirmationBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 mx-4 mt-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 text-sm">
      <Mail className="w-4 h-4 shrink-0" />
      <span className="flex-1">Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.</span>
      <button type="button" onClick={onDismiss} className="shrink-0 hover:text-yellow-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
