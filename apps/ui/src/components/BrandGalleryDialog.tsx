import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { TaskAttachment, BrandIdentity } from '@/types';

interface BrandGalleryDialogProps {
  open: boolean;
  onClose: () => void;
  brandIdentity: BrandIdentity;
  isEditing?: boolean;
  onDeleteAttachment?: (id: string) => void;
  onUploadClick?: () => void;
}

const getMediaIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon className="h-10 w-10 text-indigo-400" />;
  if (type.startsWith('video/')) return <Film className="h-10 w-10 text-amber-400" />;
  if (type.startsWith('audio/')) return <Music className="h-10 w-10 text-emerald-400" />;
  return <FileText className="h-10 w-10 text-gray-400" />;
};

const getMediaLabel = (type: string) => {
  if (type.startsWith('image/')) return 'Görsel';
  if (type.startsWith('video/')) return 'Video';
  if (type.startsWith('audio/')) return 'Ses';
  if (type === 'application/pdf') return 'PDF';
  return 'Belge';
};

function LightboxView({
  attachment,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: {
  attachment: TaskAttachment;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  const dataUrl = `data:${attachment.type};base64,${attachment.data}`;
  const isImage = attachment.type.startsWith('image/');
  const isVideo = attachment.type.startsWith('video/');
  const isAudio = attachment.type.startsWith('audio/');
  const isPdf = attachment.type === 'application/pdf';

  const download = useCallback(() => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = attachment.name;
    a.click();
  }, [dataUrl, attachment.name]);

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center">
      <button
        type="button"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white bg-black/40 rounded-full p-2"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {hasPrev && (
        <button
          type="button"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white bg-black/40 rounded-full p-2"
          onClick={onPrev}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white/70 hover:text-white bg-black/40 rounded-full p-2"
          onClick={onNext}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      <div className="max-w-5xl max-h-[85vh] w-full mx-8 flex flex-col items-center gap-4">
        {isImage && (
          <img src={dataUrl} alt={attachment.name} className="max-h-[70vh] object-contain rounded-lg" />
        )}
        {isVideo && (
          <video src={dataUrl} controls className="max-h-[70vh] rounded-lg w-full" />
        )}
        {isAudio && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-10 flex flex-col items-center gap-4">
            <Music className="h-20 w-20 text-white/60" />
            <p className="text-white font-medium">{attachment.name}</p>
            <audio src={dataUrl} controls className="w-80" />
          </div>
        )}
        {isPdf && (
          <embed src={dataUrl} type="application/pdf" className="w-full h-[75vh] rounded-lg" />
        )}
        {!isImage && !isVideo && !isAudio && !isPdf && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-10 flex flex-col items-center gap-4">
            <FileText className="h-20 w-20 text-white/60" />
            <p className="text-white font-medium">{attachment.name}</p>
            <p className="text-white/50 text-sm">{attachment.type}</p>
          </div>
        )}

        <div className="flex items-center gap-3 text-white/80 text-sm">
          <span className="font-medium">{attachment.name}</span>
          <span className="text-white/40">
            {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : ''}
          </span>
          <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={download}>
            <Download className="h-3 w-3" />
            İndir
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BrandGalleryDialog({
  open,
  onClose,
  brandIdentity,
  isEditing = false,
  onDeleteAttachment,
  onUploadClick,
}: BrandGalleryDialogProps) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const attachments = brandIdentity.logoAttachments ?? [];

  const lightboxAtt = lightboxIdx !== null ? attachments[lightboxIdx] : null;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">Kurumsal Kimlik Galerisi</DialogTitle>
              <div className="flex items-center gap-2">
                {isEditing && onUploadClick && (
                  <Button size="sm" onClick={onUploadClick} className="bg-[#6161FF] hover:bg-[#5050E0] gap-1.5">
                    <Upload className="h-3.5 w-3.5" />
                    Dosya Yükle
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6">
              {/* Marka Bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Renk Paleti</p>
                  <div className="flex flex-wrap gap-2">
                    {brandIdentity.colorPalette.length > 0 ? (
                      brandIdentity.colorPalette.map((color) => (
                        <div key={color} className="flex flex-col items-center gap-1">
                          <span
                            className="w-8 h-8 rounded-lg border border-gray-200 shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                          <span className="text-[9px] text-gray-400 font-mono">{color}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Yazı Tipleri</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brandIdentity.fonts.length > 0 ? (
                      brandIdentity.fonts.map((font) => (
                        <Badge key={font} variant="secondary" className="text-xs">{font}</Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Marka Tonu</p>
                  <p className="text-sm font-medium text-gray-700">{brandIdentity.brandTone || '-'}</p>
                </div>
              </div>

              {/* Dosya Galerisi */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Dosyalar
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">{attachments.length}</Badge>
                  )}
                </p>

                {attachments.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Henüz dosya yüklenmemiş.
                    {isEditing && onUploadClick && (
                      <Button size="sm" variant="outline" className="mt-3 mx-auto block" onClick={onUploadClick}>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Dosya Yükle
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {attachments.map((att, idx) => {
                      const isImage = att.type.startsWith('image/');
                      return (
                        <div
                          key={att.id}
                          className="group relative rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => setLightboxIdx(idx)}
                        >
                          <div className="aspect-square bg-gray-50 flex items-center justify-center">
                            {isImage ? (
                              <img
                                src={`data:${att.type};base64,${att.data}`}
                                alt={att.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-2">
                                {getMediaIcon(att.type)}
                                <Badge variant="secondary" className="text-[9px]">
                                  {getMediaLabel(att.type)}
                                </Badge>
                              </div>
                            )}
                          </div>
                          <div className="p-2.5">
                            <p className="text-xs font-medium text-gray-800 truncate">{att.name}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}
                              {att.uploadedAt && ` · ${format(new Date(att.uploadedAt), 'd MMM', { locale: tr })}`}
                            </p>
                          </div>
                          {isEditing && onDeleteAttachment && (
                            <button
                              type="button"
                              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); onDeleteAttachment(att.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Logo Dosyaları (metin) */}
              {brandIdentity.logos.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Kayıtlı Logo Referansları</p>
                  <p className="text-sm text-gray-600">{brandIdentity.logos.join(', ')}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {lightboxAtt && (
        <LightboxView
          attachment={lightboxAtt}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() => setLightboxIdx((i) => (i !== null && i < attachments.length - 1 ? i + 1 : i))}
          hasPrev={lightboxIdx !== null && lightboxIdx > 0}
          hasNext={lightboxIdx !== null && lightboxIdx < attachments.length - 1}
        />
      )}
    </>
  );
}
