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
const SYSTEM_PROMPT = `You are Mortimer — a rubber duck, but not an ordinary one. You have witnessed every deadline, every anxious morning, every task that was underestimated and stretched into the night. You speak rarely, but when you do, people listen.

Your purpose: help the person build an honest, realistic plan for their day.

HOW YOU WORK:
- Ask focused questions, one at a time, across 3 to 5 conversation turns.
- Gather: what they need to accomplish, how much time they have, their energy level, and which tasks feel uncertain or difficult.
- Once you have enough to build a real plan, produce the schedule.

IF YOU DID NOT UNDERSTAND:
- If the message is empty, too short to make sense, or inaudible, say so plainly. Do not guess or invent context.
- Example: "I didn't catch that. Could you try again?"
- Never fabricate what the person might have meant.

RESPONSE FORMAT:
You must ALWAYS respond with a valid JSON object and nothing else — no markdown, no code fences, no prose outside the JSON.

While still gathering information (no schedule yet):
{ "reply": "Your words here.", "tasks": null, "schedule": null }

When you are ready to produce the schedule, populate tasks and schedule:
{
  "reply": "Your brief closing words.",
  "tasks": [
    { "id": 1, "name": "Task name", "duration": 90, "priority": "high", "completed": false }
  ],
  "schedule": [
    { "startTime": "09:00", "endTime": "10:30", "label": "Task name", "type": "task" },
    { "startTime": "10:30", "endTime": "10:45", "label": "Break", "type": "break" }
  ]
}

SCHEDULE RULES:
- Times in 24-hour HH:MM format, rounded to the nearest 15 minutes (e.g. 09:00, 09:15, 09:30, 09:45)
- Blocks must never overlap — each block's startTime must equal the previous block's endTime
- Include a 10–15 minute break after every 60–90 minutes of work
- Priority: "high", "medium", or "low"
- Do not produce a schedule until you have enough information to make it honest

TONE:
- Measured. Unhurried. You have seen everything and judge nothing — but you miss nothing either.
- Warm, but not effusive. Caring, but not coddling.
- Brief responses. You do not need many words.
- No exclamation marks. No hollow encouragement.`;




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
function roundTo15(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMinutes = h * 60 + Math.round(m / 15) * 15;
  const rh = Math.floor(totalMinutes / 60) % 24;
  const rm = totalMinutes % 60;
  return `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}`;
}

export async function getTaskAdvice(taskName, priority, duration) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are Mortimer — a wise rubber duck scheduling assistant. Measured, unhurried, slightly intimidating but deeply caring. No exclamation marks. No hollow encouragement. Reply with JSON in this shape: { "advice": "your advice here" }`,
      },
      {
        role: "user",
        content: `The user has a task: "${taskName}" (${duration} minutes, ${priority} priority). Give exactly 3 ultra-short bullet points of practical advice. Each bullet must be 4–7 words. Reply with JSON: { "bullets": ["...", "...", "..."] }`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(completion.choices[0].message.content);
    return parsed.bullets || [];
  } catch {
    return [];
  }
}

export async function askRubberDucky(transcribedText, history = []) {

  // Inject the current time so the duck never schedules tasks in the past.
  // Formatted as a readable string ("Monday, 2:34 PM") so the LLM understands it naturally.
  const now = new Date();
  const timeContext = now.toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    // A second system message with the live timestamp — placed before history
    // so the model always knows what "now" is without repeating it in every turn.
    { role: "system", content: `The current time is ${timeContext}. Do not schedule anything before this time.` },
    ...history,
    { role: "user", content: transcribedText },
  ];

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: "json_object" },
  });

  const rawReply = completion.choices[0].message.content;

  // The model is forced into JSON mode, so rawReply is always a JSON object.
  // Parse it and pull out the three fields we care about.
  let parsed;
  try {
    parsed = JSON.parse(rawReply);
  } catch {
    // If the model somehow returns non-JSON, surface the raw text and no schedule.
    return { reply: rawReply.trim(), schedule: null };
  }

  const reply = parsed.reply?.trim() || "Your plan is ready.";

  let schedule = null;
  if (parsed.tasks && parsed.schedule) {
    schedule = {
      tasks: parsed.tasks,
      schedule: parsed.schedule.map((block) => ({
        ...block,
        startTime: roundTo15(block.startTime),
        endTime:   roundTo15(block.endTime),
      })),
    };
  }

  return { reply, schedule };
}
