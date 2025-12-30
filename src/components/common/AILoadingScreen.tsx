import { Brain, Loader2, CheckCircle2, Circle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FlashcardQuickPractice } from './FlashcardQuickPractice';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Fun IELTS-related facts and tips to display during loading
const IELTS_FUN_FACTS = [
  "💡 IELTS is taken by over 3 million people each year!",
  "🌍 IELTS is accepted in 140+ countries worldwide.",
  "⏱️ Tip: In reading, don't read the whole passage first—skim for answers!",
  "📝 Fun fact: 'IELTS' stands for International English Language Testing System.",
  "🎯 Tip: Practice makes perfect—take at least 5 mock tests before the real exam!",
  "🧠 Did you know? The listening section plays audio only ONCE!",
  "📖 Tip: Spelling matters in IELTS—double-check your answers!",
  "⭐ Fun fact: IELTS has both Academic and General Training versions.",
  "🎧 Tip: In listening, use the 30-second review time wisely!",
  "✏️ Did you know? British AND American spellings are both accepted!",
  "🔤 Tip: In writing, aim for a variety of vocabulary and sentence structures.",
  "📊 Fun fact: Band scores range from 0 to 9 in 0.5 increments.",
  "💪 Tip: Stay calm—test anxiety affects performance more than lack of knowledge!",
  "🌟 Did you know? IELTS results are valid for 2 years.",
  "🎤 Tip: In speaking, it's okay to pause briefly to think—just don't stay silent!",
];

interface AILoadingScreenProps {
  title: string;
  description: string;
  progressSteps: string[];
  currentStepIndex: number;
  estimatedTime?: string;
  estimatedSeconds?: number;
  onAbort?: () => void;
}

export function AILoadingScreen({
  title,
  description: _description,
  progressSteps,
  currentStepIndex,
  estimatedTime = '15-30 seconds',
  estimatedSeconds,
  onAbort,
}: AILoadingScreenProps) {
  const { user } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentFactIndex, setCurrentFactIndex] = useState(() => 
    Math.floor(Math.random() * IELTS_FUN_FACTS.length)
  );
  const [hasFlashcards, setHasFlashcards] = useState<boolean | null>(null);

  // Check if user has non-mastered flashcards
  useEffect(() => {
    const checkFlashcards = async () => {
      if (!user) {
        setHasFlashcards(false);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('flashcard_cards')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['learning', 'reviewing']);

        if (error) throw error;
        setHasFlashcards((count ?? 0) > 0);
      } catch (err) {
        console.error('Error checking flashcards:', err);
        setHasFlashcards(false);
      }
    };

    checkFlashcards();
  }, [user]);

  // Timer to track elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Rotate through fun facts every 5 seconds (only if no flashcards)
  useEffect(() => {
    if (hasFlashcards) return;
    
    const factInterval = setInterval(() => {
      setCurrentFactIndex(prev => (prev + 1) % IELTS_FUN_FACTS.length);
    }, 5000);

    return () => clearInterval(factInterval);
  }, [hasFlashcards]);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage (cap at 95% until complete)
  const progressPercent = estimatedSeconds 
    ? Math.min(95, (elapsedSeconds / estimatedSeconds) * 100)
    : null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full space-y-4">
        {/* Abort Button */}
        {onAbort && (
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAbort}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {/* AI Brain Logo with Animation */}
        <div className="relative w-14 h-14 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-primary/50 animate-pulse-ring" />
          <Brain size={28} className="text-primary relative z-10 animate-float" />
        </div>

        <h1 className="text-lg font-bold text-foreground">{title}</h1>

        {/* Progress Bar */}
        {progressPercent !== null && (
          <div className="w-full max-w-[240px] mx-auto">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
              <span className="font-mono">{formatTime(elapsedSeconds)}</span>
              <span>~{estimatedTime}</span>
            </div>
          </div>
        )}

        {/* Compact Progress Steps - horizontal */}
        <div className="flex items-center justify-center gap-1 pt-1">
          {progressSteps.map((_, index) => (
            <div key={index} className="flex items-center gap-1">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-300",
                index < currentStepIndex
                  ? "bg-success text-success-foreground"
                  : index === currentStepIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {index < currentStepIndex ? (
                  <CheckCircle2 size={12} />
                ) : index === currentStepIndex ? (
                  <Loader2 size={12} className="animate-spin-slow" />
                ) : (
                  <Circle size={10} />
                )}
              </div>
              {index < progressSteps.length - 1 && (
                <div className={cn(
                  "w-4 h-0.5 rounded",
                  index < currentStepIndex ? "bg-success" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
        
        {/* Current step text */}
        <p className="text-sm text-primary font-medium">
          {progressSteps[currentStepIndex]}...
        </p>

        {/* Flashcard Practice OR Fun Fact */}
        <div className="mt-4">
          {/* Show flashcards only if user has non-mastered cards */}
          {hasFlashcards === true && (
            <FlashcardQuickPractice />
          )}
          
          {/* Show tips if no flashcards or all are mastered */}
          {hasFlashcards === false && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground animate-fade-in" key={currentFactIndex}>
                {IELTS_FUN_FACTS[currentFactIndex]}
              </p>
            </div>
          )}
          
          {/* Show loading placeholder while checking */}
          {hasFlashcards === null && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground animate-fade-in" key={currentFactIndex}>
                {IELTS_FUN_FACTS[currentFactIndex]}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
