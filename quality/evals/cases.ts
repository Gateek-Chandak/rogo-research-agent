/** Key analyst questions and what a good answer must do. Add a case by adding an object. */

import { cites, excludes, includes, matches, usesTool, type EvalCase } from "./checks.ts";

export const EVALS: EvalCase[] = [
  {
    name: "Picks the right Acme",
    question: "What was Acme Robotics' revenue growth in FY2025?",
    expect: [includes("47"), excludes("5.5%"), cites],
  },
  {
    name: "Asks which Acme",
    question: "How is Acme doing?",
    expect: [includes("Acme Corp"), includes("Acme Robotics")],
  },
  {
    name: "Resolves a ticker",
    question: "What was UMBR's revenue growth in FY2025?",
    expect: [includes("9.6"), cites],
  },
  {
    name: "Separates organic from acquired growth",
    question: "How much of Umbrella Health's FY2025 growth was organic?",
    expect: [includes("6.5"), matches(/acqui/i), usesTool("searchDocuments")],
  },
  {
    name: "Flags an unfiled year",
    question: "What was Initech's revenue in FY2025?",
    expect: [matches(/(not|n.t) (yet )?(been )?filed/i), matches(/prelim/i)],
  },
  {
    name: "Declines outside coverage",
    question: "What was Tesla's revenue last year?",
    expect: [matches(/(don't|do not|not) cover/i)],
  },
  {
    name: "Survives a typo",
    question: "What are Umbrela Health's margins?",
    expect: [includes("Umbrella Health"), cites],
  },
  {
    name: "Follow-up keeps the company",
    history: [
      { role: "user", text: "What was Acme Robotics' FY2025 revenue?" },
      { role: "assistant", text: "Acme Robotics' FY2025 revenue was $1,015M." },
    ],
    question: "And its gross margin?",
    expect: [includes("53"), excludes("Acme Corp")],
  },
];
