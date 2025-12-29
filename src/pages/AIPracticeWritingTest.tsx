import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  loadGeneratedTest, 
  savePracticeResult, 
  savePracticeResultAsync,
  GeneratedTest, 
  PracticeResult,
  GeneratedWritingSingleTask,
  isWritingFullTest 
} from '@/types/aiPractice';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTopicCompletions } from '@/hooks/useTopicCompletions';
import { supabase } from '@/integrations/supabase/client';
import { describeApiError } from '@/lib/apiErrors';
import { AILoadingScreen } from '@/components/common/AILoadingScreen';
import { TestStartOverlay } from '@/components/common/TestStartOverlay';
import { WritingTestControls } from '@/components/writing/WritingTestControls';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Clock, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AIPracticeWritingTest() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { incrementCompletion } = useTopicCompletions('writing');
  
  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [submissionText1, setSubmissionText1] = useState('');
  const [submissionText2, setSubmissionText2] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [activeTask, setActiveTask] = useState<'task1' | 'task2'>('task1');
  const [fontSize, setFontSize] = useState(16);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Determine if this is a full test
  const writingTask = test?.writingTask;
  const isFullTest = writingTask && isWritingFullTest(writingTask);
  
  // Get the current task(s)
  const task1 = isFullTest ? writingTask.task1 : (!isFullTest && writingTask ? writingTask as GeneratedWritingSingleTask : null);
  const task2 = isFullTest ? writingTask.task2 : null;

  const wordCount1 = submissionText1.trim().split(/\s+/).filter(Boolean).length;
  const wordCount2 = submissionText2.trim().split(/\s+/).filter(Boolean).length;
  
  // Check if current part has content
  const part1HasContent = wordCount1 > 0;
  const part2HasContent = wordCount2 > 0;

  useEffect(() => {
    if (!testId) { navigate('/ai-practice'); return; }
    const loadedTest = loadGeneratedTest(testId);
    if (!loadedTest || !loadedTest.writingTask) {
      toast({ title: 'Test Not Found', variant: 'destructive' });
      navigate('/ai-practice');
      return;
    }
    setTest(loadedTest);
    setTimeLeft(loadedTest.timeMinutes * 60);
    startTimeRef.current = Date.now();
  }, [testId, navigate, toast]);

  useEffect(() => {
    if (isPaused || !test || !testStarted) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, test, testStarted]);

  const handleSubmit = async () => {
    const totalWords = isFullTest ? wordCount1 + wordCount2 : wordCount1;
    
    if (totalWords < 50) {
      toast({ title: 'Please write at least 50 words', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      const { data, error } = await supabase.functions.invoke('evaluate-ai-practice-writing', {
        body: {
          submissionText: isFullTest ? undefined : submissionText1,
          isFullTest,
          task1Text: isFullTest ? submissionText1 : undefined,
          task2Text: isFullTest ? submissionText2 : undefined,
          task1Instruction: isFullTest ? task1?.instruction : undefined,
          task2Instruction: isFullTest ? task2?.instruction : undefined,
          task1ImageBase64: isFullTest ? task1?.image_base64 : undefined,
          task1VisualType: isFullTest ? task1?.visual_type : undefined,
          taskType: isFullTest ? 'full_test' : task1?.task_type,
          instruction: isFullTest ? undefined : task1?.instruction,
          imageDescription: task1?.image_description,
          imageBase64: isFullTest ? undefined : task1?.image_base64,
          visualType: isFullTest ? undefined : task1?.visual_type,
        },
      });

      if (error) throw error;

      const result: PracticeResult = {
        testId: test!.id,
        answers: isFullTest ? { 1: submissionText1, 2: submissionText2 } : { 1: submissionText1 },
        score: data?.overall_band || 0,
        totalQuestions: isFullTest ? 2 : 1,
        bandScore: data?.overall_band || 5,
        completedAt: new Date().toISOString(),
        timeSpent,
        questionResults: [{
          questionNumber: 1,
          userAnswer: isFullTest ? `Task 1: ${submissionText1}\n\nTask 2: ${submissionText2}` : submissionText1,
          correctAnswer: 'N/A',
          isCorrect: true,
          explanation: JSON.stringify(data?.evaluation_report || {}),
        }],
      };

      savePracticeResult(result);
      if (user) {
        await savePracticeResultAsync(result, user.id, 'writing');
      }
      if (test?.topic) {
        incrementCompletion(test.topic);
      }
      navigate(`/ai-practice/results/${test!.id}`);
    } catch (err: any) {
      console.error('Evaluation error:', err);
      const errDesc = describeApiError(err);
      toast({ title: errDesc.title, description: errDesc.description, variant: 'destructive' });
      
      const result: PracticeResult = {
        testId: test!.id,
        answers: isFullTest ? { 1: submissionText1, 2: submissionText2 } : { 1: submissionText1 },
        score: 0,
        totalQuestions: isFullTest ? 2 : 1,
        bandScore: 0,
        completedAt: new Date().toISOString(),
        timeSpent,
        questionResults: [{ questionNumber: 1, userAnswer: submissionText1, correctAnswer: 'N/A', isCorrect: true, explanation: 'Evaluation not available' }],
      };
      savePracticeResult(result);
      if (user) {
        await savePracticeResultAsync(result, user.id, 'writing');
      }
      navigate(`/ai-practice/results/${test!.id}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTest = useCallback(() => {
    setShowStartOverlay(false);
    setTestStarted(true);
    startTimeRef.current = Date.now();
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleTimeChange = (minutes: number) => {
    setTimeLeft(minutes * 60);
  };

  // Get current task based on activeTask
  const currentTask = activeTask === 'task1' ? task1 : task2;
  const currentSubmission = activeTask === 'task1' ? submissionText1 : submissionText2;
  const setCurrentSubmission = activeTask === 'task1' ? setSubmissionText1 : setSubmissionText2;
  const currentWordCount = activeTask === 'task1' ? wordCount1 : wordCount2;

  if (isSubmitting) {
    return <AILoadingScreen title="Evaluating Your Writing" description="AI is analyzing your response..." progressSteps={['Reading submission', 'Analyzing content', 'Scoring criteria', 'Generating feedback']} currentStepIndex={0} />;
  }

  if (!test?.writingTask) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  if (showStartOverlay) {
    const testTitle = isFullTest 
      ? 'AI Practice: Full Writing Test (Task 1 + Task 2)'
      : `AI Practice: ${task1?.task_type === 'task1' ? 'Task 1 (Report)' : 'Task 2 (Essay)'}`;
    
    return (
      <TestStartOverlay
        module="writing"
        testTitle={testTitle}
        timeMinutes={test.timeMinutes}
        totalQuestions={isFullTest ? 2 : 1}
        questionType={isFullTest ? 'FULL TEST' : (task1?.task_type === 'task1' ? 'TASK 1' : 'TASK 2')}
        difficulty={test.difficulty}
        wordLimit={isFullTest ? 400 : (task1?.word_limit_min || 150)}
        onStart={handleStartTest}
        onCancel={() => navigate('/ai-practice')}
      />
    );
  }

  // Render task content (left panel)
  const renderTaskContent = (task: GeneratedWritingSingleTask | null) => {
    if (!task) return null;
    
    return (
      <div className="p-6 space-y-6">
        {/* Part header - official IELTS style */}
        <div className="bg-muted/50 p-4 -mx-6 -mt-6">
          <h2 className="font-bold text-lg">Part {task.task_type === 'task1' ? '1' : '2'}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You should spend about {task.task_type === 'task1' ? '20' : '40'} minutes on this task. Write at least {task.word_limit_min} words.
          </p>
        </div>

        {/* Task instruction */}
        <div className="space-y-4" style={{ fontSize }}>
          <p className="leading-relaxed">{task.instruction}</p>
        </div>

        {/* Task 1: Show image (as in real IELTS) */}
        {task.task_type === 'task1' && task.image_base64 && (
          <div className="flex justify-center py-4">
            <img 
              src={task.image_base64.startsWith('data:') ? task.image_base64 : `data:image/png;base64,${task.image_base64}`} 
              alt="Task visual" 
              className="max-w-full max-h-[400px] object-contain border rounded"
            />
          </div>
        )}
        
        {/* Task 1 without image - show placeholder message */}
        {task.task_type === 'task1' && !task.image_base64 && (
          <div className="flex items-center justify-center py-8 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <p className="text-muted-foreground text-sm">Image not available for this task</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - IELTS official style */}
      <header className="sticky top-0 z-50 bg-background border-b border-border px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-destructive font-bold text-xl tracking-tight">IELTS</span>
            <span className="text-sm text-muted-foreground">AI Practice</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPaused(!isPaused)} 
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-sm",
                isPaused ? "bg-warning/20 text-warning" : timeLeft < 300 ? "bg-destructive/10 text-destructive" : "bg-muted"
              )}
            >
              <Clock className="w-4 h-4" />{formatTime(timeLeft)}
            </button>
            <WritingTestControls
              fontSize={fontSize}
              setFontSize={setFontSize}
              isFullscreen={isFullscreen}
              toggleFullscreen={toggleFullscreen}
              isPaused={isPaused}
              togglePause={() => setIsPaused(!isPaused)}
              customTime={Math.ceil(timeLeft / 60)}
              setCustomTime={() => {}}
              onTimeChange={handleTimeChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - Task Display */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <ScrollArea className="h-full">
              {renderTaskContent(currentTask)}
            </ScrollArea>
          </ResizablePanel>
          
          {/* Resizable Handle */}
          <ResizableHandle className="relative w-px bg-border cursor-col-resize select-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center border bg-background text-muted-foreground">
              <span className="text-xs">↔</span>
            </div>
          </ResizableHandle>
          
          {/* Right Panel - Writing Input */}
          <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
            <div className="h-full flex flex-col p-4">
              <Textarea 
                value={currentSubmission} 
                onChange={(e) => setCurrentSubmission(e.target.value)} 
                placeholder="Start writing your response here..." 
                className="flex-1 resize-none font-serif leading-relaxed border-2 border-primary/30 focus:border-primary"
                style={{ fontSize }}
              />
              {/* Word count */}
              <div className="flex justify-end mt-2">
                <span className="text-sm text-muted-foreground">
                  Words: <span className={cn("font-medium", currentWordCount >= (currentTask?.word_limit_min || 150) ? "text-success" : "text-foreground")}>{currentWordCount}</span>
                </span>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Bottom Navigation Bar - IELTS official style */}
      <footer className="sticky bottom-0 z-50 bg-background border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Part tabs */}
          <div className="flex items-center gap-4">
            {isFullTest ? (
              <>
                <button
                  onClick={() => setActiveTask('task1')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                    activeTask === 'task1' 
                      ? "bg-primary text-primary-foreground" 
                      : part1HasContent 
                        ? "bg-success/20 text-success border border-success/30"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {part1HasContent && activeTask !== 'task1' && <Check className="w-3 h-3" />}
                  Part 1
                </button>
                <button
                  onClick={() => setActiveTask('task2')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors",
                    activeTask === 'task2' 
                      ? "bg-primary text-primary-foreground" 
                      : part2HasContent 
                        ? "bg-success/20 text-success border border-success/30"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {part2HasContent && activeTask !== 'task2' && <Check className="w-3 h-3" />}
                  Part 2
                </button>
              </>
            ) : (
              <span className="text-sm font-medium">
                Part {task1?.task_type === 'task1' ? '1' : '2'}
              </span>
            )}
            
            {/* Current question indicator */}
            <span className="text-sm text-muted-foreground ml-4">
              {activeTask === 'task1' ? '0' : '0'} of 1
            </span>
          </div>

          {/* Navigation and Submit */}
          <div className="flex items-center gap-2">
            {isFullTest && (
              <>
                <Button 
                  variant="secondary"
                  size="icon"
                  onClick={() => setActiveTask('task1')}
                  disabled={activeTask === 'task1'}
                  className="bg-muted-foreground/80 hover:bg-muted-foreground text-background"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button 
                  variant="secondary"
                  size="icon"
                  onClick={() => setActiveTask('task2')}
                  disabled={activeTask === 'task2'}
                  className="bg-foreground hover:bg-foreground/90 text-background"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}
            <Button 
              onClick={handleSubmit} 
              size="icon"
              className="bg-foreground hover:bg-foreground/90 text-background ml-2"
            >
              <Check className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
