import { getCurrentAIProvider } from './providers';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useDocumentStore } from '../store/documentStore';
import { useOutlineStore } from '../store/outlineStore';
import { useProjectStore } from '../store/projectStore';

export interface ManuscriptAnalysisResult {
  success: boolean;
  analysis?: {
    summary: string;
    issues: AnalysisIssue[];
    recommendations: AnalysisRecommendation[];
    statistics: AnalysisStatistics;
  };
  error?: string;
}

export interface AnalysisIssue {
  id: string;
  type: 'continuity' | 'consistency' | 'coherence' | 'structure' | 'character' | 'plot' | 'style';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location: {
    chapter?: string;
    scene?: string;
    specific?: string;
  };
  suggestion: string;
}

export interface AnalysisRecommendation {
  id: string;
  type: 'add' | 'modify' | 'remove' | 'reorganize' | 'enhance';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  location: {
    chapter?: string;
    scene?: string;
    specific?: string;
  };
  action: string;
  impact: string;
}

export interface AnalysisStatistics {
  totalChapters: number;
  totalScenes: number;
  totalWords: number;
  averageWordsPerScene: number;
  averageWordsPerChapter: number;
  scenesWithoutContent: number;
  chaptersWithoutScenes: number;
  characterConsistency: number; // 0-100 score
  plotCoherence: number; // 0-100 score
  pacingScore: number; // 0-100 score
}

/**
 * Compile entire manuscript structure and content into a comprehensive document
 */
export async function compileManuscriptForAnalysis(): Promise<string> {
  const { getAllParts, getAllChapters, getAllScenes, getScenesByChapter } = useManuscriptStore.getState();
  const { documents } = useDocumentStore.getState();
  const { chapterCards } = useOutlineStore.getState();

  const parts = getAllParts();
  const chapters = getAllChapters();
  const scenes = getAllScenes();

  let manuscriptText = '# MANUSCRIPT ANALYSIS\n\n';
  manuscriptText += `**Analysis Date:** ${new Date().toISOString()}\n`;
  manuscriptText += `**Total Parts:** ${parts.length}\n`;
  manuscriptText += `**Total Chapters:** ${chapters.length}\n`;
  manuscriptText += `**Total Scenes:** ${scenes.length}\n\n`;

  // Add project metadata if available
  const { metadata } = useProjectStore.getState();
  if (metadata) {
    manuscriptText += `## Project Information\n`;
    manuscriptText += `**Title:** ${metadata.title || 'Untitled'}\n`;
    manuscriptText += `**Author:** ${metadata.author || 'Unknown'}\n`;
    manuscriptText += `**Genre:** ${metadata.genre || 'Unknown'}\n`;
    manuscriptText += `**Target Audience:** ${metadata.targetAudience || 'Unknown'}\n\n`;
  }

  // Process each part
  for (const part of parts) {
    manuscriptText += `# PART: ${part.title}\n\n`;
    if (part.summary) {
      manuscriptText += `**Summary:** ${part.summary}\n\n`;
    }

    const partChapters = chapters.filter(ch => ch.part === part.id);
    
    for (const chapter of partChapters) {
      manuscriptText += `## CHAPTER ${chapter.number}: ${chapter.title}\n\n`;
      
      // Add chapter metadata
      if (chapter.pov) manuscriptText += `**POV Character:** ${chapter.pov}\n`;
      if (chapter.theme) manuscriptText += `**Theme:** ${chapter.theme}\n`;
      if (chapter.summary) manuscriptText += `**Summary:** ${chapter.summary}\n`;
      if (chapter.targetWords) manuscriptText += `**Target Words:** ${chapter.targetWords}\n`;
      if (chapter.currentWords) manuscriptText += `**Current Words:** ${chapter.currentWords}\n`;
      manuscriptText += `**Last Modified:** ${new Date(chapter.lastModified).toISOString()}\n\n`;

      // Add outline information if available
      const chapterCard = chapterCards.get(chapter.id);
      if (chapterCard) {
        manuscriptText += `### Chapter Outline\n`;
        manuscriptText += `**Goal:** ${chapterCard.goal || 'Not specified'}\n`;
        manuscriptText += `**Conflict:** ${chapterCard.conflict || 'Not specified'}\n`;
        manuscriptText += `**Outcome:** ${chapterCard.outcome || 'Not specified'}\n\n`;
      }

      // Add scenes
      const chapterScenes = getScenesByChapter(chapter.id);
      if (chapterScenes.length === 0) {
        manuscriptText += `**⚠️ NO SCENES FOUND**\n\n`;
      } else {
        for (const scene of chapterScenes) {
          manuscriptText += `### SCENE: ${scene.title}\n\n`;
          
          // Add scene metadata
          if (scene.pov) manuscriptText += `**POV:** ${scene.pov}\n`;
          if (scene.location) manuscriptText += `**Location:** ${scene.location}\n`;
          if (scene.time) manuscriptText += `**Time:** ${scene.time}\n`;
          if (scene.goal) manuscriptText += `**Goal:** ${scene.goal}\n`;
          if (scene.conflict) manuscriptText += `**Conflict:** ${scene.conflict}\n`;
          if (scene.outcome) manuscriptText += `**Outcome:** ${scene.outcome}\n`;
          if (scene.clock) manuscriptText += `**Clock:** ${scene.clock}\n`;
          if (scene.crucible) manuscriptText += `**Crucible:** ${scene.crucible}\n`;
          if (scene.wordsTarget) manuscriptText += `**Target Words:** ${scene.wordsTarget}\n`;
          if (scene.wordsCurrent) manuscriptText += `**Current Words:** ${scene.wordsCurrent}\n`;
          manuscriptText += `**Last Modified:** ${new Date(scene.lastModified).toISOString()}\n\n`;

          // Add scene content
          const docId = `scene/${scene.id}`;
          const document = documents.get(docId);
          if (document && document.blocks.length > 0) {
            manuscriptText += `#### Scene Content:\n`;
            for (const block of document.blocks) {
              if (block.text.trim()) {
                manuscriptText += `${block.text}\n\n`;
              }
            }
          } else {
            manuscriptText += `**⚠️ NO CONTENT FOUND**\n\n`;
          }
        }
      }
    }
  }

  return manuscriptText;
}

