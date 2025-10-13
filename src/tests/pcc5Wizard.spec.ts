import { describe, it, expect, vi } from 'vitest';
import { validatePcc5, extractJson, splitPcc5ToJson } from '../types/pcc5';
import { generatePcc5, regenerateSection, getWordCountEstimates, deduceStoryProperties } from '../ai/pcc5Wizard';

// Mock the AI client
vi.mock('../ai/providers', () => ({
  getLLMClient: () => vi.fn()
    .mockResolvedValueOnce(JSON.stringify({
    outline: {
      version: "pcc5.v1",
      step1_promise: {
        logline: "A test story about adventure",
        contract: ["Will the hero succeed?", "What is the secret?"],
        genre: "Fantasy",
        theme: "Courage"
      },
      step2_countdown: {
        deadline: "Before the eclipse",
        stakes: "The world will end",
        beats: {
          setup: "Hero discovers the prophecy",
          midpoint: "Hero learns the truth",
          climax: "Final battle at eclipse"
        }
      },
      step3_crucible: {
        protagonist: {
          name: "Test Hero",
          motivation: "Save the world",
          limitation: "Fear of heights",
          transformation: "Overcomes fear"
        },
        antagonist: {
          name: "Dark Lord",
          leverage: "Controls the eclipse"
        },
        constraints: ["Cannot leave the realm", "Must act alone"]
      },
      step4_expansion: {
        acts: {
          act1: "Hero's ordinary world",
          act2: "Hero's journey begins",
          act3: "Hero's return changed"
        },
        escalation_notes: ["Tension rises", "Stakes increase"]
      },
      step5_fulfillment: {
        resolutions: {
          "Will the hero succeed?": "Yes, through courage",
          "What is the secret?": "The power was within"
        },
        success_criteria: ["All promises resolved", "Character growth shown"]
      }
    },
    characters: [
      {
        name: "Test Hero",
        role: "Protagonist",
        motivation: "Save the world",
        conflict: "Internal fear",
        arc: "From fearful to brave",
        relationships: [{"name": "Mentor", "relation": "Guide and teacher"}, {"name": "Love interest", "relation": "Romantic partner"}]
      }
    ],
    chapters: Array.from({ length: 30 }, (_, i) => ({
      id: `ch-${String(i + 1).padStart(2, '0')}`,
      title: `Chapter ${i + 1}`,
      summary: `Chapter ${i + 1} summary`,
      pov: "Test Hero",
      scenes: [`scene-${String(i * 3 + 1).padStart(2, '0')}`, `scene-${String(i * 3 + 2).padStart(2, '0')}`, `scene-${String(i * 3 + 3).padStart(2, '0')}`]
    })),
    scenes: Array.from({ length: 90 }, (_, i) => ({
      id: `scene-${String(i + 1).padStart(2, '0')}`,
      chapter: `ch-${String(Math.floor(i / 3) + 1).padStart(2, '0')}`,
      pov: "Test Hero",
      goal: `Scene ${i + 1} goal`,
      conflict: `Scene ${i + 1} conflict`,
      outcome: `Scene ${i + 1} outcome`,
      location: `Scene ${i + 1} location`,
      clock: `Scene ${i + 1} clock`,
      crucible: `Scene ${i + 1} crucible`,
      words_target: 1000,
      summary: `Scene ${i + 1} summary`
      }))
    }))
    // Mock property deduction
    .mockResolvedValueOnce(JSON.stringify({
      genre: "Fantasy",
      theme: "Redemption",
      tone: "Dark",
      world: "Medieval fantasy",
      audience: "Young Adult"
    }))
}));

