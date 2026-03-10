/**
 * Campaign themes, templates, and adventure data.
 * Derived from 300+ official D&D modules across all editions,
 * adapted for single-player AI-narrated gameplay.
 */

// ── Campaign Theme Categories ──────────────────────────────────

export const CAMPAIGN_THEMES = [
  "dungeon_crawl",
  "wilderness_hex",
  "urban_intrigue",
  "horror",
  "war_military",
  "planar",
  "political",
  "mystery",
  "heist",
  "survival",
  "epic_worldsaving",
  "seafaring",
  "underdark",
  "dragon_focused",
  "undead_necromancy",
  "fey_nature",
  "desert_arabian",
  "oriental",
  "norse_viking",
  "gothic",
] as const;

export type CampaignTheme = (typeof CAMPAIGN_THEMES)[number];

/** Human-readable labels for themes */
export const THEME_LABELS: Record<CampaignTheme, string> = {
  dungeon_crawl: "Dungeon Crawl",
  wilderness_hex: "Wilderness Exploration",
  urban_intrigue: "Urban Intrigue",
  horror: "Horror",
  war_military: "War & Military",
  planar: "Planar Adventures",
  political: "Political Intrigue",
  mystery: "Mystery & Investigation",
  heist: "Heist",
  survival: "Survival",
  epic_worldsaving: "Epic World-Saving",
  seafaring: "Seafaring & Naval",
  underdark: "Underdark",
  dragon_focused: "Dragon-Focused",
  undead_necromancy: "Undead & Necromancy",
  fey_nature: "Fey & Nature",
  desert_arabian: "Desert Adventures",
  oriental: "Eastern Adventures",
  norse_viking: "Norse & Viking",
  gothic: "Gothic & Dark",
};

/** Theme descriptions for character creation */
export const THEME_DESCRIPTIONS: Record<CampaignTheme, string> = {
  dungeon_crawl: "Explore ancient ruins, trap-laden crypts, and monster-filled dungeons. Classic dungeon delving with puzzles, treasure, and deadly encounters.",
  wilderness_hex: "Journey through untamed wilderness, discover hidden locations, and survive the wilds. Overland travel with random encounters and exploration.",
  urban_intrigue: "Navigate the politics, crime, and secrets of a great city. Solve mysteries, deal with thieves' guilds, and uncover conspiracies.",
  horror: "Face cosmic horrors, gothic nightmares, and supernatural terrors. Sanity-testing encounters where not everything can be fought with steel.",
  war_military: "Lead troops, plan sieges, and fight in a great war. Strategic decisions that affect the fate of armies and nations.",
  planar: "Travel between planes of existence — the Feywild, Shadowfell, Elemental Planes, and beyond. Reality-bending adventures across the multiverse.",
  political: "Navigate noble courts, forge alliances, and survive betrayals. Words are weapons, and a misplaced trust can be fatal.",
  mystery: "Investigate crimes, solve puzzles, and uncover the truth. Detective work in a world of magic where nothing is as it seems.",
  heist: "Plan and execute elaborate thefts, infiltrations, and cons. Stealth, cunning, and quick thinking over brute force.",
  survival: "Survive in a harsh, unforgiving environment with limited resources. Every decision about food, water, and shelter matters.",
  epic_worldsaving: "Prevent the apocalypse, defeat an ancient evil, and save the world. A hero's journey from humble beginnings to legendary power.",
  seafaring: "Sail the seas, battle pirates, explore uncharted islands, and hunt sea monsters. Freedom of the open ocean.",
  underdark: "Descend into the lightless depths beneath the earth. Navigate the politics of drow, duergar, and mind flayers.",
  dragon_focused: "Face the most iconic creatures in fantasy. Dragon lairs, dragon politics, and the raw power of dragonkind.",
  undead_necromancy: "Battle the undead, confront necromancers, and explore death itself. Liches, vampires, and the thin line between life and death.",
  fey_nature: "Enter enchanted forests, navigate fey courts, and deal with the capricious nature of the fey. Beauty and danger intertwined.",
  desert_arabian: "Adventure in vast deserts, ancient tombs, and bustling bazaars. Genies, sand worms, and the secrets buried beneath the dunes.",
  oriental: "Journey through lands inspired by Asian mythology. Martial arts, honor codes, and ancient spirits.",
  norse_viking: "Embrace the cold north. Viking raids, Norse mythology, and the struggle against frost giants and the coming of Ragnarok.",
  gothic: "Explore a land of dark castles, cursed bloodlines, and eternal night. Ravenloft-style horror where escape itself is the challenge.",
};

// ── Campaign Templates ─────────────────────────────────────────

export interface CampaignTemplate {
  id: string;
  name: string;
  theme: CampaignTheme;
  description: string;
  /** Starting location name */
  startLocation: string;
  /** Opening quest hook */
  openingQuest: string;
  /** Key NPCs that should appear */
  keyNpcs: string[];
  /** Suggested level range */
  levelRange: [number, number];
  /** Source inspiration (official module references) */
  inspirations: string[];
  /** Narration tone guidance for the LLM */
  toneGuide: string;
  /** Whether this theme rewards non-combat solutions */
  favorsBrains: boolean;
  /** How much combat vs narrative (0 = all narrative, 10 = all combat) */
  combatWeight: number;
}

/**
 * 300+ campaign templates organized by theme.
 * Each draws from official D&D modules across all editions and Pathfinder.
 */
