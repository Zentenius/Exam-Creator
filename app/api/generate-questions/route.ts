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

// Function to split content into chunks and rotate through them
function getContentChunk(notes: string, chunkIndex: number, totalChunks: number): string {
  const chunkSize = Math.ceil(notes.length / totalChunks)
  const start = (chunkIndex * chunkSize) % notes.length
  const end = Math.min(start + chunkSize, notes.length)

  let chunk = notes.substring(start, end)

  // If we're at the end and chunk is too small, wrap around
  if (chunk.length < chunkSize / 2 && notes.length > chunkSize) {
    const wrapAmount = chunkSize - chunk.length
    chunk += " " + notes.substring(0, wrapAmount)
  }

  return chunk
}

// Function to generate diverse topics from content
function extractTopics(notes: string, count: number): string[] {
  const sentences = notes.split(/[.!?]+/).filter((s) => s.trim().length > 20)
  const topics: string[] = []

  // Extract key topics by taking sentences from different parts of the content
  for (let i = 0; i < count && i < sentences.length; i++) {
    const index = Math.floor((i * sentences.length) / count)
    const sentence = sentences[index]?.trim()
    if (sentence && sentence.length > 20) {
      topics.push(sentence)
    }
  }

  return topics
}

async function generateQuestionBatch(
  type: string,
  count: number,
  subject: string,
  difficulty: string,
  notes: string,
  startId: number,
  batchIndex: number,
  totalBatches: number,
  existingQuestions: any[] = [],
): Promise<{ questions: any[]; error?: string }> {
  if (count === 0) return { questions: [] }

  console.log(`🔄 Starting ${type} batch: ${count} questions, batch ${batchIndex + 1}/${totalBatches}`)

  try {
    // Get different content chunk for each batch to ensure variety
    const contentChunk = getContentChunk(notes, batchIndex, Math.max(totalBatches, 4))
    console.log(`📄 Using content chunk ${batchIndex + 1}: ${contentChunk.length} characters`)

    // Extract specific topics from this chunk
    const topics = extractTopics(contentChunk, Math.max(count * 2, 6))
    const topicsText =
      topics.length > 0
        ? `\n\nFocus on these specific topics from the content:\n${topics.map((t, i) => `${i + 1}. ${t}`).join("\n")}`
        : ""

    // Create list of existing questions to avoid duplicates
    const existingQuestionsText =
      existingQuestions.length > 0
        ? `\n\nIMPORTANT: Do NOT create questions similar to these existing ones:\n${existingQuestions
            .map((q) => `- ${q.question}`)
            .slice(-10)
            .join("\n")}`
        : ""

    const typePrompts = {
      MCQ: `Generate exactly ${count} UNIQUE Multiple Choice Questions with 4 options each. 
      - Each question must cover DIFFERENT concepts/topics
      - Vary the question formats (What is, Which of the following, How does, Why does, etc.)
      - Focus on different aspects: definitions, processes, comparisons, applications
      - Make sure no two questions test the same knowledge`,

      TF: `Generate exactly ${count} UNIQUE True/False Questions.
      - Each question must test DIFFERENT facts or concepts
      - Vary between positive and negative statements
      - Cover different topics from the content
      - Mix obvious and subtle true/false scenarios
      - Answer must be exactly "True" or "False"`,

      MATCHING: `Generate exactly ${count} UNIQUE Matching Questions.
      - Each matching set must cover DIFFERENT topic areas
      - Use varied categories: terms-definitions, causes-effects, problems-solutions, etc.
      - Ensure each matching question has a distinct theme
      - 4 items per side with clear, unambiguous matches`,

      ESSAY: `Generate exactly ${count} UNIQUE Essay Questions.
      - Each question must explore DIFFERENT aspects or topics
      - Vary question types: explain, compare, analyze, evaluate, describe
      - Cover different complexity levels within the difficulty
      - Focus on different sections of the content
      - Provide comprehensive model answers
      - Ensure that each question is simple and clear, allowing for in-depth responses`,

    }

    const prompt = `Generate exactly ${count} ${type} questions about "${subject}" at ${difficulty} difficulty level.

CONTENT SECTION ${batchIndex + 1}:
${contentChunk}
${topicsText}
${existingQuestionsText}

${typePrompts[type as keyof typeof typePrompts]}

CRITICAL REQUIREMENTS:
- Start question IDs from q${startId}
- Each question must be COMPLETELY DIFFERENT from others
- Use DIFFERENT parts of the provided content section
- Avoid repetitive patterns or similar phrasings
- Ensure variety in question structure and focus
- Base questions strictly on the provided content section

${
  type === "MATCHING"
    ? `
For MATCHING questions, use this exact format with DIVERSE topics:
{
  "type": "MATCHING",
  "question": "Match the [specific category] with their [specific attribute]",
  "leftItems": [
    {"id": "term1", "text": "Unique Term 1"},
    {"id": "term2", "text": "Unique Term 2"},
    {"id": "term3", "text": "Unique Term 3"},
    {"id": "term4", "text": "Unique Term 4"}
  ],
  "rightItems": [
    {"id": "def1", "text": "Specific Description 1"},
    {"id": "def2", "text": "Specific Description 2"},
    {"id": "def3", "text": "Specific Description 3"},
    {"id": "def4", "text": "Specific Description 4"}
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
}

DIVERSITY CHECK: Before finalizing, ensure each question covers a different concept or aspect of the content.`

    console.log(`🤖 Sending request to AI for ${count} ${type} questions...`)

    const { object } = await generateObject({
      model: mistral("mistral-small-2503"),
      schema: QuestionBatchSchema,
      prompt: prompt,
      temperature: 0.8,
      maxTokens: 2000,
    })

    const questions = object.questions || []
    console.log(`✅ AI returned ${questions.length} ${type} questions`)

    // Validate each question
    const validQuestions = questions.filter((q, index) => {
      const isValid = q.id && q.type && q.question && q.answer && q.difficulty
      if (!isValid) {
        console.log(`⚠️ Invalid ${type} question ${index + 1}:`, {
          hasId: !!q.id,
          hasType: !!q.type,
          hasQuestion: !!q.question,
          hasAnswer: !!q.answer,
          hasDifficulty: !!q.difficulty,
        })
      }
      return isValid
    })

    console.log(`✅ ${validQuestions.length}/${questions.length} ${type} questions are valid`)

    return { questions: validQuestions }
  } catch (error) {
    console.error(`❌ Error generating ${type} questions:`, error)
    return { questions: [], error: `Failed to generate ${type} questions: ${error}` }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { subject, difficulty, notes, questionCounts } = await request.json()

    // Calculate total questions needed
    const totalQuestions = Object.values(questionCounts).reduce((sum: number, count: any) => sum + count, 0)

    console.log(`🚀 Starting quiz generation:`, {
      subject,
      difficulty,
      totalQuestions,
      questionCounts,
      contentLength: notes.length,
    })

    if (totalQuestions === 0) {
      return NextResponse.json({ error: "No questions requested" }, { status: 400 })
    }

    if (totalQuestions > 50) {
      return NextResponse.json({ error: "Too many questions requested. Maximum is 50." }, { status: 400 })
    }

    if (!notes || notes.trim().length < 100) {
      return NextResponse.json(
        { error: "Please provide more detailed content (at least 100 characters)" },
        { status: 400 },
      )
    }

    const allQuestions: any[] = []
    const errors: string[] = []
    let currentId = 1
    let globalBatchIndex = 0

    // Generate questions in batches by type
    const questionTypes = [
      { type: "MCQ", count: questionCounts.MCQ },
      { type: "TF", count: questionCounts.TF },
      { type: "MATCHING", count: questionCounts.MATCHING },
      { type: "ESSAY", count: questionCounts.ESSAY },
    ]

    console.log(
      `📋 Question types to generate:`,
      questionTypes.filter((qt) => qt.count > 0),
    )

    for (const { type, count } of questionTypes) {
      if (count > 0) {
        console.log(`\n🎯 === GENERATING ${count} ${type} QUESTIONS ===`)

        // For larger batches, split into smaller chunks
        const maxBatchSize = type === "MATCHING" ? 2 : type === "ESSAY" ? 2 : 3 // Smaller batches for reliability
        const batches = Math.ceil(count / maxBatchSize)

        console.log(`📦 Splitting into ${batches} batches (max ${maxBatchSize} per batch)`)

        for (let batch = 0; batch < batches; batch++) {
          const batchStart = batch * maxBatchSize
          const batchCount = Math.min(maxBatchSize, count - batchStart)

          console.log(`\n📦 Batch ${batch + 1}/${batches}: Generating ${batchCount} ${type} questions...`)

          const result = await generateQuestionBatch(
            type,
            batchCount,
            subject,
            difficulty,
            notes,
            currentId,
            globalBatchIndex,
            totalQuestions,
            allQuestions,
          )

          if (result.error) {
            console.error(`❌ Batch ${batch + 1} failed:`, result.error)
            errors.push(`${type} batch ${batch + 1}: ${result.error}`)
          }

          if (result.questions.length > 0) {
            // Ensure proper ID assignment
            result.questions.forEach((q, index) => {
              q.id = `q${currentId + index}`
              q.difficulty = difficulty
            })

            allQuestions.push(...result.questions)
            currentId += result.questions.length
            console.log(`✅ Added ${result.questions.length} ${type} questions (total: ${allQuestions.length})`)
          } else {
            console.log(`⚠️ Batch ${batch + 1} produced no valid questions`)
          }

          globalBatchIndex++

          // Delay between batches to prevent rate limiting
          if (batch < batches - 1) {
            console.log(`⏳ Waiting 1 second before next batch...`)
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }

        console.log(`🏁 Completed ${type}: ${allQuestions.filter((q) => q.type === type).length}/${count} questions`)
      } else {
        console.log(`⏭️ Skipping ${type} (count: 0)`)
      }
    }

    console.log(`\n🎉 GENERATION COMPLETE:`)
    console.log(`📊 Total questions generated: ${allQuestions.length}/${totalQuestions}`)
    console.log(`📈 Success rate: ${Math.round((allQuestions.length / totalQuestions) * 100)}%`)

    // Log breakdown by type
    const breakdown = questionTypes.map((qt) => ({
      type: qt.type,
      requested: qt.count,
      generated: allQuestions.filter((q) => q.type === qt.type).length,
    }))
    console.log(`📋 Breakdown:`, breakdown)

    if (errors.length > 0) {
      console.log(`⚠️ Errors encountered:`, errors)
    }

    // Validate final results
    if (allQuestions.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to generate any questions. Please try again with different content or fewer questions.",
          details: errors,
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
          details: errors,
        },
        { status: 500 },
      )
    }

    // Check for potential duplicates and log warning
    const questionTexts = validQuestions.map((q) => q.question.toLowerCase())
    const uniqueTexts = new Set(questionTexts)
    if (uniqueTexts.size < questionTexts.length) {
      console.log(`⚠️ Warning: Detected ${questionTexts.length - uniqueTexts.size} potential duplicate questions`)
    }

    console.log(`✅ Final result: ${validQuestions.length} valid questions ready`)

    return NextResponse.json({
      questions: validQuestions,
      generated: validQuestions.length,
      requested: totalQuestions,
      contentLength: notes.length,
      sectionsUsed: globalBatchIndex,
      breakdown: breakdown,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("❌ Critical error in question generation:", error)
    return NextResponse.json(
      {
        error: "Failed to generate questions. Please try again.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
