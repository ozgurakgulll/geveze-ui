import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type ConfirmDialogType = 'clearAll' | 'deleteCompany' | 'deleteTask';

export interface ConfirmDialogState {
  open: boolean;
  type: ConfirmDialogType | null;
  title?: string;
  companyName?: string;
  taskTitle?: string;
  taskId?: string;
  companyId?: string;
}

interface ConfirmDialogProps {
  state: ConfirmDialogState;
  onClose: () => void;
  onConfirm: (payload: { type: ConfirmDialogType; taskId?: string; companyId?: string }) => void;
}

export function ConfirmDialog({ state, onClose, onConfirm }: ConfirmDialogProps) {
  if (!state.type) return null;

  const handleConfirm = () => {
    onConfirm({
      type: state.type!,
      taskId: state.taskId,
      companyId: state.companyId,
    });
    onClose();
  };

  const config = {
    clearAll: {
      title: 'Tüm verileri sil',
      description: 'Tüm veriler silinecek ve sayfa yenilenecek. Emin misiniz?',
      confirmLabel: 'Sil ve Yenile',
      variant: 'destructive' as const,
    },
    deleteCompany: {
      title: 'Şirketi sil',
      description: `"${state.companyName}" şirketini silmek istediğinize emin misiniz?`,
      confirmLabel: 'Sil',
      variant: 'destructive' as const,
    },
    deleteTask: {
      title: 'Görevi sil',
      description: `"${state.taskTitle}" görevini silmek istediğinize emin misiniz?`,
      confirmLabel: 'Sil',
      variant: 'destructive' as const,
    },
  };

  const c = config[state.type] ?? config.clearAll;

  return (
    <AlertDialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{c.title}</AlertDialogTitle>
          <AlertDialogDescription>{c.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {c.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