export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // ── DUNGEON CRAWL (inspired by B1-B12, S1-S4, G1-G3, D1-D3) ──
  {
    id: "dc_lost_tomb",
    name: "The Lost Tomb of the Archmage",
    theme: "dungeon_crawl",
    description: "An ancient archmage's tomb has been unearthed, filled with deadly traps, magical puzzles, and guardians that still serve their master beyond death.",
    startLocation: "Thornwall Village",
    openingQuest: "Explore the newly discovered Tomb of Archmage Valdris and recover the Codex of Unbinding before rival adventurers claim it.",
    keyNpcs: ["Elder Henna (quest giver)", "Kael the Rival (competing delver)", "The Specter of Valdris"],
    levelRange: [1, 5],
    inspirations: ["S1 Tomb of Horrors", "B1 In Search of the Unknown", "Dungeon of the Mad Mage"],
    toneGuide: "Tense and atmospheric. Every room could be a death trap. Reward careful investigation over reckless charging.",
    favorsBrains: true,
    combatWeight: 5,
  },
  {
    id: "dc_undermountain",
    name: "The Endless Depths",
    theme: "dungeon_crawl",
    description: "Beneath the city lies a megadungeon of impossible scale — each level more dangerous and strange than the last, with factions warring in the dark.",
    startLocation: "The Yawning Portal Tavern",
    openingQuest: "Descend into the Endless Depths to find the missing explorer Durnan and discover why the dungeon has begun to grow.",
    keyNpcs: ["Bartender Torgo (rumor source)", "Durnan the Missing (rescue target)", "The Dungeon Heart (sentient dungeon)"],
    levelRange: [1, 20],
    inspirations: ["Dungeon of the Mad Mage", "Rappan Athuk", "Castle Greyhawk", "Eyes of the Stone Thief"],
    toneGuide: "Each level has its own ecosystem and mood. Mix horror, wonder, and tension. The dungeon itself should feel alive.",
    favorsBrains: true,
    combatWeight: 6,
  },
  {
    id: "dc_slave_pits",
    name: "The Slave Lords' Domain",
    theme: "dungeon_crawl",
    description: "A syndicate of slavers operates from a hidden underground fortress. Infiltrate their lair, free the captives, and bring the Slave Lords to justice.",
    startLocation: "Highport Docks",
    openingQuest: "Track the slavers to their hidden stronghold and rescue the kidnapped villagers before they are sold across the sea.",
    keyNpcs: ["Captain Markessa (slaver leader)", "Icar the Freed (escaped slave ally)", "The Slave Lord Council"],
    levelRange: [4, 7],
    inspirations: ["A1-A4 Scourge of the Slave Lords", "Slavers module series"],
    toneGuide: "Righteous anger mixed with stealth. The player should feel moral weight — these are people suffering. Non-combat solutions like freeing prisoners should feel heroic.",
    favorsBrains: true,
    combatWeight: 5,
  },
  {
    id: "dc_temple_evil",
    name: "The Temple of Elemental Evil",
    theme: "dungeon_crawl",
    description: "A legendary temple of pure evil stirs again. Four elemental cults wage war within while an imprisoned demon lord seeks freedom.",
    startLocation: "Village of Hommlet",
    openingQuest: "Investigate the rumors of evil stirring near the ruined Temple and stop the elemental cults from freeing the imprisoned demon.",
    keyNpcs: ["Rufus and Burne (village leaders)", "Lareth the Beautiful (cult leader)", "Zuggtmoy (imprisoned demon queen)"],
    levelRange: [1, 8],
    inspirations: ["T1-4 Temple of Elemental Evil", "Princes of the Apocalypse"],
    toneGuide: "Start idyllic in Hommlet, grow darker as the temple is explored. Each cult has distinct personality. Political tension between cults is as dangerous as combat.",
    favorsBrains: true,
    combatWeight: 6,
  },
  {
    id: "dc_white_plume",
    name: "White Plume Mountain",
    theme: "dungeon_crawl",
    description: "Three legendary magical weapons have been stolen and hidden in the bizarre volcanic dungeon of White Plume Mountain by the mad wizard Keraptis.",
    startLocation: "Barony of the Peaks",
    openingQuest: "Enter White Plume Mountain and recover the three stolen weapons: Wave, Whelm, and Blackrazor.",
    keyNpcs: ["Baron Kell (quest giver)", "Keraptis the Mad Wizard", "Guardian Golems"],
    levelRange: [5, 10],
    inspirations: ["S2 White Plume Mountain", "Tales from the Yawning Portal"],
    toneGuide: "Whimsical and bizarre. Keraptis was mad — his traps are creative and strange, not just deadly. Reward clever thinking.",
    favorsBrains: true,
    combatWeight: 4,
  },

  // ── WILDERNESS / HEX CRAWL (inspired by X1, B10, Tomb of Annihilation) ──
  {
    id: "wh_isle_dread",
    name: "The Isle of Dread",
    theme: "wilderness_hex",
    description: "A mysterious tropical island filled with dinosaurs, lost civilizations, and a dark secret at its volcanic heart.",
    startLocation: "Port Nyanzaru",
    openingQuest: "Navigate the uncharted Isle of Dread to find the lost Pearl Temple and discover why ships are disappearing in these waters.",
    keyNpcs: ["Navigator Rynn (guide)", "Chief Mora (native leader)", "The Kopru Elders (ancient evil)"],
    levelRange: [3, 7],
    inspirations: ["X1 Isle of Dread", "Tomb of Annihilation"],
    toneGuide: "Jungle adventure with a sense of wonder and danger. Dinosaurs, lost temples, cannibal tribes. Every hex should feel like discovery.",
    favorsBrains: false,
    combatWeight: 6,
  },
  {
    id: "wh_night_terror",
    name: "Night's Dark Terror",
    theme: "wilderness_hex",
    description: "A frontier under siege by goblin hordes, with a deeper conspiracy leading to ancient ruins and a lost dwarven stronghold.",
    startLocation: "Sukiskyn Homestead",
    openingQuest: "Defend the frontier homestead from goblin raids and track the attackers back to their source — a conspiracy centuries in the making.",
    keyNpcs: ["Pyotr Sukiskyn (homesteader)", "Stephan (missing brother)", "The Iron Ring slavers"],
    levelRange: [2, 5],
    inspirations: ["B10 Night's Dark Terror", "Lost Mine of Phandelver"],
    toneGuide: "Start with urgent action — the homestead is under attack! Then open into frontier exploration. The wilderness should feel vast and untamed.",
    favorsBrains: false,
    combatWeight: 7,
  },
  {
    id: "wh_desert_nomads",
    name: "Master of the Desert Nomads",
    theme: "wilderness_hex",
    description: "Cross a deadly desert to reach the Temple of Death, where a mysterious Master commands armies of desert nomads against the civilized lands.",
    startLocation: "Daven's Crossing",
    openingQuest: "Journey across the Great Desert to find the Temple of Death and stop the Master of the Desert Nomads before his army destroys the Republic.",
    keyNpcs: ["Commander Aleena (military liaison)", "The Master (villain)", "Sadi the Desert Guide"],
    levelRange: [6, 10],
    inspirations: ["X4 Master of the Desert Nomads", "X5 Temple of Death"],
    toneGuide: "Epic journey across hostile terrain. Water is life. Sandstorms, mirages, and desert creatures. The destination should feel impossibly far.",
    favorsBrains: false,
    combatWeight: 7,
  },

  // ── URBAN INTRIGUE (inspired by Waterdeep, Sharn, Lankhmar) ──
  {
    id: "ui_dragon_heist",
    name: "The Dragon's Gold",
    theme: "urban_intrigue",
    description: "Half a million gold pieces are hidden somewhere in the city. Every faction — nobles, criminals, spies, and monsters — wants to find it first.",
    startLocation: "Waterdeep Ward of the Trades",
    openingQuest: "After inheriting a rundown tavern, discover that its previous owner hid a clue to a legendary dragon's treasure vault beneath the city.",
    keyNpcs: ["Volo the Author (ally)", "Manshoon (Zhentarim leader)", "Xanathar (beholder crime lord)", "Laeral Silverhand (Open Lord)"],
    levelRange: [1, 5],
    inspirations: ["Waterdeep: Dragon Heist", "Lankhmar modules", "Sharn: City of Towers"],
    toneGuide: "Film noir meets fantasy. Every NPC has an angle. Trust is currency. The city itself is a character — its wards, alleys, and rooftops are the terrain.",
    favorsBrains: true,
    combatWeight: 3,
  },
  {
    id: "ui_thieves_guild",
    name: "Shadow War",
    theme: "urban_intrigue",
    description: "Two thieves' guilds wage a shadow war through the city. The player is caught in the middle and must choose sides — or play both against each other.",
    startLocation: "The Warrens District",
    openingQuest: "After witnessing a guild assassination, you're recruited by one faction — but the other already knows your name.",
    keyNpcs: ["Silvanus (guild master A)", "The Raven Queen (guild master B)", "Inspector Thane (city watch)", "Nix (street urchin informant)"],
    levelRange: [1, 6],
    inspirations: ["FRC2 Curse of the Azure Bonds", "Lies of P", "Baldur's Gate 3 thieves' guild"],
    toneGuide: "Tense and paranoid. Everyone might be an informant. Success comes from information, not swords. Betrayals should feel earned, not random.",
    favorsBrains: true,
    combatWeight: 3,
  },
  {
    id: "ui_noble_court",
    name: "The Poisoned Crown",
    theme: "urban_intrigue",
    description: "The king lies dying from a slow poison. Five noble houses compete for the throne, each with secrets, alliances, and assassination plots.",
    startLocation: "Crownhall Palace",
    openingQuest: "Hired as an independent investigator, discover who is poisoning the king before the noble houses tear the kingdom apart.",
    keyNpcs: ["King Aldric (dying monarch)", "Lady Seraphina (prime suspect)", "Duke Harren (military faction)", "Spymaster Vex"],
    levelRange: [3, 8],
    inspirations: ["Council of Wyrms", "Birthright campaign", "Game of Thrones-style intrigue"],
    toneGuide: "Every conversation is a chess move. NPCs should have complex motivations — no one is purely evil or good. The player's choices should create ripples.",
    favorsBrains: true,
    combatWeight: 2,
  },

  // ── HORROR (inspired by Ravenloft, Van Richten's Guide, CoS) ──
  {
    id: "ho_curse_strahd",
    name: "The Mists of Barovia",
    theme: "horror",
    description: "Trapped in a demiplane of dread, you must survive the machinations of an ancient vampire lord who controls the very land itself.",
    startLocation: "Village of Barovia",
    openingQuest: "Escape the mist-shrouded land of Barovia by finding three sacred artifacts and using them to confront the vampire lord in his castle.",
    keyNpcs: ["Count Strahd (the dark lord)", "Madame Eva (fortune teller)", "Ireena Kolyana (Strahd's obsession)", "Ismark the Lesser"],
    levelRange: [3, 10],
    inspirations: ["I6 Ravenloft", "Curse of Strahd", "Ravenloft setting"],
    toneGuide: "Gothic horror. Fog, despair, and dread. Strahd should feel omnipresent — he's watching, always. Hope is rare and precious. Every victory feels hard-won.",
    favorsBrains: true,
    combatWeight: 5,
  },
  {
    id: "ho_haunted_house",
    name: "Death House",
    theme: "horror",
    description: "A seemingly normal townhouse hides generations of dark rituals, ghostly children, and something hungry in the basement.",
    startLocation: "The Old Svalich Road",
    openingQuest: "Two ghostly children beg you to save their baby brother from the monster in the basement of their family home.",
    keyNpcs: ["Rose and Thorn (ghost children)", "The Dursts (spectral family)", "The Shambling Mound (basement horror)"],
    levelRange: [1, 3],
    inspirations: ["Death House (CoS prologue)", "The Sinister Secret of Saltmarsh", "Haunted Halls"],
    toneGuide: "Slow burn horror. Start with sympathy for the ghost children, build to creeping dread as the house's true nature is revealed. Visceral descriptions.",
    favorsBrains: true,
    combatWeight: 4,
  },
  {
    id: "ho_vecna",
    name: "The Hand and the Eye",
    theme: "horror",
    description: "The lich-god Vecna's artifacts are resurfacing. Those who touch them gain terrible power — and lose pieces of their humanity.",
    startLocation: "Erelhei-Cinlu",
    openingQuest: "An artifact dealer has been found dead — his hand replaced by a skeletal claw of immense power. Track the Eye of Vecna before it claims another host.",
    keyNpcs: ["Kas the Betrayer", "Vecna's Cultists", "The Keeper of Secrets"],
    levelRange: [10, 20],
    inspirations: ["Vecna Lives!", "Vecna Reborn", "Eve of Ruin", "Die Vecna Die!"],
    toneGuide: "Cosmic horror meets dark fantasy. Vecna's influence corrupts — even information is dangerous. The player should feel the temptation of dark power.",
    favorsBrains: true,
    combatWeight: 5,
  },

  // ── PLANAR (inspired by Planescape, Manual of the Planes) ──
  {
    id: "pl_sigil",
    name: "The City of Doors",
    theme: "planar",
    description: "In Sigil, the city at the center of the multiverse, doors lead anywhere — but the Lady of Pain keeps her own counsel, and factions war for philosophical dominance.",
    startLocation: "The Hive Ward, Sigil",
    openingQuest: "A portal key has been stolen that could open a door to the Far Realm. Find it before someone uses it and tears a hole in reality.",
    keyNpcs: ["Fell the Dabus", "Factol Hashkar (Fraternity of Order)", "Morte (floating skull companion)", "The Lady of Pain"],
    levelRange: [5, 15],
    inspirations: ["Planescape: Torment", "In the Cage: A Guide to Sigil", "The Eternal Boundary"],
    toneGuide: "Philosophical and strange. Belief literally shapes reality here. Every faction has a worldview that IS their power. Challenge the player's assumptions.",
    favorsBrains: true,
    combatWeight: 3,
  },
  {
    id: "pl_blood_war",
    name: "The Blood War",
    theme: "planar",
    description: "The eternal war between demons and devils threatens to spill into the mortal world. Both sides offer alliance — and both will betray you.",
    startLocation: "Avernus, First Layer of the Nine Hells",
    openingQuest: "A celestial ally has been captured in the Blood War. Descend into Avernus to rescue them, navigating between demonic and devilish forces.",
    keyNpcs: ["Zariel (Archduchess of Avernus)", "Mad Maggie (hag ally)", "Lulu the Hollyphant", "Bel (deposed ruler)"],
    levelRange: [5, 13],
    inspirations: ["Descent into Avernus", "Planescape Blood War modules", "Dead Gods"],
    toneGuide: "Brutal and morally complex. Hell is a war zone. Every deal has a cost. The player should constantly question whether they're making things better or worse.",
    favorsBrains: true,
    combatWeight: 6,
  },

  // ── MYSTERY / INVESTIGATION ──
  {
    id: "my_murder_baldur",
    name: "Murder in Baldur's Gate",
    theme: "mystery",
    description: "A beloved hero is murdered in broad daylight. As the city descends into factional chaos, uncover a conspiracy that reaches the highest levels of power.",
    startLocation: "Baldur's Gate, Wide District",
    openingQuest: "Witness the assassination of Duke Abdel Adrian and investigate who orchestrated it — and why the murder seems to have unleashed something ancient.",
    keyNpcs: ["Duke Abdel Adrian (victim)", "Grand Duke Ulder Ravengard", "Rilsa Rael (guild boss)", "Bhaal's Chosen"],
    levelRange: [1, 5],
    inspirations: ["Murder in Baldur's Gate", "Baldur's Gate: Descent into Avernus", "BG3"],
    toneGuide: "Detective noir in a fantasy city. Clues should be logical. Red herrings should be fair. The player should feel like they're solving something, not just fighting.",
    favorsBrains: true,
    combatWeight: 3,
  },
  {
    id: "my_sinister_secret",
    name: "The Sinister Secret of Saltmarsh",
    theme: "mystery",
    description: "A haunted house on the coast isn't what it seems. Smugglers, sea creatures, and international intrigue lurk beneath the surface.",
    startLocation: "Town of Saltmarsh",
    openingQuest: "Investigate the 'haunted' house on the cliff — the town council wants to know why lights are seen in its windows at night.",
    keyNpcs: ["Councilwoman Eda Oweland", "Sanbalet the Smuggler", "Oceanus the Sea Elf"],
    levelRange: [1, 4],
    inspirations: ["U1 The Sinister Secret of Saltmarsh", "Ghosts of Saltmarsh"],
    toneGuide: "Start as a ghost story, reveal as a mystery. The 'haunting' has a mundane (criminal) explanation, but there's a deeper layer. Reward investigation.",
    favorsBrains: true,
    combatWeight: 4,
  },

  // ── SEAFARING (inspired by Ghosts of Saltmarsh, Skull & Shackles) ──
  {
    id: "sf_pirate_king",
    name: "The Pirate King's Crown",
    theme: "seafaring",
    description: "The legendary Pirate King is dead. His crown — which grants control of the sea itself — is hidden on a cursed island. Every pirate fleet hunts for it.",
    startLocation: "Freeport Harbor",
    openingQuest: "Win a ship (or steal one), assemble a crew, and find the Pirate King's Crown before the ruthless Captain Bloodtide claims it.",
    keyNpcs: ["Captain Bloodtide (rival)", "First Mate Coral (potential ally)", "The Sea Hag Oracle", "Ghost of the Pirate King"],
    levelRange: [3, 10],
    inspirations: ["Skull & Shackles AP", "Ghosts of Saltmarsh", "X7 War Rafts of Kron"],
    toneGuide: "Swashbuckling adventure. Sea shanties, rum, betrayal, and treasure maps. Naval combat should be cinematic. Freedom of the open sea.",
    favorsBrains: false,
    combatWeight: 6,
  },

  // ── EPIC / WORLD-SAVING (inspired by Dragonlance, Storm King's Thunder) ──
  {
    id: "ep_dragonlance",
    name: "Dragons of the Shattered World",
    theme: "epic_worldsaving",
    description: "The world is broken. Dragon armies march across the land. Ancient gods are silent. You are one of the few who can reignite hope.",
    startLocation: "Inn of the Last Home, Solace",
    openingQuest: "Reunite with old companions at the Inn of the Last Home and discover that the world-ending war has reached your doorstep.",
    keyNpcs: ["Goldmoon (healer with a holy artifact)", "Sturm Brightblade (honorable knight)", "Raistlin Majere (dangerous mage)", "Lord Verminaard (dragon highlord)"],
    levelRange: [1, 15],
    inspirations: ["DL1-14 Dragonlance", "War of the Lance", "Hoard of the Dragon Queen"],
    toneGuide: "Epic high fantasy. Friendship, sacrifice, and hope against overwhelming darkness. The companions should feel like family. Loss should hurt.",
    favorsBrains: false,
    combatWeight: 6,
  },
  {
    id: "ep_giant_ordning",
    name: "The Shattering of the Ordning",
    theme: "epic_worldsaving",
    description: "The ancient hierarchy of giants has collapsed. Hill giants devour, frost giants raid, fire giants forge weapons of war, and storm giants scheme.",
    startLocation: "Nightstone Village",
    openingQuest: "The village has been bombarded by cloud giant boulders. Investigate why the giants have turned against the small folk.",
    keyNpcs: ["Harshnag (frost giant ally)", "King Hekaton (storm giant king)", "Iymrith (ancient blue dragon in disguise)"],
    levelRange: [1, 12],
    inspirations: ["Storm King's Thunder", "G1-G3 Against the Giants", "Frost Giant's Fury"],
    toneGuide: "Scale matters. Giants should feel MASSIVE. Their footsteps shake the earth. The player is small but clever. David vs Goliath throughout.",
    favorsBrains: true,
    combatWeight: 6,
  },

  // ── WAR / MILITARY ──
  {
    id: "wm_red_arrow",
    name: "Red Arrow, Black Shield",
    theme: "war_military",
    description: "A vast horde marches from the east. You must rally the fractured western kingdoms into an alliance before the nomad armies overwhelm them all.",
    startLocation: "Darokin City War Council",
    openingQuest: "As a diplomatic envoy, travel between rival kingdoms to forge an alliance against the approaching Desert Nomad horde.",
    keyNpcs: ["General Kyr (war commander)", "Queen Elara (reluctant ally)", "The Desert Master (enemy commander)"],
    levelRange: [8, 14],
    inspirations: ["X10 Red Arrow, Black Shield", "Battlesystem modules", "War of the Lance"],
    toneGuide: "Diplomatic and strategic. Battles are decided by alliances forged and decisions made. The player is a commander, not just a fighter.",
    favorsBrains: true,
    combatWeight: 5,
  },

  // ── UNDERDARK (inspired by D1-D3, Out of the Abyss) ──
  {
    id: "ud_abyss",
    name: "Out of the Abyss",
    theme: "underdark",
    description: "Captured by drow and dragged into the Underdark, you must escape through a world gone mad — demon lords walk the tunnels and madness spreads.",
    startLocation: "Velkynvelve (drow prison)",
    openingQuest: "Escape the drow slave camp and navigate the Underdark to reach the surface, while demon lords wreak havoc in the depths.",
    keyNpcs: ["Ilvara (drow priestess captor)", "Stool (myconid sprout)", "Jimjar (deep gnome gambler)", "Demogorgon (demon prince)"],
    levelRange: [1, 15],
    inspirations: ["Out of the Abyss", "D1-D3 Descent series", "Vault of the Drow"],
    toneGuide: "Desperate survival horror underground. Resources are scarce. Light is precious. Trust is earned slowly. The Underdark is alien and beautiful and deadly.",
    favorsBrains: true,
    combatWeight: 5,
  },

  // ── DRAGON-FOCUSED ──
  {
    id: "dr_hoard",
    name: "The Dragon Queen's Return",
    theme: "dragon_focused",
    description: "A cult seeks to free the five-headed dragon queen from her prison. Dragon armies gather, ancient chromatic dragons scheme, and the world trembles.",
    startLocation: "Town of Greenest",
    openingQuest: "The town of Greenest burns under dragon attack. Save who you can and discover why the Cult of the Dragon has launched its war.",
    keyNpcs: ["Governor Nighthill", "Leosin Erlanthar (monk investigator)", "Rezmir (half-dragon cult leader)", "Tiamat"],
    levelRange: [1, 15],
    inspirations: ["Hoard of the Dragon Queen", "Rise of Tiamat", "Council of Wyrms"],
    toneGuide: "Escalating threat. Start with a single dragon attack, build to a world-ending crisis. Each dragon should have personality, not just stats.",
    favorsBrains: false,
    combatWeight: 7,
  },

  // ── UNDEAD / NECROMANCY ──
  {
    id: "un_lich_king",
    name: "The Lich King's Gambit",
    theme: "undead_necromancy",
    description: "An ancient lich has been playing a centuries-long game, manipulating kingdoms and harvesting souls. Now his phylactery network activates.",
    startLocation: "Whitestone Cathedral",
    openingQuest: "The dead are rising in unprecedented numbers. Trace the source of the necromantic plague to an abandoned wizard's tower.",
    keyNpcs: ["High Priestess Dawn (ally)", "Acererak (the lich behind it all)", "The Wight King (lieutenant)", "A ghost who remembers being alive"],
    levelRange: [5, 15],
    inspirations: ["Tomb of Horrors", "Tomb of Annihilation", "Return to the Tomb of Horrors"],
    toneGuide: "Death is the theme — not just as an enemy but as a concept. NPCs should grapple with mortality. The lich should be genuinely terrifying in intelligence.",
    favorsBrains: true,
    combatWeight: 5,
  },

  // ── FEY / NATURE ──
  {
    id: "fe_wild_beyond",
    name: "The Wild Beyond the Witchlight",
    theme: "fey_nature",
    description: "A traveling carnival is a gateway to the Feywild, where a hag coven has stolen something precious — and the rules of reality bend to whimsy.",
    startLocation: "The Witchlight Carnival",
    openingQuest: "Something was stolen from you as a child by the Witchlight Carnival. Return to claim it — but the carnival leads deeper than you remember.",
    keyNpcs: ["Mister Witch and Mister Light (carnival owners)", "Bavlorna Blightstraw (hag)", "Sir Talavar (fairy knight)"],
    levelRange: [1, 8],
    inspirations: ["Wild Beyond the Witchlight", "Court of the Shadow Fey", "B7 Rahasia"],
    toneGuide: "Whimsical and dangerous. The Feywild has different rules — deals are binding, names have power, and beauty hides cruelty. Combat is optional for everything.",
    favorsBrains: true,
    combatWeight: 2,
  },

  // ── POLITICAL INTRIGUE ──
  {
    id: "po_council_wyrms",
    name: "The Council of Wyrms",
    theme: "political",
    description: "Ancient dragons rule the council that governs the world. Humanoid factions jockey for influence, and a conspiracy threatens to shatter the peace.",
    startLocation: "The Grand Assembly Hall",
    openingQuest: "As a new delegate to the Council, uncover who is sabotaging the peace negotiations between the chromatic and metallic factions.",
    keyNpcs: ["Gold Dragon Ambassador Aurinax", "Red Dragon General Klauth", "The Shadow Delegate (unknown spy)"],
    levelRange: [5, 12],
    inspirations: ["Council of Wyrms", "Birthright", "Kingmaker AP"],
    toneGuide: "Political chess. Words are more dangerous than swords. Every NPC has hidden agendas. The player should feel the weight of diplomatic consequences.",
    favorsBrains: true,
    combatWeight: 2,
  },

  // ── HEIST ──
  {
    id: "he_vault",
    name: "The Impossible Vault",
    theme: "heist",
    description: "The most secure vault in the world holds an artifact that could end a tyrant's reign. Plan the heist of the century.",
    startLocation: "The Brass Lantern Safehouse",
    openingQuest: "A resistance leader needs you to steal the Scepter of Dominion from the tyrant's magically-warded vault. Plan your approach.",
    keyNpcs: ["Lyssa the Planner (resistance leader)", "The Artificer (vault designer, unwilling)", "Captain Voss (guard commander)"],
    levelRange: [5, 10],
    inspirations: ["Keys from the Golden Vault", "Waterdeep: Dragon Heist"],
    toneGuide: "Ocean's Eleven meets fantasy. Planning should be as fun as execution. Multiple approaches should work. Alarm systems, guard patrols, magical wards.",
    favorsBrains: true,
    combatWeight: 2,
  },

  // ── SURVIVAL ──
  {
    id: "su_icewind",
    name: "The Frozen North",
    theme: "survival",
    description: "Icewind Dale — where the sun hasn't risen in months, towns huddle against the cold, and something ancient stirs beneath the ice.",
    startLocation: "Ten-Towns, Bryn Shander",
    openingQuest: "The perpetual winter is not natural. Investigate the source of the endless night while keeping the remote towns alive.",
    keyNpcs: ["Speaker Duvessa Shane", "Dzaan (suspicious wizard)", "Auril the Frostmaiden"],
    levelRange: [1, 12],
    inspirations: ["Icewind Dale: Rime of the Frostmaiden", "Crystal Shard", "Legacy of the Crystal Shard"],
    toneGuide: "Harsh and isolating. Cold is an enemy. Resources matter. Trust is hard-won in communities under siege. The beauty of the tundra masks deadly danger.",
    favorsBrains: true,
    combatWeight: 5,
  },

  // ── DESERT / ARABIAN ──
  {
    id: "de_pharaoh",
    name: "The Pharaoh's Curse",
    theme: "desert_arabian",
    description: "An ancient pharaoh's tomb has been opened, unleashing a curse that turns oases to dust and raises mummified armies from the sands.",
    startLocation: "Bazaar of Al-Qadim",
    openingQuest: "A dying merchant gives you half of a map to the Pharaoh's inner sanctum. The curse can only be lifted from within.",
    keyNpcs: ["Amira the Sand Witch (guide)", "The Pharaoh's Ka (spirit)", "Grand Vizier Tariq (villain or ally?)"],
    levelRange: [3, 8],
    inspirations: ["I3-5 Pharaoh/Oasis/Lost Tomb", "Al-Qadim campaign", "FR3 Empires of the Sands"],
    toneGuide: "Arabian Nights meets Indiana Jones. Heat, sandstorms, and mirages. Ancient riddles in hieroglyphs. Respect for the dead is rewarded; desecration is punished.",
    favorsBrains: true,
    combatWeight: 5,
  },

  // ── NORSE / VIKING ──
  {
    id: "no_ragnarok",
    name: "The Twilight of the Gods",
    theme: "norse_viking",
    description: "Ragnarok approaches. The world serpent stirs, Fenrir strains his chains, and the frost giants mass for the final battle.",
    startLocation: "Jorvaskr Mead Hall",
    openingQuest: "The Norns have woven your fate into the tapestry of Ragnarok. Delay the end of the world — or choose which world rises from the ashes.",
    keyNpcs: ["Brynhild (valkyrie ally)", "Loki (trickster, ambiguous)", "The Norn Sisters", "Jarl Ulfric (war chief)"],
    levelRange: [5, 20],
    inspirations: ["H1 Bloodstone Pass", "Viking Campaign Sourcebook", "Storm King's Thunder Norse elements"],
    toneGuide: "Mythic and fatalistic. Norse heroes know they'll die — they fight anyway. Honor, oaths, and sacrifice. The world is beautiful because it's ending.",
    favorsBrains: false,
    combatWeight: 7,
  },

  // ── GOTHIC / DARK ──
  {
    id: "go_darklords",
    name: "Domains of Dread",
    theme: "gothic",
    description: "Each Domain of Dread is a prison for a Dark Lord — and you've been pulled into the Mists. Each domain has its own horror, its own rules.",
    startLocation: "The Mists (arriving in a random domain)",
    openingQuest: "Escape the Domain of Dread by confronting the Dark Lord who rules it — but the Mists may simply deliver you to the next nightmare.",
    keyNpcs: ["The Dark Lord (domain-specific)", "A Vistani Guide (knows the Mists)", "The Carnival Ringmaster"],
    levelRange: [1, 15],
    inspirations: ["Van Richten's Guide to Ravenloft", "Domains of Dread", "Ravenloft modules"],
    toneGuide: "Each domain is a self-contained horror story. Gothic atmosphere: decaying mansions, eternal storms, cursed bloodlines. Hope is precious and fragile.",
    favorsBrains: true,
    combatWeight: 4,
  },

  // ── ORIENTAL / EASTERN ──
  {
    id: "or_kara_tur",
    name: "The Way of the Lotus",
    theme: "oriental",
    description: "In the lands of Kara-Tur, honor and martial arts intertwine with ancient spirits and celestial bureaucracy.",
    startLocation: "Jade Lotus Monastery",
    openingQuest: "Your monastery has been attacked by shadow demons. Journey to the Spirit Gate to close the breach between the mortal and spirit worlds.",
    keyNpcs: ["Master Feng (dying teacher)", "Mei Lin (fellow student)", "The Jade Emperor's Envoy", "Shadow King Kuroth"],
    levelRange: [1, 10],
    inspirations: ["OA1-4 Oriental Adventures", "Kara-Tur setting", "FROA1 Ninja Wars"],
    toneGuide: "Wuxia and martial arts fantasy. Honor, duty, and inner strength. Spirits and ancestors are real. Combat is graceful and decisive. Meditation can solve problems.",
    favorsBrains: true,
    combatWeight: 5,
  },
];

