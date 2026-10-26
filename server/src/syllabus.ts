// Starter topic lists used to ground the prompt and fill the topic picker.
// These are NOT copied from the official ZIMSEC documents. Teachers should check
// them against the current syllabus, and the list can be extended per subject.
export type Syllabus = {
  subjects: {
    name: string;
    levels: Record<"O-Level" | "A-Level", string[]>;
  }[];
};

export const syllabus: Syllabus = {
  subjects: [
    {
      name: "Mathematics",
      levels: {
        "O-Level": [
          "Number and numeration",
          "Ratio, rate and proportion",
          "Percentages and money",
          "Sets",
          "Algebraic expressions and factorisation",
          "Equations and inequalities",
          "Indices and standard form",
          "Sequences",
          "Graphs of functions",
          "Variation",
          "Angles, lines and polygons",
          "Circle theorems",
          "Mensuration",
          "Pythagoras and trigonometry",
          "Bearings and loci",
          "Vectors",
          "Matrices",
          "Transformations",
          "Statistics",
          "Probability",
        ],
        "A-Level": [
          "Algebra and functions",
          "Coordinate geometry",
          "Trigonometry",
          "Differentiation",
          "Integration",
          "Sequences and series",
          "Vectors",
          "Complex numbers",
          "Probability",
          "Discrete random variables",
          "Normal distribution",
          "Hypothesis testing",
          "Kinematics",
          "Forces and Newton's laws",
          "Momentum and impulse",
        ],
      },
    },
  ],
};
