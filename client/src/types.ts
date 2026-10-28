export type Level = "O-Level" | "A-Level";
export type PaperType = "structured" | "multiple-choice" | "mixed";
export type Difficulty = "easier" | "balanced" | "harder";

export type Profile = {
  schoolName: string;
  teacherName: string;
  role: "Teacher" | "Head of Department" | "Examiner";
};

export type Syllabus = {
  subjects: { name: string; levels: Record<Level, string[]> }[];
};

export type GenerateRequest = {
  level: Level;
  subject: string;
  topics: string[];
  paperType: PaperType;
  difficulty: Difficulty;
  /**
   * For structured: total marks the paper must sum to.
   * For multiple-choice: equals questionCount (1 mark per question).
   * For mixed: mcqCount + structuredMarks.
   */
  totalMarks: number;
  /**
   * For multiple-choice and mixed: number of MCQ questions (each worth 1 mark).
   * Undefined for structured-only papers.
   */
  questionCount?: number;
  durationMinutes: number;
};

export type MarkingPoint = { point: string; marks: number };
export type Question = {
  number: string;
  text: string;
  marks: number;
  answerLines?: number;
  options?: string[];
  markingScheme: MarkingPoint[];
};
export type Section = { title: string; instructions?: string; questions: Question[] };

export type GeneratedPaper = {
  title: string;
  instructions: string[];
  sections: Section[];
  meta: {
    level: Level;
    subject: string;
    topics: string[];
    paperType: PaperType;
    durationMinutes: number;
    totalMarks: number;
    provider: "gemini" | "mock";
    generatedAt: string;
  };
};