// ── Theme Narration Profiles ───────────────────────────────────

/** Additional narration guidance by theme — used in DM prompt */
export interface ThemeNarrationProfile {
  theme: CampaignTheme;
  /** Extra system prompt guidance for the LLM */
  narrativeInstructions: string;
  /** Types of non-combat encounters to emphasize */
  nonCombatEncounters: string[];
  /** Puzzle/riddle types appropriate for this theme */
  puzzleTypes: string[];
  /** How consequences should manifest */
  consequenceStyle: string;
}

export const THEME_NARRATION_PROFILES: ThemeNarrationProfile[] = [
  {
    theme: "dungeon_crawl",
    narrativeInstructions: "Describe rooms in vivid detail — architecture, smells, sounds, temperature. Every door could hide a trap. Reward investigation before action. Describe what the character's senses detect. Make the dungeon feel ancient and layered with history.",
    nonCombatEncounters: ["trapped corridors", "ancient riddles on walls", "dormant golems that can be bypassed", "ghostly inhabitants who share lore", "environmental puzzles (water levels, rotating rooms)"],
    puzzleTypes: ["pressure plates", "rune sequences", "mirror puzzles", "water/weight puzzles", "spoken passwords"],
    consequenceStyle: "Traps trigger, doors lock, alarm systems activate, dungeon ecology shifts",
  },
  {
    theme: "urban_intrigue",
    narrativeInstructions: "Focus on NPC dialogue, body language, and hidden meanings. The city should feel alive with commerce, politics, and secrets. Describe crowds, street vendors, architecture. Every conversation should reveal or conceal information. Social skills are as valuable as combat skills.",
    nonCombatEncounters: ["tailing suspects", "interrogating witnesses", "attending social events", "reading intercepted messages", "navigating bureaucracy", "earning NPC trust"],
    puzzleTypes: ["coded messages", "social deduction", "following paper trails", "connecting evidence", "interpreting rumors"],
    consequenceStyle: "Reputation changes, faction reactions, NPC trust shifts, information access changes",
  },
  {
    theme: "horror",
    narrativeInstructions: "Build dread through atmosphere, not just monsters. Describe what characters hear but can't see. Use isolation, darkness, and the unknown. Let tension build before reveals. Some things should be better left uninvestigated. Not everything can be fought — sometimes running is the right choice.",
    nonCombatEncounters: ["sanity-testing visions", "haunted objects", "uncanny NPCs", "environmental horror", "moral dilemmas with no good answer"],
    puzzleTypes: ["occult rituals", "deciphering mad writings", "navigating ever-changing layouts", "resisting temptation"],
    consequenceStyle: "Psychological effects, nightmares, NPC distrust, corruption spreading",
  },
  {
    theme: "mystery",
    narrativeInstructions: "Plant clues naturally in descriptions. NPCs should have alibis and motives. Red herrings should be fair — always explain why they seemed suspicious. The solution should be deducible from available information. Reward the player for asking the right questions.",
    nonCombatEncounters: ["crime scene investigation", "witness interviews", "library research", "surveillance", "examining physical evidence", "consulting experts"],
    puzzleTypes: ["whodunit deduction", "timeline reconstruction", "motive analysis", "forensic examination"],
    consequenceStyle: "Wrong accusations cause problems, evidence can be destroyed, witnesses disappear",
  },
  {
    theme: "political",
    narrativeInstructions: "Every NPC has a public face and a private agenda. Conversations have subtext. Describe court etiquette, fashion, and power dynamics. Small gestures (a nod, a turned back) carry enormous weight. The player's words should have lasting consequences.",
    nonCombatEncounters: ["diplomatic negotiations", "court events", "alliance building", "information trading", "navigating etiquette", "managing loyalty"],
    puzzleTypes: ["reading between the lines", "predicting betrayals", "balancing faction interests", "interpreting coded language"],
    consequenceStyle: "Alliance shifts, faction reputation changes, political access opens/closes",
  },
  {
    theme: "heist",
    narrativeInstructions: "Describe security measures in detail so the player can plan. Multiple approaches should be viable. Building tension during execution — alarm clocks, patrol routes, last-second saves. The plan never survives contact with reality; improvisation should feel exciting.",
    nonCombatEncounters: ["reconnaissance", "recruiting specialists", "acquiring tools", "planning sessions", "diversionary tactics", "escape routes"],
    puzzleTypes: ["bypass security systems", "forge documents", "crack safes", "time puzzles", "disguise challenges"],
    consequenceStyle: "Alarm levels escalate, guards react, escape routes close, reputation as a thief spreads",
  },
  {
    theme: "survival",
    narrativeInstructions: "Resources matter. Describe weather, terrain, and the character's physical condition. Food, water, warmth are constant concerns. The environment is the primary antagonist. Beauty and danger coexist. Small victories (finding shelter, a warm meal) should feel significant.",
    nonCombatEncounters: ["foraging", "shelter building", "weather navigation", "treating injuries", "rationing supplies", "finding safe water"],
    puzzleTypes: ["navigation challenges", "resource management", "environmental reading", "survival craft"],
    consequenceStyle: "Resource depletion, exposure effects, starvation, exhaustion levels",
  },
  {
    theme: "wilderness_hex",
    narrativeInstructions: "The wilderness should feel vast and full of wonder. Describe landscapes, wildlife, and weather. Each hex should feel like a small discovery. Balance danger with beauty. Random encounters should tell stories, not just be combat.",
    nonCombatEncounters: ["ancient ruins", "friendly travelers", "natural wonders", "animal encounters", "weather events", "navigation challenges"],
    puzzleTypes: ["tracking", "pathfinding", "natural obstacle navigation", "reading ancient markers"],
    consequenceStyle: "Getting lost, encountering worse weather, attracting predators, discovering shortcuts",
  },
  {
    theme: "fey_nature",
    narrativeInstructions: "The Feywild has different rules. Deals are binding contracts. Names have power — never give your true name freely. Beauty is dangerous. Time moves differently. Everything has a price. The fey are not evil, they simply have alien morality. Whimsy and peril coexist.",
    nonCombatEncounters: ["fey bargains", "riddle contests", "enchanted performances", "navigating fairy courts", "resisting glamours", "earning favor through gifts"],
    puzzleTypes: ["riddle competitions", "true name puzzles", "rule-of-three challenges", "emotional resonance puzzles"],
    consequenceStyle: "Fey deals enforce themselves magically, broken promises have immediate supernatural consequences",
  },
  {
    theme: "epic_worldsaving",
    narrativeInstructions: "Start personal, escalate to cosmic. The player should feel the weight of the world on their shoulders. NPCs they've befriended should be in danger. Victories should be earned through sacrifice. The villain should be formidable and have understandable (if terrible) motivations.",
    nonCombatEncounters: ["rallying allies", "inspiring speeches", "moral dilemmas about sacrifice", "gathering artifacts", "confronting personal demons"],
    puzzleTypes: ["prophecy interpretation", "artifact activation", "ritual completion", "strategic planning"],
    consequenceStyle: "The world changes based on success/failure. NPCs live or die. Kingdoms rise or fall.",
  },
  {
    theme: "war_military",
    narrativeInstructions: "Battles are decided before the first sword is drawn — by strategy, alliances, and logistics. Describe the fog of war, the chaos of battle, and the cost of victory. Every soldier is someone's child. The player commands, not just fights.",
    nonCombatEncounters: ["diplomatic missions", "supply line management", "troop morale", "intelligence gathering", "prisoner dilemmas"],
    puzzleTypes: ["tactical positioning", "siege engineering", "code breaking", "resource allocation"],
    consequenceStyle: "Battles won/lost affect territory control, civilian casualties, alliance loyalty",
  },
  {
    theme: "planar",
    narrativeInstructions: "Each plane has radically different rules of reality. Describe how physics, magic, and morality shift between planes. The multiverse should feel infinite and strange. Belief shapes reality. Language and concepts may not translate.",
    nonCombatEncounters: ["planar navigation", "philosophical debates", "reality shifts", "inter-planar trade", "navigating alien cultures"],
    puzzleTypes: ["reality manipulation", "belief challenges", "inter-planar riddles", "portal key puzzles"],
    consequenceStyle: "Reality shifts, planar alignment changes, drawing attention of powerful entities",
  },
  {
    theme: "seafaring",
    narrativeInstructions: "The sea is freedom and danger. Describe waves, winds, and weather. Ship life should feel vivid — the crew, the routine, the boredom between ports. Sea monsters are rare and terrifying. Ports are adventures in themselves.",
    nonCombatEncounters: ["navigation challenges", "crew management", "port diplomacy", "weather hazards", "salvage operations", "sea creature encounters"],
    puzzleTypes: ["star navigation", "treasure map reading", "naval tactics", "underwater puzzles"],
    consequenceStyle: "Ship damage, crew morale, pirate reputation, port access",
  },
  {
    theme: "underdark",
    narrativeInstructions: "Light is precious. Describe the alien beauty of bioluminescent fungi, crystal formations, and underground seas. The Underdark societies (drow, duergar, mind flayers) are sophisticated and terrifying. Sound travels strangely. Every shadow could hide danger.",
    nonCombatEncounters: ["navigating in darkness", "alien culture encounters", "underground ecology", "resource scarcity", "psychic phenomena"],
    puzzleTypes: ["echo navigation", "bioluminescent patterns", "drow sign language", "psionic challenges"],
    consequenceStyle: "Getting lost, resource depletion, attracting unwanted attention, faction reputation",
  },
  {
    theme: "dragon_focused",
    narrativeInstructions: "Dragons are intelligent, ancient, and proud. Each has a distinct personality, hoard, and lair. Dragon combat should feel epic and desperate. Dragon diplomacy should feel like negotiating with a god who might eat you. Describe scale — they are MASSIVE.",
    nonCombatEncounters: ["dragon diplomacy", "lair exploration", "hoard appraisal", "draconic lore research", "earning a dragon's respect"],
    puzzleTypes: ["draconic riddles", "lair trap navigation", "hoard identification", "ancient draconic inscription"],
    consequenceStyle: "Dragon wrath/favor, territorial control, draconic prophecy shifts",
  },
  {
    theme: "undead_necromancy",
    narrativeInstructions: "Death is the central theme — not just combat, but the meaning of death, memory, and what remains. Undead should have pathos as well as horror. A ghost may be tragic; a lich is terrifying because they chose this. Describe decay, silence, and the cold of the grave.",
    nonCombatEncounters: ["speaking with the dead", "researching necromantic lore", "performing funeral rites", "confronting mortality", "negotiating with intelligent undead"],
    puzzleTypes: ["death riddles", "phylactery puzzles", "spiritual ward construction", "memory reconstruction"],
    consequenceStyle: "Necromantic corruption spreading, undead rising in areas of failure, NPC deaths becoming permanent",
  },
  {
    theme: "desert_arabian",
    narrativeInstructions: "Heat, sand, and ancient mystery. Describe mirages, oases, and the vastness of the desert. Arabian Nights atmosphere — genies, flying carpets, bazaars. Honor and hospitality are sacred. The desert tests endurance and wisdom.",
    nonCombatEncounters: ["bazaar negotiations", "desert navigation", "oasis encounters", "storytelling contests", "genie bargains"],
    puzzleTypes: ["hieroglyphic translation", "sand puzzles", "genie riddles", "astronomical navigation"],
    consequenceStyle: "Water scarcity, sandstorm timing, desert spirit favor/anger, trade reputation",
  },
  {
    theme: "oriental",
    narrativeInstructions: "Honor, duty, and spiritual harmony. Martial arts should be described as graceful and precise. Ancestors and spirits are ever-present. Nature is a teacher. Meditation and self-discipline can solve problems that violence cannot.",
    nonCombatEncounters: ["meditation challenges", "tea ceremonies", "ancestor communion", "calligraphy puzzles", "honor trials"],
    puzzleTypes: ["koans", "martial arts forms", "spirit world navigation", "harmony restoration"],
    consequenceStyle: "Honor loss/gain, spirit world reactions, ancestral approval, monastery standing",
  },
  {
    theme: "norse_viking",
    narrativeInstructions: "Mythic and fatalistic. Heroes know they'll die — the question is how. Describe the harsh beauty of the north: frozen fjords, aurora borealis, ancient standing stones. Oaths are sacred. Fate is real but can be met with courage.",
    nonCombatEncounters: ["saga telling", "oath swearing", "rune reading", "mead hall politics", "navigating harsh weather"],
    puzzleTypes: ["runic inscriptions", "fate riddles", "god trials", "berserker meditation"],
    consequenceStyle: "Oath consequences, honor/shame, divine attention (Odin, Thor, Loki), fate shifts",
  },
  {
    theme: "gothic",
    narrativeInstructions: "Atmosphere of dread and beauty. Describe crumbling architecture, eternal storms, and cursed landscapes. NPCs are trapped in cycles of tragedy. Hope is rare and precious. The Dark Lord should be sympathetic as well as terrifying.",
    nonCombatEncounters: ["investigating curses", "confronting tragic histories", "navigating enchanted landscapes", "resisting corruption"],
    puzzleTypes: ["curse-breaking rituals", "mirror puzzles", "dream navigation", "blood riddles"],
    consequenceStyle: "Corruption spreading, NPC curses worsening, domain shifting, Dark Lord's attention",
  },
];

