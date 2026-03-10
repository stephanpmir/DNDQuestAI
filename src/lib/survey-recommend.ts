import type { BeginnerSurvey, CharacterClass, Race } from "@/types/character";
import { CLASSES, RACES } from "@/types/character";

/**
 * Score tables for mapping survey answers → class/race affinity.
 *
 * Each survey axis awards points to classes/races. The highest-scoring
 * class and race become the recommendation. Every class and race has
 * at least one survey path that makes it the top pick.
 */

// ── Class scoring ──────────────────────────────────────────────────

type ClassScores = Record<CharacterClass, number>;

const PLAYSTYLE_CLASS: Record<BeginnerSurvey["playstyle"], Partial<ClassScores>> = {
  fighting:  { Barbarian: 3, Fighter: 3, Paladin: 2, Ranger: 1, Monk: 2 },
  sneaking:  { Rogue: 3, Ranger: 2, Monk: 1, Bard: 1 },
  magic:     { Wizard: 3, Sorcerer: 3, Warlock: 2, Druid: 2, Cleric: 1 },
  talking:   { Bard: 3, Warlock: 2, Sorcerer: 1, Paladin: 1, Rogue: 1 },
};

const TEAM_ROLE_CLASS: Record<BeginnerSurvey["teamRole"], Partial<ClassScores>> = {
  "lone-wolf":   { Rogue: 2, Ranger: 2, Barbarian: 2, Warlock: 2, Monk: 2 },
  "team-player": { Cleric: 3, Bard: 2, Druid: 2, Wizard: 1 },
  leader:        { Paladin: 3, Bard: 2, Fighter: 2, Cleric: 1 },
};

const RISK_CLASS: Record<BeginnerSurvey["riskStyle"], Partial<ClassScores>> = {
  cautious:  { Wizard: 2, Cleric: 2, Ranger: 2, Druid: 1 },
  balanced:  { Fighter: 1, Bard: 1, Paladin: 1, Sorcerer: 1, Monk: 1, Rogue: 1 },
  reckless:  { Barbarian: 3, Sorcerer: 2, Warlock: 1, Monk: 1 },
};

const THEME_CLASS: Record<BeginnerSurvey["theme"], Partial<ClassScores>> = {
  martial: { Fighter: 3, Barbarian: 2, Monk: 3, Ranger: 1 },
  arcane:  { Wizard: 3, Sorcerer: 3, Warlock: 2 },
  holy:    { Cleric: 3, Paladin: 3 },
  nature:  { Druid: 3, Ranger: 3, Barbarian: 1 },
  shadow:  { Rogue: 3, Warlock: 2, Monk: 1, Ranger: 1 },
};

const COMPLEXITY_CLASS: Record<BeginnerSurvey["complexity"], Partial<ClassScores>> = {
  simple:   { Barbarian: 3, Fighter: 3, Monk: 2, Rogue: 2 },
  moderate: { Paladin: 2, Ranger: 2, Cleric: 2, Bard: 2, Warlock: 2, Druid: 1 },
  complex:  { Wizard: 3, Sorcerer: 2, Druid: 2, Bard: 1 },
};

// ── Race scoring ───────────────────────────────────────────────────

type RaceScores = Record<Race, number>;

const PLAYSTYLE_RACE: Record<BeginnerSurvey["playstyle"], Partial<RaceScores>> = {
  fighting:  { "Half-Orc": 3, Dragonborn: 2, Dwarf: 2, Human: 1 },
  sneaking:  { Halfling: 3, Elf: 2, Gnome: 1, "Half-Elf": 1 },
  magic:     { Elf: 2, Gnome: 3, Tiefling: 2, "Half-Elf": 1 },
  talking:   { "Half-Elf": 3, Human: 2, Tiefling: 2, Halfling: 1 },
};

