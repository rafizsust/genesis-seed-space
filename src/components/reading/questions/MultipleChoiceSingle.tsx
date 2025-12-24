import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { QuestionTextWithTools } from '@/components/common/QuestionTextWithTools';

interface Question {
  id: string;
  question_number: number;
  question_text: string;
  options: string[] | null;
  option_format?: string | null; // Added option_format
}

interface MultipleChoiceSingleProps {
  testId: string;
  renderRichText: (text: string) => string;
  question: Question;
  answer: string | undefined;
  onAnswerChange: (answer: string) => void;
  isActive: boolean;
  onSetActive?: () => void;
}

// Helper function to get option label (A, B, C or 1, 2, 3 etc.)
const getOptionLabel = (index: number, format: string | null | undefined) => {
  if (format === '1') return String(index + 1);
  if (format === 'i') {
    const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
    return romanNumerals[index] || String(index + 1);
  }
  return String.fromCharCode(65 + index); // Default to 'A' format
};


export function MultipleChoiceSingle({ testId, renderRichText, question, answer, onAnswerChange, onSetActive }: MultipleChoiceSingleProps) {
  const rawOptions = question.options || [];
  const optionFormat = question.option_format || 'A'; // Get format from question prop

  // Helper to strip existing letter prefix like "A. ", "B. " from option text
  const stripLetterPrefix = (text: string): { label: string; cleanText: string } => {
    // Match patterns like "A. ", "B. ", "1. ", "i. " at the start
    const match = text.match(/^([A-Za-z]|[ivxIVX]+|\d+)\.\s*/);
    if (match) {
      return { label: match[1].toUpperCase(), cleanText: text.substring(match[0].length) };
    }
    return { label: '', cleanText: text };
  };

  // Normalize options to handle both string[] and {label, text}[] formats
  const normalizedOptions = rawOptions.map((opt, idx) => {
    if (typeof opt === 'string') {
      const { label, cleanText } = stripLetterPrefix(opt);
      // Use extracted label if found, otherwise generate one
      return { 
        label: label || getOptionLabel(idx, optionFormat), 
        text: cleanText || opt 
      };
    }
    // Handle object format {label: "A", text: "..."}
    const optObj = opt as { label?: string; text?: string };
    return {
      label: optObj.label || getOptionLabel(idx, optionFormat),
      text: optObj.text || String(opt),
    };
  });

  return (
    <div onClick={(e) => { e.stopPropagation(); onSetActive?.(); }} onMouseDown={(e) => e.stopPropagation()}>
      <RadioGroup
        value={answer || ''}
        onValueChange={onAnswerChange}
        className="space-y-0.5"
      >
        {normalizedOptions.map((option, idx) => {
          const isSelected = answer === option.label;
          return (
            <label 
              key={idx}
              htmlFor={`q${question.question_number}-${idx}`}
              className={cn(
                "ielts-mcq-option",
                isSelected && "ielts-mcq-option--selected"
              )}
            >
              <RadioGroupItem
                value={option.label}
                id={`q${question.question_number}-${idx}`}
                className="ielts-mcq-indicator"
              />
              <span
                className="text-sm leading-relaxed flex-1"
                style={{ fontFamily: 'var(--font-ielts)' }}
              >
                <QuestionTextWithTools
                  testId={testId}
                  contentId={`${question.id}-option-${idx}`}
                  text={option.text}
                  fontSize={14}
                  renderRichText={renderRichText}
                  isActive={false}
                  as="span"
                />
              </span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}