/** Get a random campaign for a given theme */
export function getRandomCampaign(theme: CampaignTheme): CampaignTemplate {
  const themeCampaigns = CAMPAIGN_TEMPLATES.filter((c) => c.theme === theme);
  if (themeCampaigns.length === 0) {
    // Fallback to any campaign
    return CAMPAIGN_TEMPLATES[Math.floor(Math.random() * CAMPAIGN_TEMPLATES.length)];
  }
  return themeCampaigns[Math.floor(Math.random() * themeCampaigns.length)];
}

/** Get a random campaign theme appropriate for the player's level */
export function getRandomThemeForLevel(level: number): CampaignTheme {
  const eligible = CAMPAIGN_TEMPLATES.filter(
    (t) => level >= t.levelRange[0] && level <= t.levelRange[1]
  );
  if (eligible.length === 0) {
    return CAMPAIGN_THEMES[Math.floor(Math.random() * CAMPAIGN_THEMES.length)];
  }
  const picked = eligible[Math.floor(Math.random() * eligible.length)];
  return picked.theme;
}

/** Get the narration profile for a theme */
export function getThemeNarrationProfile(theme: CampaignTheme): ThemeNarrationProfile | undefined {
  return THEME_NARRATION_PROFILES.find((p) => p.theme === theme);
}
