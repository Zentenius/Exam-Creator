import { generateObject } from "ai"
import { mistral } from "@ai-sdk/mistral"
import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"

const QuestionBatchSchema = z.object({
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

async function generateQuestionBatch(
  type: string,
  count: number,
  subject: string,
  difficulty: string,
  notes: string,
  startId: number,
): Promise<any[]> {
  if (count === 0) return []

  const typePrompts = {
    MCQ: `Generate exactly ${count} Multiple Choice Questions with 4 options each. Each question should have exactly 4 answer choices with one correct answer.`,
    TF: `Generate exactly ${count} True/False Questions. The answer must be either "True" or "False".`,
    MATCHING: `Generate exactly ${count} Matching Questions. Each should have 4 leftItems and 4 rightItems with proper id/text structure and correctMatches object.`,
    ESSAY: `Generate exactly ${count} Essay Questions with comprehensive model answers.`,
  }

  const prompt = `Generate exactly ${count} ${type} questions about "${subject}" at ${difficulty} difficulty level.

Content: ${notes.substring(0, 1500)}

${typePrompts[type as keyof typeof typePrompts]}

Requirements:
- Start question IDs from q${startId}
- Base questions strictly on the provided content
- Keep questions clear and concise
- Each question must be complete and valid

${
  type === "MATCHING"
    ? `
For MATCHING questions, use this exact format:
{
  "type": "MATCHING",
  "question": "Match the items with their descriptions",
  "leftItems": [
    {"id": "term1", "text": "Term 1"},
    {"id": "term2", "text": "Term 2"},
    {"id": "term3", "text": "Term 3"},
    {"id": "term4", "text": "Term 4"}
  ],
  "rightItems": [
    {"id": "def1", "text": "Definition 1"},
    {"id": "def2", "text": "Definition 2"},
    {"id": "def3", "text": "Definition 3"},
    {"id": "def4", "text": "Definition 4"}
  ],
  "correctMatches": {
    "def1": "term1",
    "def2": "term2",
    "def3": "term3",
    "def4": "term4"
  },
  "answer": "term1-def1, term2-def2, term3-def3, term4-def4"
}`
    : ""
}`

  try {
    const { object } = await generateObject({
      model: mistral("mistral-small-2503"),
      schema: QuestionBatchSchema,
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 2000, // Smaller token limit for batches
    })

    return object.questions || []
  } catch (error) {
    console.error(`Failed to generate ${type} questions:`, error)
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subject, difficulty, notes, questionCounts } = await request.json()

    // Calculate total questions needed
    const totalQuestions = Object.values(questionCounts).reduce((sum: number, count: any) => sum + count, 0)

    if (totalQuestions === 0) {
      return NextResponse.json({ error: "No questions requested" }, { status: 400 })
    }

    if (totalQuestions > 50) {
      return NextResponse.json({ error: "Too many questions requested. Maximum is 50." }, { status: 400 })
    }

    console.log(`Starting generation of ${totalQuestions} questions in batches...`)

    const allQuestions: any[] = []
    let currentId = 1

    // Generate questions in batches by type
    const questionTypes = [
      { type: "MCQ", count: questionCounts.MCQ },
      { type: "TF", count: questionCounts.TF },
      { type: "MATCHING", count: questionCounts.MATCHING },
      { type: "ESSAY", count: questionCounts.ESSAY },
    ]

    for (const { type, count } of questionTypes) {
      if (count > 0) {
        console.log(`Generating ${count} ${type} questions...`)

        // For larger batches, split into smaller chunks
        const maxBatchSize = type === "MATCHING" ? 2 : type === "ESSAY" ? 3 : 5
        const batches = Math.ceil(count / maxBatchSize)

        for (let batch = 0; batch < batches; batch++) {
          const batchStart = batch * maxBatchSize
          const batchCount = Math.min(maxBatchSize, count - batchStart)

          console.log(`  Batch ${batch + 1}/${batches}: ${batchCount} questions`)

          const batchQuestions = await generateQuestionBatch(type, batchCount, subject, difficulty, notes, currentId)

          if (batchQuestions.length > 0) {
            // Ensure proper ID assignment
            batchQuestions.forEach((q, index) => {
              q.id = `q${currentId + index}`
              q.difficulty = difficulty
            })

            allQuestions.push(...batchQuestions)
            currentId += batchQuestions.length
            console.log(`  ✓ Generated ${batchQuestions.length} questions`)
          } else {
            console.log(`  ⚠ Failed to generate batch ${batch + 1}`)
          }

          // Small delay between batches to prevent rate limiting
          if (batch < batches - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500))
          }
        }
      }
    }

    // Validate final results
    if (allQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to generate any questions. Please try again with different content or fewer questions.",
        },
        { status: 500 },
      )
    }

    // Final validation and cleanup
    const validQuestions = allQuestions.filter((q) => {
      return q.id && q.type && q.question && q.answer && q.difficulty
    })

    if (validQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "No valid questions were generated. Please try again.",
        },
        { status: 500 },
      )
    }

    console.log(`✅ Successfully generated ${validQuestions.length}/${totalQuestions} questions`)

    // If we got fewer questions than requested, let the user know
    if (validQuestions.length < totalQuestions) {
      console.log(`⚠ Generated ${validQuestions.length} out of ${totalQuestions} requested questions`)
    }

    return NextResponse.json({
      questions: validQuestions,
      generated: validQuestions.length,
      requested: totalQuestions,
    })
  } catch (error) {
    console.error("Error in question generation:", error)
    return NextResponse.json(
      {
        error: "Failed to generate questions. Please try again.",
      },
      { status: 500 },
    )
  }
}