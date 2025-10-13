import React, { useState, useEffect } from 'react';
import { useBookStore } from '../store/bookStore';
import { getCurrentAIProvider } from '../ai/providers';
import { Scene } from '../types/book';

interface SceneEditorProps {
  sceneId: string;
  onSceneUpdate: (sceneId: string, updates: any) => void;
}

export default function SceneEditor({ sceneId, onSceneUpdate }: SceneEditorProps) {
  const { getSceneById, getChapterById, updateSceneContent, book } = useBookStore();
  const [scene, setScene] = useState(getSceneById(sceneId));
  const [isWriting, setIsWriting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [writeResult, setWriteResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const currentScene = getSceneById(sceneId);
    setScene(currentScene);
  }, [sceneId, getSceneById]);

  if (!scene) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
        Scene not found
      </div>
    );
  }

  const handleContentChange = (content: string) => {
    updateSceneContent(sceneId, content);
    setScene({ ...scene, content, currentWords: content.split(/\s+/).filter(word => word.length > 0).length });
  };

  const handleWriteScene = async () => {
    if (!scene) return;

    setIsWriting(true);
    setIsStreaming(true);
    setWriteResult(null);
    
    // Clear the editor content before starting
    handleContentChange('');

    try {
      const { book } = useBookStore.getState();
      if (!book?.settings) {
        throw new Error('Book settings not found');
      }
      
      const aiProvider = getCurrentAIProvider(book.settings);
      if (!aiProvider) {
        throw new Error('AI provider not configured');
      }

      // Type assertion to help TypeScript understand the wrapper
      const provider = aiProvider as any;

      // Get chapter and book context
      // Find the chapter that contains this scene
      const chapter = book?.chapters.find(ch => 
        ch.scenes.some(s => s.id === sceneId)
      );
      const bookTitle = book?.title || 'Untitled';
      const bookDescription = book?.description || 'No description available';
      const bookGenre = book?.genre || 'Fiction';
      
      // Get previous scene context
      let previousScene: Scene | null = null;
      let isFirstScene = false;
      let isAfterChapterEnd = false;
      
      if (chapter) {
        const currentSceneIndex = chapter.scenes.findIndex(s => s.id === sceneId);
        
        if (currentSceneIndex === 0) {
          // This is the first scene in the chapter
          isFirstScene = true;
          
          // Check if this is the first scene of the entire book
          const isFirstChapter = book?.chapters[0]?.id === chapter.id;
          if (isFirstChapter) {
            // This is the very first scene of the book
            isFirstScene = true;
          } else {
            // This is the first scene of a new chapter - check if previous chapter ended with a cliffhanger
            const previousChapter = book?.chapters.find(ch => ch.number === chapter.number - 1);
            if (previousChapter && previousChapter.scenes.length > 0) {
              const lastSceneOfPreviousChapter = previousChapter.scenes[previousChapter.scenes.length - 1];
              previousScene = lastSceneOfPreviousChapter;
              isAfterChapterEnd = true;
            }
          }
        } else {
          // Get the previous scene in the same chapter
          previousScene = chapter.scenes[currentSceneIndex - 1];
        }
      }
      
      // Extract last 10 sentences from previous scene
      let previousSceneContext = '';
      if (previousScene && previousScene.content) {
        const sentences = previousScene.content
          .split(/[.!?]+/)
          .filter(s => s.trim().length > 0)
          .slice(-10)
          .join('. ')
          .trim();
        
        if (sentences) {
          previousSceneContext = `\n\n### Previous Scene Context\n**From: ${previousScene.title}**\n${sentences}${sentences.endsWith('.') ? '' : '.'}`;
        }
      }
      
      // Build special instructions based on scene position
      let specialInstructions = '';
      if (isFirstScene && !isAfterChapterEnd) {
        // This is the very first scene of the book
        specialInstructions = `
**SPECIAL INSTRUCTION: EPIC OPENING**
This is the very first scene of the book. Create an absolutely compelling opening that will hook readers from the first sentence. 
- Start with action, intrigue, or a compelling character moment
- Establish the tone and genre immediately
- Introduce the protagonist in a way that makes readers care
- Create immediate tension or mystery
- Make every word count - this scene determines if readers continue`;
      } else if (isAfterChapterEnd) {
        // This is the first scene of a new chapter after a previous chapter ended
        specialInstructions = `
**SPECIAL INSTRUCTION: CHAPTER CONTINUATION**
This scene begins a new chapter. The previous chapter ended with a scene that likely left readers wanting more.
- Continue the story momentum from where the previous chapter left off
- Address any cliffhangers or unresolved tension from the previous chapter
- Maintain the emotional and narrative flow
- Transition smoothly into this new chapter's goals`;
      } else if (previousScene) {
        // This scene follows another scene in the same chapter
        specialInstructions = `
**SPECIAL INSTRUCTION: SCENE CONTINUATION**
This scene follows another scene in the same chapter. Continue the story flow naturally.
- Pick up where the previous scene left off
- Maintain character momentum and emotional state
- Build upon the previous scene's events
- Create smooth transitions while advancing the plot`;
      }

      const prompt = `You are an expert novelist writing in the tradition of Dean Koontz, Dan Brown, and David Baldacci—
      smart, suspenseful, immersive, and character-driven.
      
      Write a compelling, tightly paced scene from the metadata below.
      Your prose should balance **tension and release**: moments of danger or unease offset by
      human warmth, wit, or subtle humor. Violence, when present, must be quick, purposeful,
      and never gratuitous. Language may be intense but always tasteful—PG-13 range.
      
      ${specialInstructions}
      
      ---
      
      ### Story Context
      **Book:** "${bookTitle}" (${bookGenre})
      **Overall Story:** ${bookDescription}
      
      ### Chapter Context
      ${chapter ? `
      **Chapter ${chapter.number}: ${chapter.title}**
      - Summary: ${chapter.summary || 'Not specified'}
      - POV: ${chapter.pov || 'Not specified'}
      - Theme: ${chapter.theme || 'Not specified'}
      - Goal: ${chapter.goal || 'Not specified'}
      - Conflict: ${chapter.conflict || 'Not specified'}
      - Outcome: ${chapter.outcome || 'Not specified'}
      - Target Words: ${chapter.targetWords || 3000}
      - Total Scenes: ${chapter.scenes?.length || 0}
      ` : 'Chapter information not available'}
      
      ### Scene Information
      - Title: ${scene.title}
      - Scene Number: ${scene.number || 'Unknown'}
      - Goal: ${scene.goal || 'Not specified'}
      - Conflict: ${scene.conflict || 'Not specified'}
      - Outcome: ${scene.outcome || 'Not specified'}
      - Location: ${scene.location || 'Not specified'}
      - Time: ${scene.time || 'Not specified'}
      - Clock (Urgency): ${scene.clock || 'Not specified'}
      - Crucible (Constraint): ${scene.crucible || 'Not specified'}
      - POV Character: ${scene.pov || 'Not specified'}
      - Target Words: ${scene.targetWords || 1000}
      
      ${previousSceneContext}
      
      ---
      
      ### Writing Directives
      1. **Purpose & Arc**
         - Fulfill the scene's goal and move plot or character forward.
         - Build continuous tension through choice, consequence, and sensory detail.
         - Ensure the scene fits naturally within the chapter's overall arc and contributes to the book's central story.
         - Consider how this scene builds upon previous events and sets up future developments.
         ${isFirstScene && !isAfterChapterEnd ? '- This is the opening scene - make it absolutely compelling and hook the reader immediately.' : ''}
         ${isAfterChapterEnd ? '- This scene begins a new chapter - address any cliffhangers and maintain story momentum.' : ''}
         ${previousScene && !isAfterChapterEnd ? '- This scene follows another scene - continue the flow naturally from where the previous scene ended.' : ''}
      
      2. **Tone & Mood**
         - Blend realism and intrigue with vivid sensory detail.
         - Use wit or irony to break tension naturally—never slapstick or forced.
         - Keep an undercurrent of unease or discovery even in quiet moments.
      
      3. **Style & Technique**
         - Begin *in motion or dialogue*—no exposition dump or weather report.
         - Maintain consistent POV (third-limited or deep third).
         - Use “show, don’t tell” writing; reveal emotion through reaction, subtext, and rhythm.
         - Vary sentence structure for cinematic pacing.
      
      4. **Dialogue**
         - Dialogue drives tension, reveals motive, and distinguishes character voices.
         - Keep exchanges sharp, authentic, and filled with subtext.
         - Humor should arise naturally from personality, timing, or irony.
      
      5. **Structure**
         - **Opening:** drop into conflict or movement fast.
         - **Middle:** escalate tension or reveal new stakes.
         - **Climax:** immediate resolution or complication of the scene’s goal.
         - **Exit Beat:** leave things *open or unresolved*—a question, danger, or emotional pivot that
           invites the next scene. **Do NOT conclude or moralize.** 
           - Never summarize what was learned or deliver reflective closure.
           - A good scene ends with momentum, not explanation.
      
      6. **Word Count**
         - Write roughly **${scene.targetWords * 1.5 || 2000} words**.
         - End naturally at the scene’s *tipping point*, not its emotional summary.
      
      7. **Content Boundaries**
         - Moderate, purposeful violence only.
         - No explicit sexual content or graphic gore.
         - No brand names or real-world politics.
      
      8. **Output Rules**
         - Output **only the full scene text** — no headings, titles, notes, or commentary.
         - Do not add meta discussion or scene summaries.
         - The output should read as a polished novel excerpt ready for integration into a chapter.
      
      ---
      
      Write the full, immersive scene now.
      `;
      

      // Debug: Log the actual settings being used
      console.log('AI Settings:', {
        model: book.settings.aiModel || 'gpt-4',
        maxTokens: book.settings.aiMaxTokens || 16000,
        temperature: book.settings.aiTemperature || 0.7,
        promptLength: prompt.length
      });

      // Use streaming to get real-time content updates
      try {
        await provider.generateStream({
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Write the scene content for "${scene.title}".` }
          ],
          model: book.settings.aiModel || 'gpt-4',
          maxTokens: book.settings.aiMaxTokens || 16000,
          temperature: book.settings.aiTemperature || 0.7,
        }, (chunk) => {
          // Update content in real-time as it streams
          handleContentChange(chunk.content);
          
          // Show completion message when done
          if (chunk.isComplete) {
            setIsStreaming(false);
            const wordCount = chunk.content.split(/\s+/).filter(word => word.length > 0).length;
            setWriteResult({
              success: true,
              message: `Successfully wrote ${wordCount} words`,
            });
          }
        });
      } catch (streamError) {
        console.log('Streaming failed, trying non-streaming approach:', streamError.message);
        
        // Fallback to non-streaming if streaming fails due to content filter
        const response = await provider.generateText({
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: `Write the scene content for "${scene.title}".` }
          ],
          model: book.settings.aiModel || 'gpt-4',
          maxTokens: book.settings.aiMaxTokens || 16000,
          temperature: book.settings.aiTemperature || 0.7,
        });
        
        handleContentChange(response.content);
        setIsStreaming(false);
        const wordCount = response.content.split(/\s+/).filter(word => word.length > 0).length;
        setWriteResult({
          success: true,
          message: `Successfully wrote ${wordCount} words (non-streaming)`,
        });
      }

    } catch (error) {
      setWriteResult({
        success: false,
        message: `Failed to write scene: ${error.message}`,
      });
    } finally {
      setIsWriting(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Scene Information Panel */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {scene.title}
          </h2>
          <button
            onClick={handleWriteScene}
            disabled={isWriting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isWriting && isStreaming && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isWriting ? (isStreaming ? 'Streaming...' : 'Writing...') : 'AI Write Scene'}
          </button>
        </div>

        {/* Scene Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Goal:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{scene.goal || 'Not specified'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Conflict:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{scene.conflict || 'Not specified'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Outcome:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{scene.outcome || 'Not specified'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Location:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{scene.location || 'Not specified'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Time:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{scene.time || 'Not specified'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Clock:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{scene.clock || 'Not specified'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Crucible:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{scene.crucible || 'Not specified'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">POV:</span>
            <span className="ml-2 text-gray-600 dark:text-gray-400">{scene.pov || 'Not specified'}</span>
          </div>
        </div>

        {/* Word Count */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Words: {scene.currentWords} / {scene.targetWords}
        </div>
      </div>

      {/* Streaming Indicator */}
      {isStreaming && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">AI is writing your scene in real-time...</span>
          </div>
        </div>
      )}

      {/* Write Result */}
      {writeResult && (
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
          writeResult.success
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {writeResult.message}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 p-4">
        <textarea
          value={scene.content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Write your scene here..."
          className="w-full h-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
}
