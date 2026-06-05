// =============================================================================
// services/rubberDucky.js
// =============================================================================
// Responsible for one thing: taking a piece of text the user spoke and getting
// a helpful "rubber ducky" response from Groq's LLM.
//
// "Rubber duck debugging" is a real technique where programmers explain their
// problem out loud to a rubber duck — the act of articulating it often reveals
// the solution. This service plays the role of a duck that actually talks back.
// =============================================================================

import Groq from "groq-sdk";

const groq = new Groq(); // auto-reads GROQ_API_KEY from process.env


// -----------------------------------------------------------------------------
// SYSTEM PROMPT
// The system prompt is a set of instructions sent to the LLM before the
// user's message. It defines the AI's persona, rules, and context.
// Keeping it as a constant up here makes it easy to find and tweak.
// -----------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a friendly and helpful rubber duck assistant.

The user has spoken a sentence or question out loud to their computer.
Your job is to listen carefully and respond like a thoughtful rubber duck
debugging partner — supportive, constructive, and concise.

A few guidelines:
- If they seem to be describing a problem or bug, ask a gentle clarifying
  question or point out something they might have overlooked.
- If they're just thinking out loud, reflect their idea back and affirm
  or gently challenge it.
- Keep your response short (2–4 sentences). You're a duck, not a textbook.
- Be warm and encouraging. Quack sparingly.`;


// -----------------------------------------------------------------------------
// askRubberDucky()
//
// Sends the transcribed text to Groq's LLM chat API and returns the response.
//
// Parameters:
//   transcribedText  {string}  — what the user said (from the Whisper service)
//
// Returns:
//   {Promise<string>}          — the rubber ducky's response
// -----------------------------------------------------------------------------
export async function askRubberDucky(transcribedText) {

  // groq.chat.completions.create() calls the LLM API.
  // It follows the same "messages array" format as the OpenAI API, which Groq
  // is compatible with. Each message has a "role" and "content":
  //   "system"    → background instructions the model follows (the user never sees this)
  //   "user"      → what the user said
  //   "assistant" → what the model previously replied (used to build multi-turn chats)
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", // a capable, fast open-source LLM hosted on Groq

    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        // Give the model context that this text was spoken, not typed.
        // This shapes how it interprets casual phrasing or incomplete sentences.
        content: `The user spoke this to their computer: "${transcribedText}"`,
      },
    ],

    // temperature controls how creative/random the response is.
    // 0.0 = deterministic, 1.0 = very creative. 0.7 is a good balance for conversation.
    temperature: 0.7,

    // max_tokens caps the response length. 1 token ≈ ¾ of a word.
    // 300 tokens is roughly 3–5 sentences — plenty for a rubber ducky.
    max_tokens: 300,
  });

  // The LLM response is nested inside an array of "choices" (you can request
  // multiple response variations at once; we're just using the first).
  // .message.content is the actual text string we want.
  return completion.choices[0].message.content;
}
