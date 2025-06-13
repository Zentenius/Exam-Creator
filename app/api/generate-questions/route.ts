import { generateObject } from "ai"
import { mistral } from "@ai-sdk/mistral"
import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"

const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["MCQ", "TF", "MATCHING", "ESSAY"]),
      question: z.string(),
      options: z.array(z.string()).optional(),
      answer: z.union([z.string(), z.array(z.string())]),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      leftItems: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
      rightItems: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
      correctMatches: z.record(z.string()).optional(),
    }),
  ),
})

export async function POST(request: NextRequest) {
  try {
    const { subject, difficulty, notes, questionCounts } = await request.json()

    // Calculate total questions needed
    const totalQuestions = Object.values(questionCounts).reduce((sum: number, count: any) => sum + count, 0)

    if (totalQuestions === 0) {
      return NextResponse.json({ error: "No questions requested" }, { status: 400 })
    }

    // Create detailed prompt for question generation
    const prompt = `Generate ${totalQuestions} quiz questions about "${subject}" at ${difficulty} difficulty level based on the following content:

${notes}

Generate exactly:
- ${questionCounts.MCQ} Multiple Choice Questions (MCQ) with 4 options each
- ${questionCounts.TF} True/False Questions (TF)
- ${questionCounts.MATCHING} Matching Questions (MATCHING) - create items to drag and match
- ${questionCounts.ESSAY} Essay Questions (ESSAY)

Requirements:
- Each question should be clear and unambiguous
- For MCQ: provide exactly 4 options with one correct answer
- For TF: the answer should be either "True" or "False"
- For MATCHING: create leftItems (terms/concepts) and rightItems (definitions/descriptions) with correctMatches object mapping rightItem IDs to leftItem IDs. Each item should have an id and text field.
- For ESSAY: provide a comprehensive model answer
- Questions should test understanding, not just memorization
- Vary the complexity within the ${difficulty} difficulty level
- Base all questions strictly on the provided content

For MATCHING questions, format like this:
{
  "type": "MATCHING",
  "question": "Match the terms with their definitions",
  "leftItems": [
    {"id": "term1", "text": "Photosynthesis"},
    {"id": "term2", "text": "Respiration"}
  ],
  "rightItems": [
    {"id": "def1", "text": "Process of converting light energy to chemical energy"},
    {"id": "def2", "text": "Process of breaking down glucose for energy"}
  ],
  "correctMatches": {
    "def1": "term1",
    "def2": "term2"
  },
  "answer": "term1-def1, term2-def2"
}

Make sure each question has a unique ID (use format: q1, q2, q3, etc.).`

    const { object } = await generateObject({
      model: mistral("mistral-small-2503"),
      schema: QuestionSchema,
      prompt: prompt,
      temperature: 0.7,
    })

    // Validate and format the generated questions
    const formattedQuestions = object.questions.map((q, index) => ({
      ...q,
      id: q.id || `q${index + 1}`,
      difficulty: difficulty as "Easy" | "Medium" | "Hard",
    }))

    return NextResponse.json({ questions: formattedQuestions })
  } catch (error) {
    console.error("Error generating questions:", error)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
