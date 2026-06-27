import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, File } from 'lucide-react';
import type { TaskAttachment } from '@/types';

interface DocumentUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUpload: (attachment: TaskAttachment) => void;
  taskTitle?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function DocumentUploadDialog({
  open,
  onClose,
  onUpload,
  taskTitle,
}: DocumentUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [previewUrl]);

  const handleClose = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onClose();
  }, [previewUrl, onClose]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const data = await fileToBase64(selectedFile);
      const attachment: TaskAttachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
        data,
        uploadedAt: new Date().toISOString(),
      };
      onUpload(attachment);
      handleClose();
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, onUpload, handleClose]);

  const isImage = selectedFile?.type.startsWith('image/');
  const isPdf = selectedFile?.type === 'application/pdf';
  const isVideo = selectedFile?.type.startsWith('video/');
  const isAudio = selectedFile?.type.startsWith('audio/');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-md"
        style={{ '--tw-enter-scale': 0.75 } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Belge Ekle</DialogTitle>
          {taskTitle && (
            <p className="text-sm text-gray-500 mt-1">{taskTitle}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!selectedFile ? (
            <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-gray-200 rounded-lg hover:border-[#6161FF]/50 hover:bg-[#6161FF]/5 cursor-pointer transition-colors">
              <Upload className="h-10 w-10 text-gray-400" />
              <span className="text-sm text-gray-600">
                Dosya seçmek için tıklayın veya sürükleyin
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.svg"
                onChange={handleFileChange}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700">Önizleme</div>
              <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                {isImage && previewUrl ? (
                  <div className="aspect-video flex items-center justify-center p-2">
                    <img
                      src={previewUrl}
                      alt={selectedFile.name}
                      className="max-h-48 object-contain"
                    />
                  </div>
                ) : isPdf && previewUrl ? (
                  <div className="aspect-video flex items-center justify-center p-4">
                    <embed
                      src={previewUrl}
                      type="application/pdf"
                      className="w-full h-64"
                      title={selectedFile.name}
                    />
                  </div>
                ) : isVideo && previewUrl ? (
                  <div className="aspect-video flex items-center justify-center p-2">
                    <video src={previewUrl} controls className="max-h-48 w-full rounded" />
                  </div>
                ) : isAudio && previewUrl ? (
                  <div className="flex items-center justify-center p-6">
                    <audio src={previewUrl} controls className="w-full" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4">
                    <File className="h-12 w-12 text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }
                  }}
                >
                  Değiştir
                </Button>
                <span className="text-xs text-gray-500 truncate">{selectedFile.name}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            İptal
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="bg-[#6161FF] hover:bg-[#5050E0]"
          >
            {isUploading ? 'Yükleniyor...' : 'Yükle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
