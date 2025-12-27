import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Plus, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RichTextEditor } from './RichTextEditor';
import { MultipleAnswersInput } from './MultipleAnswersInput';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MultiSelectAnswerInput } from './MultiSelectAnswerInput';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ReadingTableEditor, ReadingTableEditorData } from './ReadingTableEditor';
import { QuestionGroupPreview } from './QuestionGroupPreview';
import { NoteStyleCategoryEditor, NoteCategory } from './NoteStyleCategoryEditor';
import { MapLabelingEditor } from './MapLabelingEditor';

interface Question {
  id?: string;
  question_number: number;
  question_text: string;
  options: string[];
  correct_answer: string;
  option_format: string;
  heading?: string;
  // For MCQ Multiple sub-groups: defines the range this question represents
  sub_group_start?: number;
  sub_group_end?: number;
}

interface QuestionGroup {
  id?: string;
  passage_id?: string;
  question_type: string;
  instruction: string;
  start_question: number;
  end_question: number;
  options: string[];
  questions: Question[];
  max_answers?: number;
  option_format?: string; // A, 1, i for group-level option format
  show_option_labels?: boolean; // Whether to show A., B., etc. in test taker view
  // Fill in Gap display options
  display_as_paragraph?: boolean;
  show_bullets?: boolean;
  show_headings?: boolean;
  use_dropdown?: boolean;
  // Title options for fill-in-gap
  group_title?: string;
  title_centered?: boolean;
  title_colored?: boolean;
  // Note-style layout for fill-in-gap
  note_style_enabled?: boolean;
  note_categories?: NoteCategory[];
  // Table completion data
  table_data?: ReadingTableEditorData;
  // Matching Grid options
  use_letter_headings?: boolean; // Show A,B,C as headings with legend below
  options_title?: string; // Title for options legend (e.g., "List of political units")
  // Map Labeling options (stored in options as object)
  map_labeling_options?: {
    imageUrl: string | null;
    dropZones: { questionNumber: number; xPercent: number; yPercent: number; }[];
    options: string[];
    correctAnswers: Record<number, string>;
    maxImageWidth: number | null;
    maxImageHeight: number | null;
  };
}

interface QuestionGroupEditorProps {
  testId: string;
  passageIndex: number;
  paragraphLabels?: string[]; // Only paragraphs with is_heading=true
  allParagraphLabels?: string[]; // All paragraph labels
  questionGroups: QuestionGroup[];
  onUpdate: (groups: QuestionGroup[]) => void;
  questionTypes: { value: string; label: string }[];
  globalQuestionOffset?: number; // Total questions from previous passages
}

const OPTION_FORMATS = [
  { value: 'A', label: 'A, B, C, D...' },
  { value: '1', label: '1, 2, 3, 4...' },
  { value: 'i', label: 'i, ii, iii, iv...' },
];

const TRUE_FALSE_OPTIONS = ['TRUE', 'FALSE', 'NOT GIVEN'];
const YES_NO_OPTIONS = ['YES', 'NO', 'NOT GIVEN'];