/**
 * Analyze manuscript for continuity, consistency, and coherence issues
 */
export async function analyzeManuscript(): Promise<ManuscriptAnalysisResult> {
  try {
    const client = getCurrentAIProvider();
    if (!client) {
      throw new Error('AI client not configured. Please check your AI settings.');
    }

    // Compile manuscript
    const manuscriptText = await compileManuscriptForAnalysis();
    
    // Create analysis prompt
    const analysisPrompt = `You are an expert manuscript editor and story analyst. Analyze the following manuscript for continuity, consistency, coherence, and structural issues.

**Analysis Focus Areas:**
1. **Continuity Issues**: Timeline inconsistencies, character location/state changes, plot holes
2. **Consistency Issues**: Character voice/personality changes, world-building inconsistencies, tone shifts
3. **Coherence Issues**: Plot logic, character motivations, story flow, pacing
4. **Structural Issues**: Scene organization, chapter flow, narrative arc
5. **Character Development**: Character arcs, relationships, motivations
6. **Plot Development**: Story progression, conflict resolution, pacing

**Response Format:**
Return ONLY a JSON object with this exact structure:
{
  "summary": "Brief overall assessment of the manuscript",
  "issues": [
    {
      "id": "issue-1",
      "type": "continuity|consistency|coherence|structure|character|plot|style",
      "severity": "low|medium|high|critical",
      "title": "Brief issue title",
      "description": "Detailed description of the issue",
      "location": {
        "chapter": "Chapter title or ID",
        "scene": "Scene title or ID",
        "specific": "Specific location if applicable"
      },
      "suggestion": "Specific suggestion to fix the issue"
    }
  ],
  "recommendations": [
    {
      "id": "rec-1",
      "type": "add|modify|remove|reorganize|enhance",
      "title": "Brief recommendation title",
      "description": "Detailed description of the recommendation",
      "priority": "low|medium|high",
      "location": {
        "chapter": "Chapter title or ID",
        "scene": "Scene title or ID",
        "specific": "Specific location if applicable"
      },
      "action": "Specific action to take",
      "impact": "Expected impact of the change"
    }
  ],
  "statistics": {
    "totalChapters": 0,
    "totalScenes": 0,
    "totalWords": 0,
    "averageWordsPerScene": 0,
    "averageWordsPerChapter": 0,
    "scenesWithoutContent": 0,
    "chaptersWithoutScenes": 0,
    "characterConsistency": 0,
    "plotCoherence": 0,
    "pacingScore": 0
  }
}

**Important:**
- Be thorough but constructive
- Focus on actionable feedback
- Consider the genre and target audience
- Look for both problems and opportunities
- Provide specific locations when possible
- Calculate statistics based on the manuscript data

Manuscript to analyze:
${manuscriptText}`;

    const response = await client([
      { role: 'system', content: analysisPrompt },
      { role: 'user', content: 'Please analyze this manuscript and provide detailed feedback.' }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const analysisData = JSON.parse(jsonMatch[0]);
    
    return {
      success: true,
      analysis: analysisData
    };

  } catch (error: any) {
    console.error('Manuscript analysis failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze manuscript'
    };
  }
}
