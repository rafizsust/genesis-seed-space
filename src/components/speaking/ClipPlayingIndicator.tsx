import { Volume2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClipPlayingIndicatorProps {
  currentClipKey: string | null;
  failedClips: string[];
  className?: string;
}

function formatClipKey(key: string): string {
  // e.g. "p1:q:2" -> "Part 1 – Question 3"
  // e.g. "id:greet" -> "Identity Check"
  // e.g. "p2:intro" -> "Part 2 – Introduction"
  // e.g. "p2:prep_over" -> "Part 2 – Prep Over"
  // e.g. "p3:q:0" -> "Part 3 – Question 1"

  if (key.startsWith('id:')) {
    return 'Identity Check';
  }

  const partMatch = key.match(/^p(\d):(.+)$/);
  if (!partMatch) return key;

  const [, partNum, rest] = partMatch;
  const partLabel = `Part ${partNum}`;

  if (rest === 'intro') return `${partLabel} – Introduction`;
  if (rest === 'prep_over') return `${partLabel} – Start Speaking`;
  if (rest === 'stop') return `${partLabel} – Stop`;

  const qMatch = rest.match(/^q:(\d+)$/);
  if (qMatch) {
    const qNum = parseInt(qMatch[1], 10) + 1;
    return `${partLabel} – Question ${qNum}`;
  }

  return key;
}

export function ClipPlayingIndicator({ currentClipKey, failedClips, className }: ClipPlayingIndicatorProps) {
  if (!currentClipKey && failedClips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {currentClipKey && (
        <Badge variant="outline" className="gap-1.5 bg-primary/10 text-primary border-primary/30 animate-pulse">
          <Volume2 className="w-3 h-3" />
          {formatClipKey(currentClipKey)}
        </Badge>
      )}
      {failedClips.length > 0 && (
        <Badge variant="outline" className="gap-1.5 bg-destructive/10 text-destructive border-destructive/30">
          <AlertTriangle className="w-3 h-3" />
          {failedClips.length} clip(s) skipped
        </Badge>
      )}
    </div>
  );
}
