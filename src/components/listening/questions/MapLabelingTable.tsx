import { cn } from '@/lib/utils';
import { Compass } from 'lucide-react';

interface MapLabel {
  id: string; // e.g., "A", "B", "C"
  text: string; // e.g., "Library", "Cafeteria"
}

interface Question {
  question_number: number;
  question_text: string;
  correct_answer: string;
}

interface MapLabelingTableProps {
  mapDescription?: string;
  mapLabels: MapLabel[];
  questions: Question[];
  answers: Record<number, string>;
  onAnswerChange: (questionNumber: number, answer: string) => void;
  onQuestionFocus?: (questionNumber: number) => void;
  fontSize?: number;
  imageUrl?: string;
}

/**
 * MapLabelingTable - IELTS Official format Map Labeling
 * Shows map on left with labeled locations (A-H), and a table on right
 * where users select radio buttons to match questions to letters
 */
export function MapLabelingTable({
  mapDescription,
  mapLabels,
  questions,
  answers,
  onAnswerChange,
  onQuestionFocus,
  fontSize = 14,
  imageUrl,
}: MapLabelingTableProps) {
  // Get unique letters from labels (sorted)
  const letterColumns = [...mapLabels].sort((a, b) => a.id.localeCompare(b.id)).map(l => l.id);

  // Handle selecting an answer - converts letter ID (A, B, C) to location name
  const handleSelectAnswer = (questionNumber: number, letterId: string) => {
    const label = mapLabels.find(l => l.id === letterId);
    const locationName = label?.text || letterId;
    onAnswerChange(questionNumber, locationName);
    onQuestionFocus?.(questionNumber);
  };

  // Get currently selected letter for a question (reverse lookup)
  const getSelectedLetter = (questionNumber: number): string | null => {
    const answer = answers[questionNumber];
    if (!answer) return null;
    // Find the letter ID that matches this location name
    const label = mapLabels.find(l => l.text === answer);
    return label?.id || null;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
      {/* Left: Map with labeled locations */}
      <div className="flex-shrink-0 w-full lg:w-auto lg:max-w-[400px]">
        <div className="relative border border-border rounded-lg overflow-hidden bg-muted/30">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt="Map diagram for labeling"
                className="w-full h-auto max-h-[400px] object-contain"
                draggable={false}
              />
              {/* Compass overlay for generated maps */}
              <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm p-1 rounded-full border border-border">
                <Compass className="w-6 h-6 text-foreground" />
              </div>
            </>
          ) : (
            /* Text-based map representation when no image available */
            <div className="p-4 min-h-[280px]">
              {/* Map Grid representation */}
              <div className="relative bg-muted/50 rounded border border-border p-4 min-h-[240px]">
                {/* Compass */}
                <div className="absolute top-2 right-2 flex flex-col items-center">
                  <span className="text-xs font-medium text-foreground">N</span>
                  <Compass className="w-8 h-8 text-foreground" />
                </div>
                
                {/* Map description */}
                {mapDescription && (
                  <div className="mb-4 text-xs text-muted-foreground italic">
                    {mapDescription}
                  </div>
                )}
                
                {/* Location labels arranged in a visual grid pattern */}
                <div className="grid grid-cols-3 gap-3 mt-8">
                  {mapLabels.map((label) => (
                    <div 
                      key={label.id}
                      className="flex items-center justify-center bg-background border border-border rounded p-2 text-center min-h-[50px]"
                    >
                      <div className="flex flex-col items-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 border-foreground text-xs font-bold mb-1">
                          {label.id}
                        </span>
                        <span className="text-xs text-foreground" style={{ fontSize: `${Math.max(fontSize - 2, 11)}px` }}>
                          {label.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Selection Table */}
      <div className="w-full lg:flex-1 overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ fontSize: `${fontSize}px` }}>
          <thead>
            <tr>
              {/* Empty header cell for question numbers */}
              <th className="border border-border bg-muted/50 px-3 py-2 text-left min-w-[150px]"></th>
              {/* Letter columns */}
              {letterColumns.map((letter) => (
                <th 
                  key={letter} 
                  className="border border-border bg-muted/50 px-3 py-2 text-center font-bold w-10"
                >
                  {letter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questions.map((question) => {
              const selectedLetter = getSelectedLetter(question.question_number);
              const isFirstQuestion = question.question_number === questions[0]?.question_number;
              const hasAnyAnswer = Object.values(answers).some(a => a && a !== '');
              const shouldHighlight = !hasAnyAnswer && isFirstQuestion;
              
              return (
                <tr 
                  key={question.question_number}
                  id={`question-${question.question_number}`}
                  className="hover:bg-muted/30 transition-colors"
                >
                  {/* Question cell - number + location name being asked */}
                  <td className="border border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center justify-center min-w-[24px] h-6 text-xs font-bold rounded",
                        shouldHighlight 
                          ? "border-2 border-[hsl(var(--ielts-drag-hover))] text-foreground px-1"
                          : "text-foreground"
                      )}>
                        {question.question_number}
                      </span>
                      <span className="text-foreground">{question.question_text}</span>
                    </div>
                  </td>
                  
                  {/* Radio button cells for each letter */}
                  {letterColumns.map((letter) => (
                    <td 
                      key={letter} 
                      className="border border-border px-3 py-2 text-center"
                    >
                      <label className="cursor-pointer flex items-center justify-center">
                        <input
                          type="radio"
                          name={`map-q-${question.question_number}`}
                          checked={selectedLetter === letter}
                          onChange={() => handleSelectAnswer(question.question_number, letter)}
                          className={cn(
                            "w-4 h-4 cursor-pointer accent-[hsl(var(--primary))]",
                            "focus:ring-2 focus:ring-[hsl(var(--ielts-drag-hover))]"
                          )}
                        />
                      </label>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
