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
  /** Typed by the teacher, printed on the cover page. */
  examTitle?: string;
};

export type Diagram =
  | { type: "venn"; sets: string[]; counts?: (string | number | null)[] | null }
  | { type: "triangle"; vertices: string[]; sides?: (string | null)[] | null; angles?: (string | null)[] | null; rightAngleAt?: number | null }
  | {
      type: "numberline"; min: number; max: number; step: number;
      points?: { value: number; style: "open" | "closed"; label?: string | null }[] | null;
      shade?: { from: number | null; to: number | null; fromOpen: boolean; toOpen: boolean } | null;
    }
  | {
      type: "grid"; xMin: number; xMax: number; yMin: number; yMax: number;
      points?: { label?: string | null; x: number; y: number }[] | null;
      polygons?: { name?: string | null; points: [number, number][] }[] | null;
    }
  | { type: "bar"; title?: string | null; xLabel?: string | null; yLabel?: string | null; bars: { label: string; value: number }[] }
  | {
      type: "circle"; centre?: string | null; points: string[];
      chords?: [string, string][] | null; radii?: string[] | null; marks?: { at: string; text: string }[] | null;
    };

export type MarkingPoint = { point: string; marks: number };
export type Question = {
  number: string;
  text: string;
  marks: number;
  answerLines?: number;
  options?: string[];
  diagram?: Diagram | null;
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
    examTitle?: string;
    provider: "gemini" | "openrouter" | "mock";
    generatedAt: string;
  };
};
