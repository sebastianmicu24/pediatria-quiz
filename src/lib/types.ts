export type Question = {
  id: string;
  question: string;
  options: string[];
  answer_index: number;
  topic: string;
  difficulty: number;
  explanation: string;
};

export type QuizAnswerInput = {
  questionId: string;
  selectedIndex: number;
};

export type Profile = {
  display_name: string | null;
  accepted_terms_at: string | null;
  marketing_consent: boolean;
};

export type AttemptSummary = {
  id: string;
  topic: string | null;
  difficulty: number | null;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
};

export type TopicStat = {
  topic: string;
  total: number;
  correct: number;
};