const TEAM_ROLE_RACE: Record<BeginnerSurvey["teamRole"], Partial<RaceScores>> = {
  "lone-wolf":   { "Half-Orc": 2, Tiefling: 2, Elf: 1, Dragonborn: 1 },
  "team-player": { Halfling: 2, Gnome: 2, "Half-Elf": 2, Dwarf: 2 },
  leader:        { Human: 2, Dragonborn: 3, "Half-Elf": 1 },
};

const RISK_RACE: Record<BeginnerSurvey["riskStyle"], Partial<RaceScores>> = {
  cautious:  { Gnome: 2, Elf: 1, Halfling: 2, Dwarf: 1 },
  balanced:  { Human: 2, "Half-Elf": 1, Dragonborn: 1 },
  reckless:  { "Half-Orc": 2, Dragonborn: 2, Tiefling: 2 },
};

const THEME_RACE: Record<BeginnerSurvey["theme"], Partial<RaceScores>> = {
  martial: { Human: 2, Dwarf: 2, Dragonborn: 2, "Half-Orc": 1 },
  arcane:  { Gnome: 2, Elf: 2, Tiefling: 2 },
  holy:    { Human: 2, Dwarf: 2, Dragonborn: 1 },
  nature:  { Elf: 3, Halfling: 2, Gnome: 1 },
  shadow:  { Tiefling: 3, "Half-Elf": 2, Halfling: 1, "Half-Orc": 1 },
};

// Complexity doesn't strongly influence race, but some nudges:
const COMPLEXITY_RACE: Record<BeginnerSurvey["complexity"], Partial<RaceScores>> = {
  simple:   { Human: 2, "Half-Orc": 1, Dwarf: 1 },
  moderate: { "Half-Elf": 1, Dragonborn: 1, Tiefling: 1 },
  complex:  { Gnome: 2, Elf: 1, Tiefling: 1 },
};

// ── Scoring engine ─────────────────────────────────────────────────

function scoreClasses(survey: BeginnerSurvey): ClassScores {
  const scores = Object.fromEntries(CLASSES.map((c) => [c, 0])) as ClassScores;

  const tables = [
    PLAYSTYLE_CLASS[survey.playstyle],
    TEAM_ROLE_CLASS[survey.teamRole],
    RISK_CLASS[survey.riskStyle],
    THEME_CLASS[survey.theme],
    COMPLEXITY_CLASS[survey.complexity],
  ];

  for (const table of tables) {
    for (const [cls, pts] of Object.entries(table)) {
      scores[cls as CharacterClass] += pts;
    }
  }

  return scores;
}

function scoreRaces(survey: BeginnerSurvey): RaceScores {
  const scores = Object.fromEntries(RACES.map((r) => [r, 0])) as RaceScores;

  const tables = [
    PLAYSTYLE_RACE[survey.playstyle],
    TEAM_ROLE_RACE[survey.teamRole],
    RISK_RACE[survey.riskStyle],
    THEME_RACE[survey.theme],
    COMPLEXITY_RACE[survey.complexity],
  ];

  for (const table of tables) {
    for (const [race, pts] of Object.entries(table)) {
      scores[race as Race] += pts;
    }
  }

  return scores;
}

export interface SurveyRecommendation {
  race: Race;
  characterClass: CharacterClass;
  raceScores: RaceScores;
  classScores: ClassScores;
}

export function recommend(survey: BeginnerSurvey): SurveyRecommendation {
  const classScores = scoreClasses(survey);
  const raceScores = scoreRaces(survey);

  let bestClass: CharacterClass = CLASSES[0];
  let bestClassScore = -1;
  for (const cls of CLASSES) {
    if (classScores[cls] > bestClassScore) {
      bestClassScore = classScores[cls];
      bestClass = cls;
    }
  }

  let bestRace: Race = RACES[0];
  let bestRaceScore = -1;
  for (const race of RACES) {
    if (raceScores[race] > bestRaceScore) {
      bestRaceScore = raceScores[race];
      bestRace = race;
    }
  }

  return {
    race: bestRace,
    characterClass: bestClass,
    raceScores,
    classScores,
  };
}
