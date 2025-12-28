import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save, Volume2 } from 'lucide-react';
import { toast } from 'sonner';

const EXAMINER_VOICE_KEY = 'examiner_voice_preference';

// Gemini TTS voices (British-sounding or neutral recommended for IELTS)
const AVAILABLE_VOICES = [
  { id: 'Kore', label: 'Kore (Male, Neutral)' },
  { id: 'Orus', label: 'Orus (Male, Deep)' },
  { id: 'Fenrir', label: 'Fenrir (Male, Formal)' },
  { id: 'Charon', label: 'Charon (Male, Warm)' },
  { id: 'Puck', label: 'Puck (Female, Neutral)' },
  { id: 'Zephyr', label: 'Zephyr (Female, Bright)' },
  { id: 'Leda', label: 'Leda (Female, Clear)' },
  { id: 'Aoede', label: 'Aoede (Female, Soft)' },
];

export function getExaminerVoice(): string {
  if (typeof window === 'undefined') return 'Kore';
  return localStorage.getItem(EXAMINER_VOICE_KEY) || 'Kore';
}

export function ExaminerVoiceSelector() {
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(EXAMINER_VOICE_KEY);
    if (stored) {
      setSelectedVoice(stored);
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(EXAMINER_VOICE_KEY, selectedVoice);
      toast.success('Examiner voice preference saved!');
    } catch (err) {
      toast.error('Failed to save voice preference');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label htmlFor="examiner-voice" className="flex items-center gap-2">
        <Volume2 size={16} />
        AI Examiner Voice
      </Label>
      <p className="text-sm text-muted-foreground">
        Choose the voice for the AI Speaking examiner. Changes apply to new tests.
      </p>
      <Select value={selectedVoice} onValueChange={setSelectedVoice}>
        <SelectTrigger id="examiner-voice" className="w-full max-w-xs">
          <SelectValue placeholder="Select a voice" />
        </SelectTrigger>
        <SelectContent>
          {AVAILABLE_VOICES.map((voice) => (
            <SelectItem key={voice.id} value={voice.id}>
              {voice.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleSave} disabled={isSaving} className="gap-2">
        <Save size={16} />
        {isSaving ? 'Saving...' : 'Save Voice'}
      </Button>
    </div>
  );
}