describe('PCC-5 Wizard', () => {
  it('should validate PCC-5 payload correctly', () => {
    const validPayload = {
      outline: {
        version: "pcc5.v1" as const,
        step1_promise: {
          logline: "A test story",
          contract: ["Question 1", "Question 2"],
          genre: "Fantasy",
          theme: "Courage"
        },
        step2_countdown: {
          deadline: "Before midnight",
          stakes: "World ends",
          beats: {
            setup: "Inciting incident",
            midpoint: "Major reversal",
            climax: "Final confrontation"
          }
        },
        step3_crucible: {
          protagonist: {
            name: "Hero",
            motivation: "Save world",
            limitation: "Fear",
            transformation: "Overcomes fear"
          },
          antagonist: {
            name: "Villain",
            leverage: "Power"
          },
          constraints: ["Cannot leave", "Must act alone"]
        },
        step4_expansion: {
          acts: {
            act1: "Setup",
            act2: "Confrontation",
            act3: "Resolution"
          },
          escalation_notes: ["Tension rises"]
        },
        step5_fulfillment: {
          resolutions: {
            "Question 1": "Answer 1",
            "Question 2": "Answer 2"
          },
          success_criteria: ["All resolved"]
        }
      },
      characters: [
        {
          name: "Hero",
          role: "Protagonist",
          motivation: "Save world",
          conflict: "Internal",
          arc: "Growth",
          relationships: []
        }
      ],
      chapters: Array.from({ length: 30 }, (_, i) => ({
        id: `ch-${String(i + 1).padStart(2, '0')}`,
        title: `Chapter ${i + 1}`,
        summary: `Chapter ${i + 1} summary`,
        pov: "Hero",
        scenes: [`scene-${String(i * 3 + 1).padStart(2, '0')}`, `scene-${String(i * 3 + 2).padStart(2, '0')}`, `scene-${String(i * 3 + 3).padStart(2, '0')}`]
      })),
      scenes: Array.from({ length: 90 }, (_, i) => ({
        id: `scene-${String(i + 1).padStart(2, '0')}`,
        chapter: `ch-${String(Math.floor(i / 3) + 1).padStart(2, '0')}`,
        pov: "Hero",
        goal: `Scene ${i + 1} goal`,
        conflict: `Scene ${i + 1} conflict`,
        outcome: `Scene ${i + 1} outcome`,
        location: `Scene ${i + 1} location`,
        clock: `Scene ${i + 1} clock`,
        crucible: `Scene ${i + 1} crucible`,
        words_target: 900,
        summary: `Scene ${i + 1} summary`
      }))
    };

    expect(() => validatePcc5(validPayload)).not.toThrow();
  });

  it('should reject invalid PCC-5 payload', () => {
    const invalidPayload = {
      outline: {
        version: "pcc5.v1",
        step1_promise: {
          logline: "", // Empty logline should fail
          contract: ["Question 1"], // Only 1 question, need at least 2
          genre: "Fantasy",
          theme: "Courage"
        },
        // Missing other required fields...
      },
      characters: [],
      chapters: [], // Empty chapters should fail (need at least 30)
      scenes: [] // Empty scenes should fail (need at least 90)
    };

    expect(() => validatePcc5(invalidPayload)).toThrow();
  });

  it('should extract JSON from AI response', () => {
    const response = 'Here is your story structure: {"outline": {"version": "pcc5.v1"}}';
    const json = extractJson(response);
    expect(json).toEqual({ outline: { version: "pcc5.v1" } });
  });

  it('should split PCC-5 payload to JSON sections', () => {
    const payload = {
      outline: { version: "pcc5.v1" as const, step1_promise: { logline: "Test", contract: ["Q1"] }, step2_countdown: { deadline: "Test", stakes: "Test", beats: { setup: "Test", midpoint: "Test", climax: "Test" } }, step3_crucible: { protagonist: { name: "Test", motivation: "Test", limitation: "Test", transformation: "Test" }, antagonist: { name: "Test", leverage: "Test" }, constraints: ["Test"] }, step4_expansion: { acts: { act1: "Test", act2: "Test", act3: "Test" }, escalation_notes: ["Test"] }, step5_fulfillment: { resolutions: {}, success_criteria: ["Test"] } },
      characters: [{ name: "Test", role: "Test", motivation: "Test", conflict: "Test", arc: "Test", relationships: [] }],
      chapters: [{ id: "ch-01", title: "Test", summary: "Test", pov: "Test", scenes: ["scene-01", "scene-02", "scene-03"] }],
      scenes: [
        { id: "scene-01", chapter: "ch-01", pov: "Test", goal: "Test", conflict: "Test", outcome: "Test", location: "Test", clock: "Test", crucible: "Test", words_target: 900, summary: "Test" },
        { id: "scene-02", chapter: "ch-01", pov: "Test", goal: "Test", conflict: "Test", outcome: "Test", location: "Test", clock: "Test", crucible: "Test", words_target: 1000, summary: "Test" },
        { id: "scene-03", chapter: "ch-01", pov: "Test", goal: "Test", conflict: "Test", outcome: "Test", location: "Test", clock: "Test", crucible: "Test", words_target: 1100, summary: "Test" }
      ]
    };

    const result = splitPcc5ToJson(payload);
    expect(result).toHaveProperty('outline');
    expect(result).toHaveProperty('characters');
    expect(result).toHaveProperty('structure');
    expect(result.structure).toHaveProperty('chapters');
    expect(result.structure).toHaveProperty('scenes');
  });

  it('should generate PCC-5 structure from idea', async () => {
    const idea = {
      idea: "A hero must save the world",
      genre: "Fantasy",
      theme: "Courage"
    };

    const result = await generatePcc5(idea);
    expect(result).toHaveProperty('outline');
    expect(result).toHaveProperty('characters');
    expect(result).toHaveProperty('chapters');
    expect(result).toHaveProperty('scenes');
    expect(result.outline.version).toBe('pcc5.v1');
  });

  it('should regenerate specific sections', async () => {
    const context = {
      outline: {
        version: "pcc5.v1" as const,
        step1_promise: { logline: "Test", contract: ["Q1", "Q2"], genre: "Fantasy", theme: "Courage" },
        step2_countdown: { deadline: "Test", stakes: "Test", beats: { setup: "Test", midpoint: "Test", climax: "Test" } },
        step3_crucible: { protagonist: { name: "Test", motivation: "Test", limitation: "Test", transformation: "Test" }, antagonist: { name: "Test", leverage: "Test" }, constraints: ["Test"] },
        step4_expansion: { acts: { act1: "Test", act2: "Test", act3: "Test" }, escalation_notes: ["Test"] },
        step5_fulfillment: { resolutions: {}, success_criteria: ["Test"] }
      },
      characters: [],
      chapters: [],
      scenes: []
    };

    const result = await regenerateSection('characters', context, { idea: "Test story" });
    expect(result).toHaveProperty('characters');
    expect(Array.isArray(result.characters)).toBe(true);
  });

  it('should calculate word count estimates correctly', () => {
    const payload = {
      outline: { version: "pcc5.v1" as const, step1_promise: { logline: "Test", contract: ["Q1"] }, step2_countdown: { deadline: "Test", stakes: "Test", beats: { setup: "Test", midpoint: "Test", climax: "Test" } }, step3_crucible: { protagonist: { name: "Test", motivation: "Test", limitation: "Test", transformation: "Test" }, antagonist: { name: "Test", leverage: "Test" }, constraints: ["Test"] }, step4_expansion: { acts: { act1: "Test", act2: "Test", act3: "Test" }, escalation_notes: ["Test"] }, step5_fulfillment: { resolutions: {}, success_criteria: ["Test"] } },
      characters: [],
      chapters: Array.from({ length: 30 }, (_, i) => ({
        id: `ch-${String(i + 1).padStart(2, '0')}`,
        title: `Chapter ${i + 1}`,
        summary: "Test chapter",
        pov: "Hero",
        scenes: [`scene-${String(i * 3 + 1).padStart(2, '0')}`, `scene-${String(i * 3 + 2).padStart(2, '0')}`, `scene-${String(i * 3 + 3).padStart(2, '0')}`]
      })),
      scenes: Array.from({ length: 90 }, (_, i) => ({
        id: `scene-${String(i + 1).padStart(2, '0')}`,
        chapter: `ch-${String(Math.floor(i / 3) + 1).padStart(2, '0')}`,
        pov: "Hero",
        goal: "Test goal",
        conflict: "Test conflict",
        outcome: "Test outcome",
        location: "Test location",
        clock: "Test clock",
        crucible: "Test crucible",
        words_target: 900,
        summary: "Test scene"
      }))
    };

    const estimates = getWordCountEstimates(payload);
    expect(estimates.totalWords).toBe(81000); // 30 chapters × 3 scenes × 900 words = 81,000
    expect(estimates.averageSceneWords).toBe(900); // All scenes are 900 words
    expect(estimates.sceneCount).toBe(90);
    expect(estimates.chapterCount).toBe(30);
    expect(estimates.targetNovelLength).toBe('Around 90,000 words');
  });

  it('should have deduceStoryProperties function', async () => {
    // Test that the function exists and can be called
    expect(typeof deduceStoryProperties).toBe('function');

    // Test with empty string (should return empty object)
    const result = await deduceStoryProperties("");
    expect(result).toEqual({});
  });
});