export function QuestionGroupEditor({
  testId,
  passageIndex,
  paragraphLabels = [],
  allParagraphLabels = [],
  questionGroups,
  onUpdate,
  questionTypes,
  globalQuestionOffset = 0
}: QuestionGroupEditorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  const toggleGroup = (index: number) => {
    setExpandedGroups(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const addGroup = () => {
    // Calculate last question: either from current passage groups or from global offset
    const lastQuestionInPassage = questionGroups.reduce((max, g) => Math.max(max, g.end_question), 0);
    const lastQuestion = Math.max(lastQuestionInPassage, globalQuestionOffset);
    const newGroup: QuestionGroup = {
      question_type: 'TRUE_FALSE_NOT_GIVEN',
      instruction: '',
      start_question: lastQuestion + 1,
      end_question: lastQuestion + 5,
      options: [],
      questions: [],
      max_answers: 2
    };
    
    // Auto-generate questions
    const questions: Question[] = [];
    for (let i = newGroup.start_question; i <= newGroup.end_question; i++) {
      questions.push({
        question_number: i,
        question_text: '',
        options: [],
        correct_answer: '',
        option_format: 'A'
      });
    }
    newGroup.questions = questions;
    
    onUpdate([...questionGroups, newGroup]);
    setExpandedGroups(prev => ({ ...prev, [questionGroups.length]: true }));
  };

  const updateGroup = (index: number, updates: Partial<QuestionGroup>) => {
    const newGroups = [...questionGroups];
    newGroups[index] = { ...newGroups[index], ...updates };
    
    // If question range changed, regenerate questions
    if (updates.start_question !== undefined || updates.end_question !== undefined) {
      const start = updates.start_question ?? newGroups[index].start_question;
      const end = updates.end_question ?? newGroups[index].end_question;
      const existingQuestions = newGroups[index].questions || [];
      
      const questions: Question[] = [];
      for (let i = start; i <= end; i++) {
        const positionIndex = i - start;
        // Use existing question at same position if available, update its question_number
        const existingAtPosition = existingQuestions[positionIndex];
        if (existingAtPosition) {
          questions.push({
            ...existingAtPosition,
            question_number: i // Ensure question_number matches the new range
          });
        } else {
          questions.push({
            question_number: i,
            question_text: '',
            options: [],
            correct_answer: '',
            option_format: 'A'
          });
        }
      }
      newGroups[index].questions = questions;
    }
    
    onUpdate(newGroups);
  };

  const removeGroup = (index: number) => {
    onUpdate(questionGroups.filter((_, i) => i !== index));
  };

  const updateQuestion = (groupIndex: number, questionIndex: number, updates: Partial<Question>) => {
    const newGroups = [...questionGroups];
    if (!newGroups[groupIndex].questions) {
      newGroups[groupIndex].questions = [];
    }
    newGroups[groupIndex].questions[questionIndex] = {
      ...newGroups[groupIndex].questions[questionIndex],
      ...updates
    };
    onUpdate(newGroups);
  };

  const addOption = (groupIndex: number) => {
    const newGroups = [...questionGroups];
    if (!newGroups[groupIndex].options) {
      newGroups[groupIndex].options = [];
    }
    newGroups[groupIndex].options.push('');
    onUpdate(newGroups);
  };

  const updateOption = (groupIndex: number, optionIndex: number, value: string) => {
    const newGroups = [...questionGroups];
    if (!newGroups[groupIndex].options) {
      newGroups[groupIndex].options = [];
    }
    newGroups[groupIndex].options[optionIndex] = value;
    onUpdate(newGroups);
  };

  const removeOption = (groupIndex: number, optionIndex: number) => {
    const newGroups = [...questionGroups];
    const currentOptions = newGroups[groupIndex].options || [];
    newGroups[groupIndex].options = currentOptions.filter((_, i) => i !== optionIndex);
    onUpdate(newGroups);
  };

  const addQuestionOption = (groupIndex: number, questionIndex: number) => {
    const newGroups = [...questionGroups];
    if (!newGroups[groupIndex].questions[questionIndex].options) {
      newGroups[groupIndex].questions[questionIndex].options = [];
    }
    newGroups[groupIndex].questions[questionIndex].options.push('');
    onUpdate(newGroups);
  };

  const updateQuestionOption = (groupIndex: number, questionIndex: number, optionIndex: number, value: string) => {
    const newGroups = [...questionGroups];
    newGroups[groupIndex].questions[questionIndex].options[optionIndex] = value;
    onUpdate(newGroups);
  };

  const removeQuestionOption = (groupIndex: number, questionIndex: number, optionIndex: number) => {
    const newGroups = [...questionGroups];
    newGroups[groupIndex].questions[questionIndex].options = 
      newGroups[groupIndex].questions[questionIndex].options.filter((_, i) => i !== optionIndex);
    onUpdate(newGroups);
  };

  const getOptionLabel = (index: number, format: string) => {
    if (format === '1') return String(index + 1);
    if (format === 'i') {
      const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii'];
      return romanNumerals[index] || String(index + 1);
    }
    return String.fromCharCode(65 + index);
  };

  const needsGroupOptions = (type: string) => {
    return ['MATCHING_HEADINGS', 'MATCHING_SENTENCE_ENDINGS', 'MATCHING_INFORMATION', 'TABLE_SELECTION', 'MATCHING_FEATURES', 'MULTIPLE_CHOICE_MULTIPLE'].includes(type);
  };

  const isTableSelection = (type: string) => type === 'TABLE_SELECTION';
  const isMCQMultiple = (type: string) => type === 'MULTIPLE_CHOICE_MULTIPLE';

  const needsQuestionOptions = (type: string) => {
    // Only single-select MCQ needs per-question options
    return type === 'MULTIPLE_CHOICE';
  };

  const isTrueFalseType = (type: string) => {
    return ['TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN'].includes(type);
  };

  const isMatchingHeadings = (type: string) => type === 'MATCHING_HEADINGS';
  const isMatchingSentenceEndings = (type: string) => type === 'MATCHING_SENTENCE_ENDINGS';
  const isMatchingFeatures = (type: string) => type === 'MATCHING_FEATURES';
  const isTableCompletion = (type: string) => type === 'TABLE_COMPLETION';

  const isFillInBlank = (type: string) => {
    return ['FILL_IN_BLANK', 'FLOWCHART_COMPLETION'].includes(type);
  };

  const isMapLabeling = (type: string) => type === 'MAP_LABELING';

  const getTrueFalseOptions = (type: string) => {
    return type === 'YES_NO_NOT_GIVEN' ? YES_NO_OPTIONS : TRUE_FALSE_OPTIONS;
  };

  // Use allParagraphLabels for matching headings if available, otherwise use paragraphLabels
  const labelsForMatching = allParagraphLabels.length > 0 ? allParagraphLabels : paragraphLabels;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Question Groups for Passage {passageIndex + 1}</h3>
        <Button onClick={addGroup} variant="outline" size="sm">
          <Plus size={16} className="mr-1" />
          Add Question Group
        </Button>
      </div>

      {questionGroups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No question groups yet. Click "Add Question Group" to start.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questionGroups.map((group, groupIndex) => (
            <Collapsible 
              key={groupIndex} 
              open={expandedGroups[groupIndex] ?? false}
              onOpenChange={() => toggleGroup(groupIndex)}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between py-3">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center gap-3 flex-1 text-left">
                      {expandedGroups[groupIndex] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      <CardTitle className="text-base">
                        Questions {group.start_question}-{group.end_question}: {
                          questionTypes.find(t => t.value === group.question_type)?.label || group.question_type
                        }
                      </CardTitle>
                    </button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    <QuestionGroupPreview 
                      group={group} 
                      paragraphLabels={labelsForMatching}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGroup(groupIndex);
                      }}
                    >
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0">
                    {/* Group Settings */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <Select
                          value={group.question_type}
                          onValueChange={(value) => {
                            // Provide sane defaults when switching types so test-taker UI renders correctly.
                            const next: Partial<QuestionGroup> = { question_type: value };

                            // Matching Grid needs column labels; default to A–E if missing.
                            if (value === 'TABLE_SELECTION') {
                              const hasColumns = Array.isArray(group.options) && group.options.filter(Boolean).length > 0;
                              if (!hasColumns) {
                                next.options = ['A', 'B', 'C', 'D', 'E'];
                              }
                            }

                            updateGroup(groupIndex, next);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {questionTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Start Question</Label>
                        <Input
                          type="number"
                          value={group.start_question}
                          onChange={(e) => updateGroup(groupIndex, { start_question: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>End Question</Label>
                        <Input
                          type="number"
                          value={group.end_question}
                          onChange={(e) => updateGroup(groupIndex, { end_question: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    {/* MCQ Multiple - Simplified UI like Listening section */}
                    {group.question_type === 'MULTIPLE_CHOICE_MULTIPLE' && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          Number of Answers to Select
                          <Tooltip>
                            <TooltipTrigger>
                              <Info size={14} className="text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>This defines how many options the test taker can select for this question. The 'End Question' will automatically adjust based on this value.</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={(group.options || []).length || 10}
                          value={group.max_answers || 2}
                          onChange={(e) => {
                            const numAnswers = parseInt(e.target.value) || 2;
                            updateGroup(groupIndex, { 
                              max_answers: numAnswers,
                              end_question: group.start_question + numAnswers - 1
                            });
                          }}
                          className="w-24"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Instruction/Description (supports formatting: **bold**, *italic*, ## heading)</Label>
                      <RichTextEditor
                        value={group.instruction || ''}
                        onChange={(value) => updateGroup(groupIndex, { instruction: value })}
                        placeholder="e.g., Do the following statements agree with the information given in the text? Use **bold** for emphasis."
                        rows={3}
                      />
                    </div>

                    {/* Matching Headings - special UI */}
                    {isMatchingHeadings(group.question_type) && (
                      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold flex items-center gap-2">
                            Heading Options (i, ii, iii...)
                            <Badge variant="secondary">{(group.options || []).length} headings</Badge>
                          </Label>
                          <Button variant="outline" size="sm" onClick={() => addOption(groupIndex)}>
                            <Plus size={14} className="mr-1" />
                            Add Heading
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          These headings will be draggable in the test taker view. Only paragraphs marked with "Has Heading Match" in the Passages tab will show drop zones.
                        </p>
                        {labelsForMatching.length === 0 && (
                          <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                            ⚠️ No paragraphs are marked for heading matching. Go to Passages tab and enable "Has Heading Match" for relevant paragraphs.
                          </div>
                        )}
                        <div className="space-y-2">
                          {(group.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="w-8 text-sm font-bold text-primary">
                                {getOptionLabel(optIndex, 'i')}
                              </span>
                              <Input
                                value={option}
                                onChange={(e) => updateOption(groupIndex, optIndex, e.target.value)}
                                placeholder={`Heading ${getOptionLabel(optIndex, 'i')}`}
                              />
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeOption(groupIndex, optIndex)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Group-level Options and Single Question (for MCQ Multiple) - Matching Listening exactly */}
                    {isMCQMultiple(group.question_type) && (
                      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                        {/* Group Options */}
                        <div className="flex items-center justify-between">
                          <Label className="text-base font-semibold flex items-center gap-2">
                            Options for Questions
                            <Badge variant="secondary">{(group.options || []).length} options</Badge>
                          </Label>
                          <div className="flex items-center gap-2">
                            <Select
                              value={group.option_format || 'A'}
                              onValueChange={(value) => updateGroup(groupIndex, { option_format: value })}
                            >
                              <SelectTrigger className="w-24 h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {OPTION_FORMATS.map(f => (
                                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => addOption(groupIndex)}>
                              <Plus size={14} className="mr-1" />
                              Add Option
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          These options will appear in a box above the questions, and in the dropdown for each question.
                        </p>
                        <div className="space-y-2">
                          {(group.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="w-8 text-sm font-bold text-primary">
                                {getOptionLabel(optIndex, group.option_format || 'A')}
                              </span>
                              <Input
                                value={option}
                                onChange={(e) => updateOption(groupIndex, optIndex, e.target.value)}
                                placeholder={`Option ${getOptionLabel(optIndex, group.option_format || 'A')}`}
                              />
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeOption(groupIndex, optIndex)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Single Question for the entire group range - like Listening */}
                        <div className="space-y-3 mt-4 pt-4 border-t">
                          <Label className="text-base font-semibold">Question {group.start_question}-{group.end_question}</Label>
                          <div className="border rounded-lg p-4 bg-background">
                            <div className="space-y-3">
                              {/* Question Text */}
                              <div className="space-y-2">
                                <Label className="text-xs">Question Text</Label>
                                <RichTextEditor
                                  value={(group.questions && group.questions[0]?.question_text) || ''}
                                  onChange={(value) => {
                                    const newGroups = [...questionGroups];
                                    if (!newGroups[groupIndex].questions || newGroups[groupIndex].questions.length === 0) {
                                      newGroups[groupIndex].questions = [{
                                        question_number: group.start_question,
                                        question_text: value,
                                        options: [],
                                        correct_answer: '',
                                        option_format: group.option_format || 'A',
                                      }];
                                    } else {
                                      newGroups[groupIndex].questions[0].question_text = value;
                                    }
                                    onUpdate(newGroups);
                                  }}
                                  placeholder="e.g., 'Which TWO of the following are mentioned as features of the new design?'"
                                  rows={2}
                                />
                              </div>
                              {/* Correct Answer(s) */}
                              {(group.options || []).length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs flex items-center gap-2">
                                    Correct Answer(s)
                                    <Badge variant="secondary" className="text-xs">
                                      Select {group.max_answers || 2}
                                    </Badge>
                                  </Label>
                                  <MultiSelectAnswerInput
                                    value={(group.questions && group.questions[0]?.correct_answer) || ''}
                                    onChange={(value) => {
                                      const newGroups = [...questionGroups];
                                      if (!newGroups[groupIndex].questions || newGroups[groupIndex].questions.length === 0) {
                                        newGroups[groupIndex].questions = [{
                                          question_number: group.start_question,
                                          question_text: '',
                                          options: [],
                                          correct_answer: value,
                                          option_format: group.option_format || 'A',
                                        }];
                                      } else {
                                        newGroups[groupIndex].questions[0].correct_answer = value;
                                      }
                                      onUpdate(newGroups);
                                    }}
                                    options={group.options || []}
                                    optionFormat={group.option_format || 'A'}
                                    maxSelections={group.max_answers || 2}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Group-level Options (for other matching types, including Matching Sentence Endings and Table Selection) */}
                    {needsGroupOptions(group.question_type) && !isMatchingHeadings(group.question_type) && !isMCQMultiple(group.question_type) && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>
                            {isMatchingSentenceEndings(group.question_type)
                              ? 'Ending Options (A, B, C...)'
                              : isTableSelection(group.question_type)
                                ? 'Column Options (e.g., A, B, C, D, E)'
                                : 'Options (shared for all questions)'}
                          </Label>
                          <div className="flex items-center gap-2">
                            {isTableSelection(group.question_type) && (
                              <Select
                                onValueChange={(value) => {
                                  // Auto-generate options based on selection
                                  const count = parseInt(value);
                                  const newOptions: string[] = [];
                                  for (let i = 0; i < count; i++) {
                                    newOptions.push(String.fromCharCode(65 + i)); // A, B, C, D, E...
                                  }
                                  updateGroup(groupIndex, { options: newOptions });
                                }}
                              >
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue placeholder="Auto-generate" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3">A to C (3)</SelectItem>
                                  <SelectItem value="4">A to D (4)</SelectItem>
                                  <SelectItem value="5">A to E (5)</SelectItem>
                                  <SelectItem value="6">A to F (6)</SelectItem>
                                  <SelectItem value="7">A to G (7)</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <Button variant="outline" size="sm" onClick={() => addOption(groupIndex)}>
                              <Plus size={14} className="mr-1" />
                              Add Option
                            </Button>
                          </div>
                        </div>
                        {isTableSelection(group.question_type) && (
                          <p className="text-xs text-muted-foreground">
                            These options will appear as column headers in the test taker's table view. Questions will use these as answer choices.
                          </p>
                        )}
                        <div className="space-y-2">
                          {(group.options || []).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="w-8 text-sm font-medium text-muted-foreground">
                                {getOptionLabel(optIndex, 'A')}
                              </span>
                              <Input
                                value={option}
                                onChange={(e) => updateOption(groupIndex, optIndex, e.target.value)}
                                placeholder={isTableSelection(group.question_type) ? getOptionLabel(optIndex, 'A') : `Option ${getOptionLabel(optIndex, 'A')}`}
                              />
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeOption(groupIndex, optIndex)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Matching Grid Display Options - TABLE_SELECTION only */}
                        {group.question_type === 'TABLE_SELECTION' && (
                          <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg">
                            <Label className="text-base font-semibold">Grid Display Options</Label>
                            
                            <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                              <div>
                                <Label className="font-medium">Use Letter Headings</Label>
                                <p className="text-xs text-muted-foreground">Show A, B, C in table headers with full options listed below</p>
                              </div>
                              <Switch
                                checked={group.use_letter_headings || false}
                                onCheckedChange={(checked) => updateGroup(groupIndex, { use_letter_headings: checked })}
                              />
                            </div>

                            {group.use_letter_headings && (
                              <div className="space-y-2">
                                <Label className="font-medium">Options Title</Label>
                                <p className="text-xs text-muted-foreground">
                                  Title shown above the options legend (e.g., "List of political units")
                                </p>
                                <Input
                                  value={group.options_title || ''}
                                  onChange={(e) => updateGroup(groupIndex, { options_title: e.target.value })}
                                  placeholder="List of Options"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Matching Information Display Options */}
                        {group.question_type === 'MATCHING_INFORMATION' && (
                          <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg">
                            <Label className="text-base font-semibold">Display Options</Label>
                            <div className="space-y-2">
                              <Label className="font-medium">Options List Title</Label>
                              <p className="text-xs text-muted-foreground">
                                Title shown above the options list (e.g., "List of Information", "List of Sections")
                              </p>
                              <Input
                                value={group.options_title || ''}
                                onChange={(e) => updateGroup(groupIndex, { options_title: e.target.value })}
                                placeholder="List of Information"
                              />
                            </div>
                          </div>
                        )}

                        {/* Matching Features Display Options */}
                        {group.question_type === 'MATCHING_FEATURES' && (
                          <div className="space-y-4 mt-4 p-4 bg-muted/30 rounded-lg">
                            <Label className="text-base font-semibold">Display Options</Label>
                            <div className="space-y-2">
                              <Label className="font-medium">Options List Title</Label>
                              <p className="text-xs text-muted-foreground">
                                Title shown above the options list (e.g., "List of People", "List of Researchers")
                              </p>
                              <Input
                                value={group.options_title || ''}
                                onChange={(e) => updateGroup(groupIndex, { options_title: e.target.value })}
                                placeholder="List of People"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Fill in Gap Options */}
                    {group.question_type === 'FILL_IN_BLANK' && (
                      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                        <Label className="text-base font-semibold">Display Options</Label>
                        
                        {/* Group Title */}
                        <div className="space-y-2">
                          <Label className="font-medium">Group Title (optional)</Label>
                          <p className="text-xs text-muted-foreground">
                            A main title shown above all questions (e.g., "Marie Curie's research on radioactivity")
                          </p>
                          <Input
                            value={group.group_title || ''}
                            onChange={(e) => updateGroup(groupIndex, { group_title: e.target.value })}
                            placeholder="Enter group title..."
                          />
                          
                          {/* Title Styling Options */}
                          {group.group_title && (
                            <div className="flex gap-4 mt-2">
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`title-centered-${groupIndex}`}
                                  checked={group.title_centered || false}
                                  onCheckedChange={(checked) => updateGroup(groupIndex, { title_centered: checked })}
                                />
                                <Label htmlFor={`title-centered-${groupIndex}`} className="text-sm">Centered</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  id={`title-colored-${groupIndex}`}
                                  checked={group.title_colored || false}
                                  onCheckedChange={(checked) => updateGroup(groupIndex, { title_colored: checked })}
                                />
                                <Label htmlFor={`title-colored-${groupIndex}`} className="text-sm">Primary Color</Label>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Display Mode */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                            <div>
                              <Label className="font-medium">Display as Paragraph</Label>
                              <p className="text-xs text-muted-foreground">Show all questions in one paragraph vs separate lines</p>
                            </div>
                            <Switch
                              checked={group.display_as_paragraph || false}
                              onCheckedChange={(checked) => updateGroup(groupIndex, { display_as_paragraph: checked })}
                            />
                          </div>

                          {/* Bullet Points */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                            <div>
                              <Label className="font-medium">Show Bullet Points</Label>
                              <p className="text-xs text-muted-foreground">Add bullet points before each question</p>
                            </div>
                            <Switch
                              checked={group.show_bullets || false}
                              onCheckedChange={(checked) => updateGroup(groupIndex, { show_bullets: checked })}
                            />
                          </div>

                          {/* Show Headings */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                            <div>
                              <Label className="font-medium">With Headings</Label>
                              <p className="text-xs text-muted-foreground">Add bold sub-headings before questions</p>
                            </div>
                            <Switch
                              checked={group.show_headings || false}
                              onCheckedChange={(checked) => updateGroup(groupIndex, { show_headings: checked })}
                            />
                          </div>

                          {/* Input Type */}
                          <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
                            <div>
                              <Label className="font-medium">Use Dropdown</Label>
                              <p className="text-xs text-muted-foreground">Show options as dropdown instead of text input</p>
                            </div>
                            <Switch
                              checked={group.use_dropdown || false}
                              onCheckedChange={(checked) => updateGroup(groupIndex, { use_dropdown: checked })}
                            />
                          </div>
                        </div>

                        {/* Word Bank / Options (only if using dropdown) */}
                        {group.use_dropdown && (
                          <div className="space-y-2 mt-4">
                            <div className="flex items-center justify-between">
                              <Label className="flex items-center gap-2">
                                Word Bank / Options
                                <Badge variant="secondary">{(group.options || []).length} words</Badge>
                              </Label>
                              <Button variant="outline" size="sm" onClick={() => addOption(groupIndex)}>
                                <Plus size={14} className="mr-1" />
                                Add Word
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              These words will appear in the dropdown for test takers to select from.
                            </p>
                            <div className="space-y-2">
                              {(group.options || []).map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <span className="w-6 text-sm font-medium text-muted-foreground">
                                    {optIndex + 1}.
                                  </span>
                                  <Input
                                    value={option}
                                    onChange={(e) => updateOption(groupIndex, optIndex, e.target.value)}
                                    placeholder={`Word ${optIndex + 1}`}
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => removeOption(groupIndex, optIndex)}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Note-Style Layout Toggle */}
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-background mt-4">
                          <div>
                            <Label className="font-medium flex items-center gap-2">
                              Note-Style Layout (Official IELTS Format)
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info size={14} className="text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p>Displays questions in two-column format: category labels on the left, items with blanks on the right. Common in official IELTS tests.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </Label>
                            <p className="text-xs text-muted-foreground">Use structured note format with categories</p>
                          </div>
                          <Switch
                            checked={group.note_style_enabled || false}
                            onCheckedChange={(checked) => {
                              updateGroup(groupIndex, {
                                note_style_enabled: checked,
                                ...(checked && !group.note_categories ? { note_categories: [] } : {})
                              });
                            }}
                          />
                        </div>

                        {/* Note-Style Category Editor */}
                        {group.note_style_enabled && (
                          <div className="p-4 bg-muted/20 rounded-lg border mt-4">
                            <NoteStyleCategoryEditor
                              categories={group.note_categories || []}
                              onChange={(newCategories: NoteCategory[]) => {
                                // Count total questions from categories
                                const totalQuestions = newCategories.reduce(
                                  (sum, cat) => sum + cat.items.filter(item => item.hasBlank).length,
                                  0
                                );

                                // Generate questions from note categories
                                let qNum = group.start_question;
                                const newQuestions: Question[] = [];
                                newCategories.forEach((cat) => {
                                  cat.items.forEach((item) => {
                                    if (item.hasBlank) {
                                      newQuestions.push({
                                        question_number: qNum,
                                        question_text: `${item.text || ''}___${item.suffixText || ''}`,
                                        correct_answer: '',
                                        options: [],
                                        option_format: 'A',
                                        heading: cat.label,
                                      });
                                      qNum++;
                                    }
                                  });
                                });

                                const newEndQuestion = totalQuestions > 0 
                                  ? group.start_question + totalQuestions - 1 
                                  : group.end_question;

                                updateGroup(groupIndex, {
                                  note_categories: newCategories,
                                  end_question: newEndQuestion,
                                  questions: newQuestions.length > 0 ? newQuestions : group.questions
                                });
                              }}
                              startQuestionNumber={group.start_question}
                            />

                            {/* Correct Answers Section for Note-Style */}
                            {(group.note_categories || []).length > 0 && (
                              <div className="mt-4 p-4 bg-background rounded-lg border">
                                <Label className="text-sm font-medium mb-3 block">Correct Answers</Label>
                                <div className="grid grid-cols-2 gap-3">
                                  {(() => {
                                    const answerFields: React.ReactNode[] = [];
                                    let questionNum = group.start_question;
                                    
                                    (group.note_categories || []).forEach((cat, catIdx) => {
                                      cat.items.forEach((item, itemIdx) => {
                                        if (item.hasBlank) {
                                          const currentQNum = questionNum;
                                          const question = group.questions.find(q => q.question_number === currentQNum);
                                          
                                          answerFields.push(
                                            <div key={`${catIdx}-${itemIdx}`} className="flex items-center gap-2">
                                              <span className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                                {currentQNum}
                                              </span>
                                              <MultipleAnswersInput
                                                value={question?.correct_answer || ''}
                                                onChange={(value) => {
                                                  const qIdx = group.questions.findIndex(q => q.question_number === currentQNum);
                                                  if (qIdx >= 0) {
                                                    updateQuestion(groupIndex, qIdx, { correct_answer: value });
                                                  }
                                                }}
                                                questionType="FILL_IN_BLANK"
                                                placeholder="Enter correct answer(s) separated by /"
                                              />
                                            </div>
                                          );
                                          questionNum++;
                                        }
                                      });
                                    });
                                    
                                    return answerFields;
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}


                    {/* Table Completion Editor */}
                    {isTableCompletion(group.question_type) && (
                      <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                        <Label className="text-base font-semibold">Table Editor</Label>
                        <p className="text-sm text-muted-foreground">
                          Design your table below. Mark cells as questions and provide correct answers. The first row will be treated as headers.
                        </p>
                        <ReadingTableEditor
                          value={group.table_data || { rows: [], heading: '', headingAlignment: 'left' }}
                          onChange={(data) => updateGroup(groupIndex, { table_data: data })}
                          startQuestionNumber={group.start_question}
                          endQuestionNumber={group.end_question}
                        />
                      </div>
                    )}

                    {/* Map Labeling Editor */}
                    {isMapLabeling(group.question_type) && (
                      <MapLabelingEditor
                        testId={testId}
                        imageUrl={group.map_labeling_options?.imageUrl || null}
                        dropZones={group.map_labeling_options?.dropZones || []}
                        options={group.map_labeling_options?.options || []}
                        correctAnswers={group.map_labeling_options?.correctAnswers || {}}
                        maxImageWidth={group.map_labeling_options?.maxImageWidth || null}
                        maxImageHeight={group.map_labeling_options?.maxImageHeight || null}
                        startQuestion={group.start_question}
                        endQuestion={group.end_question}
                        onImageChange={(url) => {
                          const baseOptions = group.map_labeling_options || { dropZones: [], options: [], correctAnswers: {}, maxImageWidth: 450, maxImageHeight: 400 };
                          updateGroup(groupIndex, { map_labeling_options: { ...baseOptions, imageUrl: url } });
                        }}
                        onDropZonesChange={(zones) => {
                          const baseOptions = group.map_labeling_options || { imageUrl: null, options: [], correctAnswers: {}, maxImageWidth: 450, maxImageHeight: 400 };
                          updateGroup(groupIndex, { map_labeling_options: { ...baseOptions, dropZones: zones } });
                        }}
                        onOptionsChange={(opts) => {
                          const baseOptions = group.map_labeling_options || { imageUrl: null, dropZones: [], correctAnswers: {}, maxImageWidth: 450, maxImageHeight: 400 };
                          updateGroup(groupIndex, { map_labeling_options: { ...baseOptions, options: opts } });
                        }}
                        onCorrectAnswersChange={(answers) => {
                          const baseOptions = group.map_labeling_options || { imageUrl: null, dropZones: [], options: [], maxImageWidth: 450, maxImageHeight: 400 };
                          updateGroup(groupIndex, { map_labeling_options: { ...baseOptions, correctAnswers: answers } });
                        }}
                        onMaxImageWidthChange={(width) => {
                          const baseOptions = group.map_labeling_options || { imageUrl: null, dropZones: [], options: [], correctAnswers: {}, maxImageHeight: 400 };
                          updateGroup(groupIndex, { map_labeling_options: { ...baseOptions, maxImageWidth: width } });
                        }}
                        onMaxImageHeightChange={(height) => {
                          const baseOptions = group.map_labeling_options || { imageUrl: null, dropZones: [], options: [], correctAnswers: {}, maxImageWidth: 450 };
                          updateGroup(groupIndex, { map_labeling_options: { ...baseOptions, maxImageHeight: height } });
                        }}
                      />
                    )}

                    {/* Individual Questions - Hide for MCQ Multiple, Table Completion, Map Labeling, and Note-Style Fill-in-Blank since they're handled at group level */}
                    {!isMCQMultiple(group.question_type) && !isTableCompletion(group.question_type) && !isMapLabeling(group.question_type) && !(isFillInBlank(group.question_type) && group.note_style_enabled) && (
                    <div className="space-y-3 mt-4">
                      <Label className="text-base font-semibold">Questions</Label>
                      {(group.questions || []).map((question, qIndex) => (
                        <div key={qIndex} className="border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-start gap-3">
                            <span className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {question.question_number}
                            </span>
                            <div className="flex-1 space-y-3">
                              {/* Question Text */}
                              {isMatchingHeadings(group.question_type) ? (
                                <div className="space-y-2">
                                  <Label className="text-xs">Paragraph Label</Label>
                                  <Select
                                    value={question.question_text || ''}
                                    onValueChange={(value) => updateQuestion(groupIndex, qIndex, { question_text: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select paragraph" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {labelsForMatching.map(label => (
                                        <SelectItem key={label} value={label}>
                                          Paragraph {label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : isMatchingSentenceEndings(group.question_type) ? (
                                <div className="space-y-2">
                                  <Label className="text-xs">Starting Sentence</Label>
                                  <RichTextEditor
                                    value={question.question_text || ''}
                                    onChange={(value) => updateQuestion(groupIndex, qIndex, { question_text: value })}
                                    placeholder="Enter the starting sentence..."
                                    rows={2}
                                  />
                                </div>
                              ) : isFillInBlank(group.question_type) ? (
                                <div className="space-y-3">
                                  {/* Sub-heading field when show_headings is enabled */}
                                  {group.show_headings && (
                                    <div className="space-y-2">
                                      <Label className="text-xs">Sub-heading (optional)</Label>
                                      <Input
                                        value={question.heading || ''}
                                        onChange={(e) => updateQuestion(groupIndex, qIndex, { heading: e.target.value })}
                                        placeholder="e.g., Section A, The Background, etc."
                                        className="font-semibold"
                                      />
                                    </div>
                                  )}
                                  <div className="space-y-2">
                                    <Label className="text-xs flex items-center gap-2">
                                      Question Text
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Info size={14} className="text-muted-foreground" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <p>Use _____ (underscores) to mark blank positions. The blank will be replaced with an input field.</p>
                                            <p className="mt-1">Example: "The study was conducted in _____."</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </Label>
                                    <RichTextEditor
                                      value={question.question_text || ''}
                                      onChange={(value) => updateQuestion(groupIndex, qIndex, { question_text: value })}
                                      placeholder="Enter text with _____ for blanks (e.g., 'The answer is _____.') "
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label className="text-xs">Question Text (supports **bold**, *italic*)</Label>
                                  <RichTextEditor
                                    value={question.question_text || ''}
                                    onChange={(value) => updateQuestion(groupIndex, qIndex, { question_text: value })}
                                    placeholder="Enter question text..."
                                    rows={2}
                                  />
                                </div>
                              )}

                              {/* True/False/Not Given - Radio Selection for Answer */}
                              {isTrueFalseType(group.question_type) && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Correct Answer</Label>
                                  <RadioGroup
                                    value={question.correct_answer || ''}
                                    onValueChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value })}
                                    className="flex flex-wrap gap-2"
                                  >
                                    {getTrueFalseOptions(group.question_type).map((opt) => (
                                      <div key={opt} className="flex items-center">
                                        <RadioGroupItem 
                                          value={opt} 
                                          id={`q${question.question_number}-${opt}`}
                                          className="peer sr-only"
                                        />
                                        <Label 
                                          htmlFor={`q${question.question_number}-${opt}`}
                                          className={`px-3 py-1.5 rounded-md border cursor-pointer transition-all text-sm font-medium ${
                                            question.correct_answer === opt
                                              ? "bg-primary text-primary-foreground border-primary"
                                              : "bg-card border-border hover:border-primary/50"
                                          }`}
                                        >
                                          {opt}
                                        </Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                </div>
                              )}

                              {/* Matching Headings - Dropdown for correct answer */}
                              {isMatchingHeadings(group.question_type) && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Correct Heading</Label>
                              <Select
                                    value={question.correct_answer || 'none'}
                                    onValueChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value === 'none' ? '' : value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select correct heading" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {(group.options || []).map((opt, idx) => (
                                        <SelectItem key={idx} value={getOptionLabel(idx, 'i')}>
                                          {getOptionLabel(idx, 'i')} - {opt.substring(0, 50)}{opt.length > 50 ? '...' : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Matching Sentence Endings - Dropdown for correct answer */}
                              {isMatchingSentenceEndings(group.question_type) && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Correct Ending</Label>
                                  <Select
                                    value={question.correct_answer || 'none'}
                                    onValueChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value === 'none' ? '' : value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select correct ending" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {(group.options || []).map((opt, idx) => (
                                        <SelectItem key={idx} value={getOptionLabel(idx, 'A')}>
                                          {getOptionLabel(idx, 'A')} - {opt.substring(0, 50)}{opt.length > 50 ? '...' : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Question-level Options (for MCQ) */}
                              {needsQuestionOptions(group.question_type) && (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">Options</Label>
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={question.option_format || 'A'}
                                        onValueChange={(value) => updateQuestion(groupIndex, qIndex, { option_format: value })}
                                      >
                                        <SelectTrigger className="w-24 h-7 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {OPTION_FORMATS.map(f => (
                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-7 text-xs"
                                        onClick={() => addQuestionOption(groupIndex, qIndex)}
                                      >
                                        <Plus size={12} className="mr-1" />
                                        Add
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    {(question.options || []).map((opt, optIdx) => (
                                      <div key={optIdx} className="flex items-center gap-2">
                                        <span className="w-6 text-xs font-medium text-muted-foreground">
                                          {getOptionLabel(optIdx, question.option_format || 'A')}
                                        </span>
                                        <Input
                                          className="h-8 text-sm"
                                          value={opt}
                                          onChange={(e) => updateQuestionOption(groupIndex, qIndex, optIdx, e.target.value)}
                                          placeholder={`Option ${getOptionLabel(optIdx, question.option_format || 'A')}`}
                                        />
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => removeQuestionOption(groupIndex, qIndex, optIdx)}
                                        >
                                          <Trash2 size={12} />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>

                                  {/* MCQ Single - Correct Answer Dropdown */}
                                  {(question.options || []).length > 0 && (
                                    <div className="space-y-2">
                                      <Label className="text-xs">Correct Answer</Label>
                                      <Select
                                        value={question.correct_answer || 'none'}
                                        onValueChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value === 'none' ? '' : value })}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select correct answer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">None</SelectItem>
                                          {(question.options || []).map((opt, optIdx) => (
                                            <SelectItem key={optIdx} value={getOptionLabel(optIdx, question.option_format || 'A')}>
                                              {getOptionLabel(optIdx, question.option_format || 'A')} - {opt.substring(0, 50)}{opt.length > 50 ? '...' : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* TABLE_SELECTION - Dropdown for correct answer */}
                              {isTableSelection(group.question_type) && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Correct Answer</Label>
                                  <Select
                                    value={question.correct_answer || 'none'}
                                    onValueChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value === 'none' ? '' : value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select correct answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {(group.options || []).map((opt, idx) => (
                                        <SelectItem key={idx} value={getOptionLabel(idx, 'A')}>
                                          {getOptionLabel(idx, 'A')}{opt ? ` - ${opt}` : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* MATCHING_FEATURES - Dropdown for correct answer */}
                              {isMatchingFeatures(group.question_type) && (group.options || []).length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Correct Answer</Label>
                                  <Select
                                    value={question.correct_answer || 'none'}
                                    onValueChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value === 'none' ? '' : value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select correct answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {(group.options || []).map((opt, idx) => (
                                        <SelectItem key={idx} value={getOptionLabel(idx, 'A')}>
                                          {getOptionLabel(idx, 'A')} - {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Fill in Gap with Dropdown - Select from word bank */}
                              {isFillInBlank(group.question_type) && group.use_dropdown && (group.options || []).filter(opt => opt.trim() !== '').length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Correct Answer (from Word Bank)</Label>
                                  <Select
                                    value={question.correct_answer || 'none'}
                                    onValueChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value === 'none' ? '' : value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select correct answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">None</SelectItem>
                                      {(group.options || []).filter(opt => opt.trim() !== '').map((opt, idx) => (
                                        <SelectItem key={idx} value={opt}>
                                          {opt}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* MCQ Multiple - Multi-select correct answers from group options */}
                              {isMCQMultiple(group.question_type) && (group.options || []).length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Correct Answers (select {group.max_answers || 2})</Label>
                                  <MultiSelectAnswerInput
                                    value={question.correct_answer || ''}
                                    onChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value })}
                                    options={group.options || []}
                                    optionFormat={group.option_format || 'A'}
                                  />
                                </div>
                              )}

                              {/* Correct Answer for non-True/False, non-MatchingHeadings, non-MatchingSentenceEndings, non-TableSelection, non-MatchingFeatures, non-FillInBlank-with-dropdown, non-MCQMultiple types */}
                              {!isTrueFalseType(group.question_type) && !isMatchingHeadings(group.question_type) && !isMatchingSentenceEndings(group.question_type) && !isTableSelection(group.question_type) && !isMatchingFeatures(group.question_type) && !(isFillInBlank(group.question_type) && group.use_dropdown && (group.options || []).length > 0) && !isMCQMultiple(group.question_type) && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Correct Answer(s)</Label>
                                  <MultipleAnswersInput
                                    value={question.correct_answer || ''}
                                    onChange={(value) => updateQuestion(groupIndex, qIndex, { correct_answer: value })}
                                    questionType={group.question_type}
                                    placeholder="Enter correct answer"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}