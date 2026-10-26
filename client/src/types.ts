export type Level = "O-Level" | "A-Level";
export type PaperType = "structured" | "multiple-choice" | "mixed";
export type Difficulty = "easier" | "balanced" | "harder";

export type Syllabus = {
  subjects: { name: string; levels: Record<Level, string[]> }[];
};

export type GenerateRequest = {
  level: Level;
  subject: string;
  topics: string[];
  paperType: PaperType;
  difficulty: Difficulty;
  totalMarks: number;
  durationMinutes: number;
};

export type MarkingPoint = { point: string; marks: number };
export type Question = {
  number: string;
  text: string;
  marks: number;
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
