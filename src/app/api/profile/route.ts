import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { BeginnerSurvey } from "@/types/character";
import { RACES, CLASSES } from "@/types/character";

function getClient(): { client: OpenAI; model: string } {
  // Primary: Z.ai
  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    return {
      client: new OpenAI({ baseURL: "https://api.z.ai/api/paas/v4", apiKey: zaiKey, timeout: 30_000 }),
      model: "glm-4",
    };
  }
  // Fallback: Cerebras
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  if (cerebrasKey) {
    return {
      client: new OpenAI({ baseURL: "https://api.cerebras.ai/v1", apiKey: cerebrasKey, timeout: 30_000 }),
      model: "llama3.1-8b",
    };
  }
  throw new Error("No LLM API key set. Set ZAI_API_KEY or CEREBRAS_API_KEY.");
}

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("timeout") || msg.includes("econnreset") ||
      msg.includes("503") || msg.includes("502") || msg.includes("429") ||
      msg.includes("fetch failed");
  }
  return false;
}

interface ProfileRequest {
  survey: BeginnerSurvey;
  /** Optional pre-selected race/class from the scoring engine */
  suggestedRace?: string;
  suggestedClass?: string;
}

export interface GeneratedProfile {
  name: string;
  race: string;
  class: string;
  gender: string;
  backstory: string;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    wisdom: number;
    intelligence: number;
    charisma: number;
  };
}

function buildPrompt(survey: BeginnerSurvey, suggestedRace?: string, suggestedClass?: string): string {
  const raceList = RACES.join(", ");
  const classList = CLASSES.join(", ");

  return `You are a D&D 5e character creation assistant. Based on the player's preferences, generate a complete character suggestion.

Player preferences:
- Playstyle: ${survey.playstyle} (${survey.playstyle === "fighting" ? "melee combat" : survey.playstyle === "sneaking" ? "stealth and subterfuge" : survey.playstyle === "magic" ? "spellcasting" : "diplomacy and persuasion"})
- Team role: ${survey.teamRole}
- Risk style: ${survey.riskStyle}
- Theme preference: ${survey.theme}
- Desired complexity: ${survey.complexity}
${suggestedRace ? `- Suggested race: ${suggestedRace}` : ""}
${suggestedClass ? `- Suggested class: ${suggestedClass}` : ""}

Valid races: ${raceList}
Valid classes: ${classList}
Valid genders: Male, Female

Generate a character with a fitting name, the suggested race and class (or pick better ones if they don't match the preferences), a gender, ability scores (each 8-18, optimized for the class), and a 2-3 sentence backstory that reflects the player's preferences.

Respond with ONLY valid JSON in this exact format, no extra text:
{"name":"...","race":"...","class":"...","gender":"...","backstory":"...","abilityScores":{"strength":0,"dexterity":0,"constitution":0,"wisdom":0,"intelligence":0,"charisma":0}}`;
}

function parseProfile(raw: string): GeneratedProfile | null {
  // Extract JSON from the response (handles markdown code blocks too)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const obj = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!obj.name || !obj.race || !obj.class || !obj.backstory || !obj.abilityScores) {
      return null;
    }

    // Validate race and class are from valid lists
    const validRace = RACES.includes(obj.race);
    const validClass = CLASSES.includes(obj.class);
    if (!validRace || !validClass) return null;

    // Clamp ability scores to 8-18
    const scores = obj.abilityScores;
    const clamp = (v: unknown) => Math.max(8, Math.min(18, Number(v) || 10));

    return {
      name: String(obj.name).slice(0, 30),
      race: obj.race,
      class: obj.class,
      gender: obj.gender === "Female" ? "Female" : "Male",
      backstory: String(obj.backstory).slice(0, 500),
      abilityScores: {
        strength: clamp(scores.strength),
        dexterity: clamp(scores.dexterity),
        constitution: clamp(scores.constitution),
        wisdom: clamp(scores.wisdom),
        intelligence: clamp(scores.intelligence),
        charisma: clamp(scores.charisma),
      },
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProfileRequest;
    const { survey, suggestedRace, suggestedClass } = body;

    if (!survey || !survey.playstyle) {
      return NextResponse.json(
        { error: "Missing survey data" },
        { status: 400 }
      );
    }

    const { client, model } = getClient();
    const prompt = buildPrompt(survey, suggestedRace, suggestedClass);

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 512,
          temperature: 0.8,
        });

        const raw = response.choices[0]?.message?.content ?? "";
        const profile = parseProfile(raw);

        if (profile) {
          return NextResponse.json({ profile });
        }

        // Parse failed — retry with lower temperature
        if (attempt < MAX_RETRIES) continue;
        return NextResponse.json(
          { error: "Failed to parse AI response into valid profile" },
          { status: 502 }
        );
      } catch (error) {
        lastError = error;
        if (!isRetryable(error) || attempt >= MAX_RETRIES) break;
        await new Promise((r) => setTimeout(r, RETRY_BASE_MS * Math.pow(2, attempt)));
      }
    }

    const errMsg = lastError instanceof Error ? lastError.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
