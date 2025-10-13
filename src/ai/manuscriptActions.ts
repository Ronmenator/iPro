import { getCurrentAIProvider } from './providers';
import { useManuscriptStore } from '../store/manuscriptStore';
import { useDocumentStore } from '../store/documentStore';
import { AnalysisIssue, AnalysisRecommendation } from './manuscriptAnalyzer';
import { autoSaveService } from '../services/autoSaveService';

export interface ActionResult {
  success: boolean;
  message: string;
  changes?: {
    type: 'scene' | 'chapter' | 'metadata' | 'content';
    id: string;
    changes: any;
  }[];
  error?: string;
}

/**
 * Fix a specific issue identified in the manuscript analysis
 */
export async function fixIssue(issue: AnalysisIssue): Promise<ActionResult> {
  try {
    const client = getCurrentAIProvider();
    if (!client) {
      throw new Error('AI client not configured. Please check your AI settings.');
    }

    const { getChapter, getScene, setChapter, setScene } = useManuscriptStore.getState();
    const { loadDocument, saveDocument } = useDocumentStore.getState();

    // Get the relevant content based on issue location
    let content = '';
    let context = '';
    let targetId = '';

    if (issue.location.scene) {
      const scene = getScene(issue.location.scene);
      if (scene) {
        const docId = `scene/${scene.id}`;
        const document = await loadDocument(docId);
        if (document) {
          content = document.blocks.map(block => block.text).join('\n\n');
          context = `Scene: ${scene.title}\nPOV: ${scene.pov || 'Unknown'}\nLocation: ${scene.location || 'Unknown'}\nTime: ${scene.time || 'Unknown'}`;
          targetId = scene.id;
        }
      }
    } else if (issue.location.chapter) {
      const chapter = getChapter(issue.location.chapter);
      if (chapter) {
        context = `Chapter: ${chapter.title}\nPOV: ${chapter.pov || 'Unknown'}\nTheme: ${chapter.theme || 'Unknown'}`;
        targetId = chapter.id;
      }
    }

    // Create a focused prompt for fixing the specific issue
    const fixPrompt = `You are an expert manuscript editor. Fix the following issue in the manuscript:

**Issue Type:** ${issue.type}
**Severity:** ${issue.severity}
**Title:** ${issue.title}
**Description:** ${issue.description}
**Suggestion:** ${issue.suggestion}

**Context:**
${context}

**Content to Fix:**
${content}

**Instructions:**
1. Focus specifically on the issue described above
2. Make minimal, targeted changes to fix the problem
3. Maintain the author's voice and style
4. Ensure the fix is consistent with the rest of the manuscript
5. If the issue is about missing content, add appropriate content
6. If the issue is about inconsistencies, correct them
7. If the issue is about structure, reorganize appropriately

Return ONLY a JSON object with this structure:
{
  "success": true,
  "message": "Brief description of what was fixed",
  "changes": [
    {
      "type": "content|metadata|structure",
      "description": "What was changed",
      "newContent": "The new/updated content (if applicable)",
      "metadataChanges": {
        "field": "newValue"
      }
    }
  ]
}

If you cannot fix this issue automatically, return:
{
  "success": false,
  "message": "This issue requires manual intervention",
  "reason": "Brief explanation of why it cannot be fixed automatically"
}`;

    const response = await client([
      { role: 'system', content: fixPrompt },
      { role: 'user', content: `Please fix this ${issue.type} issue: ${issue.title}` }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (result.success && result.changes) {
      // Apply the changes
      for (const change of result.changes) {
        if (change.type === 'content' && targetId) {
          // Update scene content
          const docId = `scene/${targetId}`;
          const document = await loadDocument(docId);
          if (document) {
            // Update the document with new content
            const newBlocks = change.newContent.split('\n\n').map((text: string, index: number) => ({
              id: `block-${Date.now()}-${index}`,
              text: text.trim(),
              type: 'paragraph' as const,
              hash: ''
            }));
            
            // Recalculate hashes
            const { hashBlock } = await import('../utils/hashing');
            const blocksWithHashes = await Promise.all(
              newBlocks.map(async (block) => ({
                ...block,
                hash: await hashBlock(block.text),
              }))
            );

            const updatedDoc = {
              ...document,
              blocks: blocksWithHashes,
              lastModified: Date.now()
            };

            await saveDocument(updatedDoc);
            // Trigger auto-save after document changes
            autoSaveService.forceSave();
          }
        } else if (change.type === 'metadata' && change.metadataChanges) {
          // Update metadata
          if (issue.location.scene) {
            const scene = getScene(issue.location.scene);
            if (scene) {
              const updatedScene = { ...scene, ...change.metadataChanges, lastModified: Date.now() };
              await setScene(updatedScene);
              // Trigger auto-save after scene metadata changes
              autoSaveService.forceSave();
            }
          } else if (issue.location.chapter) {
            const chapter = getChapter(issue.location.chapter);
            if (chapter) {
              const updatedChapter = { ...chapter, ...change.metadataChanges, lastModified: Date.now() };
              await setChapter(updatedChapter);
              // Trigger auto-save after chapter metadata changes
              autoSaveService.forceSave();
            }
          }
        }
      }
    }

    return {
      success: result.success,
      message: result.message,
      changes: result.changes || []
    };

  } catch (error: any) {
    console.error('Failed to fix issue:', error);
    return {
      success: false,
      message: 'Failed to fix issue',
      error: error.message
    };
  }
}

/**
 * Implement a specific recommendation from the manuscript analysis
 */
export async function implementRecommendation(recommendation: AnalysisRecommendation): Promise<ActionResult> {
  try {
    const client = getCurrentAIProvider();
    if (!client) {
      throw new Error('AI client not configured. Please check your AI settings.');
    }

    const { getChapter, getScene, setChapter, setScene } = useManuscriptStore.getState();
    const { loadDocument, saveDocument } = useDocumentStore.getState();

    // Get the relevant content based on recommendation location
    let content = '';
    let context = '';
    let targetId = '';

    if (recommendation.location.scene) {
      const scene = getScene(recommendation.location.scene);
      if (scene) {
        const docId = `scene/${scene.id}`;
        const document = await loadDocument(docId);
        if (document) {
          content = document.blocks.map(block => block.text).join('\n\n');
          context = `Scene: ${scene.title}\nPOV: ${scene.pov || 'Unknown'}\nLocation: ${scene.location || 'Unknown'}\nTime: ${scene.time || 'Unknown'}`;
          targetId = scene.id;
        }
      }
    } else if (recommendation.location.chapter) {
      const chapter = getChapter(recommendation.location.chapter);
      if (chapter) {
        context = `Chapter: ${chapter.title}\nPOV: ${chapter.pov || 'Unknown'}\nTheme: ${chapter.theme || 'Unknown'}`;
        targetId = chapter.id;
      }
    }

    // Create a focused prompt for implementing the specific recommendation
    const implementPrompt = `You are an expert manuscript editor. Implement the following recommendation to improve the manuscript:

**Recommendation Type:** ${recommendation.type}
**Priority:** ${recommendation.priority}
**Title:** ${recommendation.title}
**Description:** ${recommendation.description}
**Action:** ${recommendation.action}
**Expected Impact:** ${recommendation.impact}

**Context:**
${context}

**Content to Enhance:**
${content}

**Instructions:**
1. Implement the specific recommendation described above
2. Make the changes that will achieve the expected impact
3. Maintain the author's voice and style
4. Ensure the changes are consistent with the rest of the manuscript
5. If adding content, make it meaningful and well-integrated
6. If modifying content, preserve the original intent while improving it
7. If reorganizing, ensure the new structure flows better

Return ONLY a JSON object with this structure:
{
  "success": true,
  "message": "Brief description of what was implemented",
  "changes": [
    {
      "type": "content|metadata|structure",
      "description": "What was changed",
      "newContent": "The new/updated content (if applicable)",
      "metadataChanges": {
        "field": "newValue"
      }
    }
  ]
}

If you cannot implement this recommendation automatically, return:
{
  "success": false,
  "message": "This recommendation requires manual intervention",
  "reason": "Brief explanation of why it cannot be implemented automatically"
}`;

    const response = await client([
      { role: 'system', content: implementPrompt },
      { role: 'user', content: `Please implement this ${recommendation.type} recommendation: ${recommendation.title}` }
    ]);

    const responseText = typeof response === 'string' ? response : response.content || '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    if (result.success && result.changes) {
      // Apply the changes
      for (const change of result.changes) {
        if (change.type === 'content' && targetId) {
          // Update scene content
          const docId = `scene/${targetId}`;
          const document = await loadDocument(docId);
          if (document) {
            // Update the document with new content
            const newBlocks = change.newContent.split('\n\n').map((text: string, index: number) => ({
              id: `block-${Date.now()}-${index}`,
              text: text.trim(),
              type: 'paragraph' as const,
              hash: ''
            }));
            
            // Recalculate hashes
            const { hashBlock } = await import('../utils/hashing');
            const blocksWithHashes = await Promise.all(
              newBlocks.map(async (block) => ({
                ...block,
                hash: await hashBlock(block.text),
              }))
            );

            const updatedDoc = {
              ...document,
              blocks: blocksWithHashes,
              lastModified: Date.now()
            };

            await saveDocument(updatedDoc);
            // Trigger auto-save after document changes
            autoSaveService.forceSave();
          }
        } else if (change.type === 'metadata' && change.metadataChanges) {
          // Update metadata
          if (recommendation.location.scene) {
            const scene = getScene(recommendation.location.scene);
            if (scene) {
              const updatedScene = { ...scene, ...change.metadataChanges, lastModified: Date.now() };
              await setScene(updatedScene);
              // Trigger auto-save after scene metadata changes
              autoSaveService.forceSave();
            }
          } else if (recommendation.location.chapter) {
            const chapter = getChapter(recommendation.location.chapter);
            if (chapter) {
              const updatedChapter = { ...chapter, ...change.metadataChanges, lastModified: Date.now() };
              await setChapter(updatedChapter);
              // Trigger auto-save after chapter metadata changes
              autoSaveService.forceSave();
            }
          }
        }
      }
    }

    return {
      success: result.success,
      message: result.message,
      changes: result.changes || []
    };

  } catch (error: any) {
    console.error('Failed to implement recommendation:', error);
    return {
      success: false,
      message: 'Failed to implement recommendation',
      error: error.message
    };
  }
}

