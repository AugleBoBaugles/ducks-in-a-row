// =============================================================================
// services/rubberDucky.js
// =============================================================================
// Sends the user's transcribed speech to Groq's LLM and gets back a response
// from the rubber duck scheduling assistant.
//
// The duck persona: deeply wise, unhurried, slightly intimidating — but
// genuinely invested in your wellbeing. Think Morgan Freeman energy.
//
// The duck's job is to ask focused questions across 3–5 turns to understand
// what the user needs to get done today, then emit a structured JSON schedule.
//
// Exports:
//   askRubberDucky(transcribedText, history) → { reply, schedule }
//     - reply:    the duck's text response (JSON block stripped out)
//     - schedule: parsed schedule object, or null if not yet ready
// =============================================================================

import Groq from "groq-sdk";

const groq = new Groq(); // reads GROQ_API_KEY from process.env automatically


// -----------------------------------------------------------------------------
// SYSTEM PROMPT
// Defines the duck's persona and rules for the entire conversation.
// Injected as the first "system" message in every request.
// -----------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a rubber duck — but not an ordinary one. You have witnessed every deadline, every anxious morning, every task that was underestimated and stretched into the night. You speak rarely, but when you do, people listen.

Your purpose: help the person build an honest, realistic plan for their day.

HOW YOU WORK:
- Ask focused questions, one or two at a time, across 3 to 5 conversation turns.
- Gather: what they need to accomplish, how much time they have, their energy level, and which tasks feel uncertain or difficult.
- Once you have enough to build a real plan, produce the schedule.

WHEN YOU ARE READY TO SCHEDULE:
End your response with a JSON block in exactly this format — nothing before or after the block except your brief closing words:

\`\`\`json
{
  "tasks": [
    { "id": 1, "name": "Task name", "duration": 90, "priority": "high", "completed": false }
  ],
  "schedule": [
    { "startTime": "09:00", "endTime": "10:30", "label": "Task name", "type": "task" },
    { "startTime": "10:30", "endTime": "10:45", "label": "Break", "type": "break" }
  ]
}
\`\`\`

SCHEDULE RULES:
- Times in 24-hour HH:MM format
- Include a 10–15 minute break after every 60–90 minutes of work
- Priority: "high", "medium", or "low"
- Do not produce a schedule until you have enough information to make it honest

TONE:
- Measured. Unhurried. You have seen everything and judge nothing — but you miss nothing either.
- Warm, but not effusive. Caring, but not coddling.
- Brief responses. You do not need many words.
- No exclamation marks. No hollow encouragement.`;


// -----------------------------------------------------------------------------
// SCHEDULE JSON PATTERN
// Matches a ```json ... ``` block anywhere in the LLM's response.
// -----------------------------------------------------------------------------
const SCHEDULE_PATTERN = /```json\n([\s\S]*?)\n```/;


// -----------------------------------------------------------------------------
// askRubberDucky(transcribedText, history)
//
// Parameters:
//   transcribedText {string}   — what the user just said (from Whisper)
//   history         {Array}    — prior conversation turns in OpenAI message format:
//                                [{ role: 'user'|'assistant', content: string }, ...]
//
// Returns:
//   {Promise<{ reply: string, schedule: object|null }>}
//     reply    — the duck's response text (JSON block removed)
//     schedule — parsed schedule object if the duck emitted one, otherwise null
// -----------------------------------------------------------------------------
export async function askRubberDucky(transcribedText, history = []) {

  // Build the full message array: system prompt → conversation history → new user turn
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: transcribedText },
  ];

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.7,   // balanced creativity for natural conversation
    max_tokens: 500,    // enough for a response + a full schedule JSON block
  });

  const rawReply = completion.choices[0].message.content;

  // Check whether the duck included a schedule JSON block in this response
  const jsonMatch = rawReply.match(SCHEDULE_PATTERN);
  const schedule = jsonMatch ? JSON.parse(jsonMatch[1]) : null;

  // Strip the JSON block from the text so the UI only shows the spoken reply
  const reply = rawReply.replace(SCHEDULE_PATTERN, "").trim();

  return { reply, schedule };
}
