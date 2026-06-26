import { cn } from '@/lib/utils';

interface LabelChipProps {
  name: string;
  color: string;
  /** compact: sadece renkli nokta, hover'da isim tooltip */
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}

export function LabelChip({ name, color, compact = false, selected, onClick, onRemove, className }: LabelChipProps) {
  const bg = color + '22'; // 13% opacity
  const border = color + '55'; // 33% opacity

  if (compact) {
    return (
      <span
        title={name}
        className={cn('inline-block h-2.5 w-2.5 rounded-full flex-shrink-0', className)}
        style={{ backgroundColor: color }}
      />
    );
  }

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none select-none transition-all',
        onClick && 'cursor-pointer hover:opacity-80',
        selected && 'ring-2',
        className
      )}
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color,
        ...(selected ? { ringColor: color } : {}),
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 leading-none opacity-60 hover:opacity-100"
          aria-label={`${name} kaldır`}
        >
          ×
        </button>
      )}
    </span>
  );
}

/** Görev kartları için kompakt nokta sırası */
export function LabelDots({ tags, colorMap, max = 4 }: { tags: string[]; colorMap: Record<string, string>; max?: number }) {
  if (tags.length === 0) return null;
  const visible = tags.slice(0, max);
  const rest = tags.length - max;
  return (
    <div className="flex items-center gap-1">
      {visible.map((tag) => (
        <LabelChip key={tag} name={tag} color={colorMap[tag] ?? '#6161FF'} compact />
      ))}
      {rest > 0 && (
        <span className="text-[10px] text-gray-400 leading-none">+{rest}</span>
      )}
    </div>
  );
}
