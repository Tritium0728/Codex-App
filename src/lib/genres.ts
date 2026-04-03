export interface GenreSection {
  key: string
  label: string
  placeholder: string
  full?: boolean
}

export interface GenreTemplate {
  name: string
  icon: string
  sections: GenreSection[]
}

export const GENRE_TEMPLATES: Record<string, GenreTemplate> = {
  shooter: {
    name: 'Action / Shooter', icon: '🎯',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'Core concept, setting, tone in 1-2 sentences.' },
      { key: 'coreMechanics', label: 'Core Mechanics', placeholder: 'Primary gameplay loops, weapons, movement...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'What does the player feel like? Power fantasy vs tension?' },
      { key: 'setting', label: 'World & Setting', placeholder: 'Location, era, atmosphere, lore foundation...' },
      { key: 'enemies', label: 'Enemies & Factions', placeholder: 'Enemy types, behaviors, factions, bosses...' },
      { key: 'weapons', label: 'Weapons & Loadout', placeholder: 'Weapon roster, attachment systems, feel...' },
      { key: 'progression', label: 'Progression', placeholder: 'XP, unlocks, gear loop, session structure...' },
      { key: 'levels', label: 'Level Design', placeholder: 'Map philosophy, layout principles, pacing...' },
      { key: 'narrative', label: 'Narrative', placeholder: 'Story beats, delivery method, cutscenes vs ambient...' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Comparable titles, target player, platform...' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, plugins, netcode approach, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks — what is NOT being built.', full: true },
    ],
  },
  rpg: {
    name: 'RPG', icon: '⚔️',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'Core concept and tone.' },
      { key: 'coreMechanics', label: 'Core Systems', placeholder: 'Combat, exploration, dialogue systems...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'Hero arc, agency, emotional journey...' },
      { key: 'world', label: 'World & Lore', placeholder: 'Setting, history, factions, cosmology...' },
      { key: 'characters', label: 'Characters & NPCs', placeholder: 'Party members, key NPCs, villains...' },
      { key: 'progression', label: 'Character Progression', placeholder: 'Stats, skills, classes, leveling...' },
      { key: 'economy', label: 'Economy & Items', placeholder: 'Currency, loot, crafting, shops...' },
      { key: 'quests', label: 'Quest & Story Design', placeholder: 'Main quest, side quests, branching...' },
      { key: 'combat', label: 'Combat Design', placeholder: 'Turn-based vs action, abilities, balance...' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Comparable titles, target player, platform...' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, tools, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks.', full: true },
    ],
  },
  strategy: {
    name: 'Strategy', icon: '🏰',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'Core concept, scale, tone.' },
      { key: 'coreMechanics', label: 'Core Loop', placeholder: 'Build, expand, manage, conquer — primary verbs...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'What mastery feels like. Commander? Builder? Survivor?' },
      { key: 'setting', label: 'Setting & Theme', placeholder: 'Era, universe, aesthetic direction...' },
      { key: 'units', label: 'Units & Entities', placeholder: 'Unit roster, tech tree approach, faction differentiation...' },
      { key: 'economy', label: 'Economy & Resources', placeholder: 'Resource types, acquisition, spending, scarcity...' },
      { key: 'progression', label: 'Progression & Meta', placeholder: 'Campaign structure, unlocks, difficulty scaling...' },
      { key: 'maps', label: 'Map & Level Design', placeholder: 'Map generation, biomes, objectives...' },
      { key: 'ai', label: 'AI & Opponents', placeholder: 'AI difficulty approach, behavior, personality...' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Comparable titles, target player, platform...' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, tools, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks.', full: true },
    ],
  },
  narrative: {
    name: 'Narrative / Adventure', icon: '📖',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'Story concept, tone, themes.' },
      { key: 'story', label: 'Story & Structure', placeholder: 'Three-act structure, key beats, ending(s)...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'What agency feels like. Detective? Protagonist? Witness?' },
      { key: 'world', label: 'World & Setting', placeholder: 'Location, atmosphere, period, rules of the world...' },
      { key: 'characters', label: 'Characters', placeholder: 'Protagonist, supporting cast, antagonist, arcs...' },
      { key: 'dialogue', label: 'Dialogue & Writing', placeholder: 'Tone, branching approach, voice acting...' },
      { key: 'mechanics', label: 'Gameplay Mechanics', placeholder: 'Puzzles, exploration, choices, consequences...' },
      { key: 'pacing', label: 'Pacing & Flow', placeholder: 'Chapter structure, tension curves, downtime...' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Comparable titles, target player, platform...' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, tools, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks.', full: true },
    ],
  },
  platformer: {
    name: 'Platformer', icon: '🍄',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'Core concept, character, world.' },
      { key: 'movement', label: 'Movement & Feel', placeholder: 'Jump physics, run speed, special moves, game feel...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'Mastery arc — beginner joy to expert flow...' },
      { key: 'world', label: 'World & Theme', placeholder: 'Visual style, world structure, themes...' },
      { key: 'enemies', label: 'Enemies & Hazards', placeholder: 'Enemy types, traps, environmental hazards...' },
      { key: 'levels', label: 'Level Design', placeholder: 'Zone structure, teaching philosophy, pacing...' },
      { key: 'collectibles', label: 'Collectibles & Secrets', placeholder: 'What to collect, why, hidden areas...' },
      { key: 'progression', label: 'Progression', placeholder: 'Abilities unlocked, world map, replay value...' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Comparable titles, target player, platform...' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, tools, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks.', full: true },
    ],
  },
  puzzle: {
    name: 'Puzzle', icon: '🧩',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'Core puzzle concept and theme.' },
      { key: 'coreMechanics', label: 'Core Mechanic', placeholder: 'The one mechanic everything is built around...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'The aha moment. What genius feels like...' },
      { key: 'progression', label: 'Difficulty Progression', placeholder: 'How complexity scales, introduction of new elements...' },
      { key: 'levelDesign', label: 'Level Design', placeholder: 'Level count, structure, hand-crafted vs procedural...' },
      { key: 'narrative', label: 'Narrative Wrapper', placeholder: 'Story framing, world, character — or pure abstraction?' },
      { key: 'hints', label: 'Hint System', placeholder: 'How hints work, skip options, accessibility...' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Comparable titles, target player, platform...' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, tools, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks.', full: true },
    ],
  },
  simulation: {
    name: 'Simulation / Management', icon: '🏗️',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'What are you simulating? At what scale?' },
      { key: 'coreSystems', label: 'Core Systems', placeholder: 'Primary simulation systems, interdependencies...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'Architect? Manager? God? What power feels like...' },
      { key: 'economy', label: 'Economy & Resources', placeholder: 'Resource chains, production, supply/demand...' },
      { key: 'progression', label: 'Progression & Goals', placeholder: 'Campaign goals, sandbox mode, milestones...' },
      { key: 'ai', label: 'Simulation AI', placeholder: 'NPC behavior, emergent systems, complexity...' },
      { key: 'ui', label: 'UI & Information', placeholder: 'Dashboards, data visualization, control surfaces...' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Comparable titles, target player, platform...' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, tools, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks.', full: true },
    ],
  },
  horror: {
    name: 'Horror / Survival', icon: '👻',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'Core horror concept, setting, threat.' },
      { key: 'fear', label: 'Fear Philosophy', placeholder: 'Psychological vs jump scares, dread vs panic, pacing of fear...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'Vulnerability, survival, uncovering truth...' },
      { key: 'setting', label: 'Setting & Atmosphere', placeholder: 'Location, lighting, sound design philosophy, isolation...' },
      { key: 'threat', label: 'Threats & Enemies', placeholder: 'Monster design, AI behavior, encounter pacing...' },
      { key: 'mechanics', label: 'Survival Mechanics', placeholder: 'Resources, inventory, sanity, death/save system...' },
      { key: 'narrative', label: 'Narrative & Lore', placeholder: 'Story delivery, environmental storytelling, documents...' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Comparable titles, target player, platform...' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, tools, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks.', full: true },
    ],
  },
  blank: {
    name: 'Blank / Custom', icon: '✦',
    sections: [
      { key: 'premise', label: 'Game Premise', placeholder: 'What is this game?' },
      { key: 'coreMechanics', label: 'Core Mechanics', placeholder: 'Primary gameplay systems...' },
      { key: 'playerFantasy', label: 'Player Fantasy', placeholder: 'What does the player feel?' },
      { key: 'setting', label: 'Setting & World', placeholder: 'Where and when does this take place?' },
      { key: 'progression', label: 'Progression', placeholder: 'How does the player grow?' },
      { key: 'market', label: 'Market & Audience', placeholder: 'Who is this for?' },
      { key: 'tech', label: 'Technical Notes', placeholder: 'Engine, tools, constraints...' },
      { key: 'scope', label: "Won't Do", placeholder: 'Explicit scope locks.', full: true },
    ],
  },
}
