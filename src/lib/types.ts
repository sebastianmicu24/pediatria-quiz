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

/** Risposta dell'esercitazione in corso, come la conosce il client. */
export type QuizAnswerRecord = QuizAnswerInput & { isCorrect: boolean };

/**
 * Esercitazione interrotta e ripresa dal server: le risposte già salvate
 * (in ordine cronologico) e le domande corrispondenti, che servono al
 * riepilogo finale.
 */
export type RecoveredQuizSession = {
  answers: QuizAnswerRecord[];
  questions: Question[];
  topic: string | null;
  difficulty: number | null;
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

/** Copertura di un argomento: domande svolte, corrette e disponibili. */
export type TopicCoverageDatum = {
  topic: string;
  /** Domande svolte (con almeno una risposta). */
  done: number;
  /** Di cui corrette (ultima risposta data). */
  correct: number;
  /** Domande totali disponibili per l'argomento. */
  available: number;
};
