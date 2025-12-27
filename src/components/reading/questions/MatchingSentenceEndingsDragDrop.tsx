import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: string[] | null;
}

interface MatchingSentenceEndingsDragDropProps {
  questions: Question[];
  groupOptions: string[];
  answers: Record<number, string>;
  onAnswerChange: (questionNumber: number, answer: string) => void;
  onQuestionFocus?: (questionNumber: number) => void;
  isActive: boolean;
}

function extractOptionId(option: string): string {
  // Expected formats:
  // - "A ..." (IELTS style)
  // - "A" (just the id)
  // - Anything else -> return full string
  const trimmed = option.trim();
  const m = trimmed.match(/^([A-Z]|\d+|[ivxlcdm]+)\b/i);
  return (m?.[1] ?? trimmed).toUpperCase();
}

function extractOptionText(option: string): string {
  const trimmed = option.trim();
  const id = extractOptionId(trimmed);
  const rest = trimmed.replace(new RegExp(`^${id}\\b\\s*`, 'i'), '').trim();
  return rest.length ? rest : trimmed;
}

export function MatchingSentenceEndingsDragDrop({
  questions,
  groupOptions: _groupOptions,
  answers: _answers,
  onAnswerChange: _onAnswerChange,
  onQuestionFocus,
}: MatchingSentenceEndingsDragDropProps) {
  const groupOptions = _groupOptions;
  const answers = _answers;
  const onAnswerChange = _onAnswerChange;
  const [draggedOption, setDraggedOption] = useState<string | null>(null);
  const [pressedOption, setPressedOption] = useState<string | null>(null);
  const [isDragOverList, setIsDragOverList] = useState(false);

  // Build an id->fullOption map so we can store just the ID (e.g. "B")
  // but still render the full text in the dropzone.
  const optionById = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of groupOptions) {
      map.set(extractOptionId(opt), opt);
    }
    return map;
  }, [groupOptions]);

  // Get question numbers in THIS group only
  const groupQuestionNumbers = useMemo(
    () => new Set(questions.map((q) => q.question_number)),
    [questions]
  );

  // Get used option IDs (assigned to any question in THIS group only) - filter out empty values
  const usedOptionIds = Object.entries(answers)
    .filter(([qNum]) => groupQuestionNumbers.has(parseInt(qNum)))
    .map(([, opt]) => opt)
    .filter(Boolean);

  const handleDragStart = (e: React.DragEvent, optionValue: string) => {
    setPressedOption(null);
    setDraggedOption(optionValue);
    e.dataTransfer.setData('optionValue', optionValue);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedOption(null);
    setPressedOption(null);
    setIsDragOverList(false);
  };

  const handleDrop = (e: React.DragEvent, questionNumber: number) => {
    e.preventDefault();
    const optionValue = e.dataTransfer.getData('optionValue');
    if (!optionValue) return;

    const optionId = extractOptionId(optionValue);

    // If dragging from another question, clear it first
    const fromQuestion = e.dataTransfer.getData('fromQuestion');
    if (fromQuestion) {
      onAnswerChange(parseInt(fromQuestion), '');
    }

    // Store the ID (e.g. "B") so scoring compares against correct_answer cleanly
    onAnswerChange(questionNumber, optionId);

    // Focus the question in navigation after drop
    onQuestionFocus?.(questionNumber);
  };

  const handleRemove = (questionNumber: number) => {
    onAnswerChange(questionNumber, '');
  };

  // Handle dropping option back to the list
  const handleListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOverList(true);
  };

  const handleListDragLeave = () => {
    setIsDragOverList(false);
  };

  const handleListDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverList(false);
    setDraggedOption(null);
    setPressedOption(null);
    const fromQuestion = e.dataTransfer.getData('fromQuestion');
    if (fromQuestion) {
      onAnswerChange(parseInt(fromQuestion), '');
    }
  };

  return (
    <div className="space-y-6" style={{ fontFamily: 'var(--font-ielts)' }}>
      {/* Questions with Drop Zones - styled like passage paragraph drop zones */}
      <div className="space-y-3">
        {questions.map((question) => {
          const assignedOptionId = answers[question.question_number];
          const fullOption = assignedOptionId ? optionById.get(assignedOptionId) : undefined;
          const assignedOptionText = fullOption ? extractOptionText(fullOption) : assignedOptionId;

          return (
            <div
              key={question.id}
              id={`question-${question.question_number}`}
              className="space-y-2"
            >
              {/* Question text */}
              <div className="flex items-start gap-2">
                <span className="ielts-question-badge flex-shrink-0">
                  {question.question_number}
                </span>
                <span
                  className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: question.question_text }}
                />
              </div>

              {/* Drop zone - same style as Matching Headings paragraph drop zones */}
              <SentenceDropZone
                questionNumber={question.question_number}
                assignedOption={assignedOptionId
                  ? { id: assignedOptionId, text: assignedOptionText || assignedOptionId }
                  : null}
                onDrop={handleDrop}
                onRemove={handleRemove}
              />
            </div>
          );
        })}
      </div>

      {/* Available Endings - styled exactly like List of Headings with drag-back support */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-foreground">List of Sentence Endings</h4>
        <div
          className={cn(
            'inline-block max-w-full p-2 transition-colors',
            isDragOverList && 'bg-[hsl(var(--ielts-ghost))]'
          )}
          onDragOver={handleListDragOver}
          onDragLeave={handleListDragLeave}
          onDrop={handleListDrop}
        >
          <div className="space-y-1.5">
            {groupOptions.map((option) => {
              const optionId = extractOptionId(option);
              const isUsed = usedOptionIds.includes(optionId);
              const isPressed = pressedOption === option;
              const isDragging = draggedOption === option;

              return (
                <div key={option} className="min-h-[32px]">
                  {!isUsed ? (
                    <div
                      draggable
                      onMouseDown={() => setPressedOption(option)}
                      onMouseUp={() => setPressedOption(null)}
                      onMouseLeave={() => setPressedOption(null)}
                      onDragStart={(e) => handleDragStart(e, option)}
                      onDragEnd={handleDragEnd}
                      className="inline-block cursor-move"
                    >
                      <span
                        className={cn(
                          'ielts-drag-option',
                          'hover:border-[hsl(var(--ielts-drag-hover))]',
                          isPressed && 'opacity-60',
                          isDragging && 'opacity-40 scale-95'
                        )}
                      >
                        {option}
                      </span>
                    </div>
                  ) : (
                    // Empty placeholder to maintain fixed slot position
                    <div className="h-full" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SentenceDropZoneProps {
  questionNumber: number;
  assignedOption: { id: string; text: string } | null;
  onDrop: (e: React.DragEvent, questionNumber: number) => void;
  onRemove: (questionNumber: number) => void;
}

function SentenceDropZone({ questionNumber, assignedOption, onDrop, onRemove: _onRemove }: SentenceDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDropInternal = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, questionNumber);
  };

  const handleFilledDragStart = (e: React.DragEvent) => {
    if (!assignedOption) return;
    setIsPressed(false);
    e.dataTransfer.setData('optionValue', assignedOption.id);
    e.dataTransfer.setData('fromQuestion', questionNumber.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFilledDragEnd = () => {
    setIsPressed(false);
  };

  // Filled state: draggable option that matches the heading item shape
  if (assignedOption) {
    return (
      <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDropInternal} className="ml-5">
        <span
          draggable
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onDragStart={handleFilledDragStart}
          onDragEnd={handleFilledDragEnd}
          className={cn(
            'ielts-drag-option cursor-move',
            'hover:border-[hsl(var(--ielts-drag-hover))]',
            isPressed && 'opacity-60',
            isDragOver && 'border-[hsl(var(--ielts-drag-hover))] border-2'
          )}
        >
          {assignedOption.text}
          {assignedOption.text !== assignedOption.id && (
            <span className="ml-2 text-xs text-muted-foreground">({assignedOption.id})</span>
          )}
        </span>
      </div>
    );
  }

  // Empty state - matches heading item shape exactly, with question number placeholder
  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDropInternal} className="ml-5">
      <span className={cn('ielts-drop-zone', isDragOver && 'ielts-drop-zone--active')}>
        {isDragOver ? (
          <span className="text-[hsl(var(--ielts-input-focus))] text-sm">Drop here</span>
        ) : (
          <span className="text-muted-foreground/60 select-none text-sm">{questionNumber}</span>
        )}
      </span>
    </div>
  );
}

