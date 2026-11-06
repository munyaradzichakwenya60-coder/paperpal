# Ethical and responsible AI use

## Data privacy

- PaperPal needs no student data. No student names, marks or results are collected or sent anywhere.
- The AI receives only the subject, topics, level, paper type, difficulty, marks and time. The teacher's name, school and email are not sent to the AI provider.
- Those AI requests go to Google (Gemini) and, as a backup, OpenRouter. They are third parties with their own data policies. Free tiers may use submitted content to improve their services, which is acceptable here because nothing personal is submitted.
- Teacher accounts, school profiles and generated papers are stored in Supabase. Row level security means each teacher can read and change only their own rows.
- API keys and the Supabase service role key live only on the server. The browser holds only the public anon key.
- Input is validated, request bodies are size limited, the generate endpoint is rate limited, and security headers are set.

## Bias and fairness

- AI models learn from large internet text that is not Zimbabwe-specific. They can drift towards foreign names, currencies, contexts and spelling, or rely on stereotypes in word problems.
- The prompt asks for Zimbabwean context and ZIMSEC style, and topics come from a fixed syllabus list, but this does not guarantee fair or culturally appropriate questions.
- Teachers must read each paper for biased, culturally narrow or inappropriate content, and for difficulty that unfairly favours some learners.
- Language and mother-tongue subjects (Shona, Ndebele) are the most at risk of weaker quality and need extra review.

## Transparency

- Every paper is marked in the interface as AI-written, with a reminder to check each question and mark before use.
- The app records which provider and model produced a paper, and its token usage and estimated cost.
- This documentation states the limits of the system: no official syllabus or past papers, possible errors, and the weaker backup model.
- PaperPal is a drafting assistant. It does not claim to be ZIMSEC and papers are not official ZIMSEC material.

## Human oversight

- The teacher is always the final author. Nothing is sent to learners automatically.
- Automatic checks (mark totals, scheme sums, schema) catch some errors, but they cannot check whether an answer is factually correct. That is the teacher's job.

## Known risks and next steps

- Add per-question regenerate and editing so teachers can correct individual items.
- Add subject-specific formats and a review of language-subject output with qualified teachers.
- Add per-user quotas and a privacy notice shown at sign up.
- Check topic lists against the current official syllabus.
