# Monday Writer

A modern writing application built with React, Vite, and Tailwind CSS with TipTap/ProseMirror editor.

## Features

### Phase 0 — Scaffold & Layout ✅

#### Step 1: App Shell
- ✅ React + Vite + Tailwind setup
- ✅ 3-pane grid layout (Left nav | Editor | Right AI)
- ✅ Dark/light theme toggle
- ✅ Responsive design (>=1024px)

#### Step 2: Left Sidebar (Project Tree)
- ✅ Static tree with mock data (Book, Outline, Chapters, Scenes, Research)
- ✅ Keyboard navigation (Enter, Space, Arrow keys)
- ✅ Expand/collapse functionality
- ✅ Selection state with URL updates (e.g., /scene/scene-01)

#### Step 3: Right Sidebar (AI Panel)
- ✅ Messages list with user/assistant/system messages
- ✅ Message composer
- ✅ System/tool events stream area
- ✅ Resizable panel (drag the divider)

### Phase 1 — Editor & Block Model ✅

#### Step 4: Center Editor (Read-Only First)
- ✅ TipTap/ProseMirror integration with Markdown import
- ✅ Renders paragraphs and headings with proper styling
- ✅ Paragraph "¶" hover affordance on all blocks
- ✅ Loads mock document into editor
- ✅ Read-only and Edit modes

#### Step 5: Stable Block IDs
- ✅ Hidden HTML comments injected per paragraph: `<!-- id: p_xxx -->`
- ✅ Selection model: displays blockId + character offsets
- ✅ DevTools panel shows all block IDs
- ✅ Status bar reveals blockId & offsets when selecting text
- ✅ Block IDs visible in browser DevTools

#### Step 6: Minimal Write Operations
- ✅ Replace selected text via "Apply Replace" button
- ✅ Replace entire block via "Replace Block" button
- ✅ Operations update only targeted range
- ✅ Manual buttons simulate AI-driven edits

### Phase 2 — Document Store & Versioning ✅

#### Step 7: Doc Store + Hashing
- ✅ Zustand state management with IndexedDB persistence
- ✅ Scene-level baseVersion = SHA-256(normalized_text)
- ✅ Block-level hash = SHA-256(block_text)
- ✅ Version Panel displays baseVersion and block hashes
- ✅ Automatic document seeding on first launch
- ✅ In-memory cache with persistent storage

#### Step 8: Op Protocol (Apply/Simulate)
- ✅ Complete TypeScript operation types (6 atomic ops)
- ✅ Batch envelope with conflict detection
- ✅ `simulateOps()` returns visual diff
- ✅ `applyOps()` updates store or returns conflicts
- ✅ Operations Panel UI for testing
- ✅ Diff Viewer for operation preview
- ✅ BASE_VERSION_MISMATCH detection
- ✅ EXPECT_HASH_MISMATCH detection

### Phase 3 — AI Tool Surface (Stubbed) ✅

#### Step 9: Tools the AI Can Call (No LLM Yet)
- ✅ `readBlocks(docId, selectors)` - Read specific blocks
- ✅ `find(docId, {regex, limit})` - Search within documents
- ✅ `getDocIndex(scope)` - List documents by scope
- ✅ `getStyleRules()` - Get writing guidelines
- ✅ Tool Console UI in right sidebar
- ✅ Form-based tool invocation
- ✅ JSON result display
- ✅ All tools fully functional without LLM

#### Step 10: Inline Diff & Accept/Reject
- ✅ Pending operations store (Zustand)
- ✅ Per-operation status tracking
- ✅ Inline diff viewer modal
- ✅ Accept/Reject buttons per operation
- ✅ Accept All / Reject All batch controls
- ✅ Apply Changes panel (floating)
- ✅ Side-by-side old/new comparison
- ✅ Color-coded operation types
- ✅ Changes persist after acceptance

### Phase 4 — Style & Safety ✅

#### Step 11: Style Rules & Lints
- ✅ Style configuration (`/style/voice.json`)
- ✅ 6 lint types: adverbs, passive voice, banlist, clichés, length, tense
- ✅ Lint sidebar (toggleable, right edge)
- ✅ Filter by severity (All/Errors/Warnings/Suggestions)
- ✅ Clickable lint cards
- ✅ Issue highlighting (block level)
- ✅ Real-time lint updates

#### Step 12: Outline Guards
- ✅ Outline cards per scene (Goal/Conflict/Outcome/Clock/Crucible)
- ✅ Outline panel in editor (create/edit)
- ✅ Required beats tracking
- ✅ Delete guard system
- ✅ Confirmation dialog with outline context
- ✅ Override with warning
- ✅ Protected block indicators

### Phase 5 — Persistence & Packaging ✅

#### Step 13: File I/O
- ✅ Export to markdown files (folder structure)
- ✅ Import from markdown files
- ✅ Browser-based export/import with UI
- ✅ Electron native file system access
- ✅ Project metadata tracking
- ✅ Block ID and hash preservation
- ✅ Optional Git integration (commit per batch)

#### Step 14: Electron Wrapper
- ✅ Desktop application (Windows/macOS/Linux)
- ✅ Native file system access
- ✅ Native menus (File/Edit/View/Window/Help)
- ✅ CMD/CTRL+K command palette
- ✅ Keyboard shortcuts
- ✅ Multi-platform builds
- ✅ Production packaging

### Phase 6 — AI Tool Surface (Real) ✅

#### Card 6A: Types & Runtime Contract
- ✅ Enhanced type system for AI operations
- ✅ ToolSurface interface complete
- ✅ Runtime contract enforcement
- ✅ "Read small → propose ops" pattern

#### Card 6B: AI Adapter
- ✅ Zod schema validation
- ✅ LLM-agnostic interface (proposeEdits)
- ✅ OpenAI provider (GPT-4, GPT-3.5)
- ✅ Anthropic provider (Claude 3.5 Sonnet)
- ✅ Mock provider (testing)
- ✅ 6 edit presets + custom prompts

#### Card 6C: Wire to UI
- ✅ AI Actions panel in right sidebar
- ✅ Selection tracking system
- ✅ Real-time diff preview
- ✅ Apply/Reject workflow
- ✅ AI Settings panel
- ✅ End-to-end flow complete

### Phase 7 — Retrieval & Indices (Token Economy) ✅

#### Card 7A: Chunk Index & Search
- ✅ ChunkIndex class with BM25 scoring
- ✅ Fast lexical search over paragraphs
- ✅ Document length normalization
- ✅ Add/remove/update operations
- ✅ Per-document search scoping
- ✅ Global index management

#### Card 7B: Smart Retrieval Pipeline
- ✅ Intent-based filtering (7 intents)
- ✅ Multi-stage pipeline (regex → search → limit)
- ✅ Scene outline context inclusion
- ✅ Retrieval statistics and notes
- ✅ Pattern matching helpers
- ✅ 75%+ token reduction

#### Card 7C: Multi-Block Edit Orchestration
- ✅ Batch edit orchestrator
- ✅ Progressive processing with feedback
- ✅ Scene Batch Actions UI (📚 Batch tab)
- ✅ Combined diff preview
- ✅ Batch statistics display
- ✅ Apply/reject all changes

### Phase 8 — Editing Policies & QA ✅

#### Card 8A: Style & Promise Rules
- ✅ Policy type system (PolicyHit, PolicyReport)
- ✅ Style rule evaluation (5 rules)
- ✅ Outline guards (required beats, markers)
- ✅ Batch policy evaluation
- ✅ Default style rules

#### Card 8B: Gate Edits Before Apply
- ✅ Policy gate (gateBatch, gateAndJustify)
- ✅ Justification system
- ✅ Allowed/blocked/warnings separation
- ✅ Override support
- ✅ Context creation helpers
- ✅ Integration with AI workflow

#### Card 8C: Diff QA & Test Harness
- ✅ Vitest testing framework
- ✅ 14 passing tests
- ✅ Style rules tests (4)
- ✅ Outline guards tests (4)
- ✅ Policy gate tests (3)
- ✅ Integration tests (2)
- ✅ Reversibility test (1)
- ✅ NPM test scripts

## Getting Started

### Web Version

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to the URL shown in the terminal (usually http://localhost:5173)

### Desktop Version (Electron)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the desktop app in development mode:
   ```bash
   npm run electron:dev
   ```

3. Build the desktop app for production:
   ```bash
   # Build for your current platform
   npm run electron:build
   
   # Or build for specific platforms
   npm run electron:build:win   # Windows
   npm run electron:build:mac   # macOS
   npm run electron:build:linux # Linux
   ```

## Project Structure

```
src/
├── components/
│   ├── Layout.jsx          # Main 3-pane layout with resizable panels
│   ├── LeftSidebar.jsx     # Project tree navigation
│   ├── Editor.jsx          # Main content editor
│   ├── RightSidebar.jsx    # AI assistant panel
│   └── ThemeToggle.jsx     # Dark/light theme toggle button
├── context/
│   └── ThemeContext.jsx    # Theme state management
├── App.jsx                 # Main app component with routing
├── main.jsx               # App entry point
└── index.css              # Global styles with Tailwind
```

## Features in Detail

### Theme Toggle
- Click the sun/moon icon in the top-right to switch between light and dark themes
- Theme preference is saved to localStorage

### Project Tree (Dynamic)
- **Live Data**: Tree builds from actual project stores (not mock data)
- **Click** folders to expand/collapse
- **Click** files to navigate (updates URL)
- **Hover Actions**: Buttons appear to add/delete items
  - Green `+` button: Add child item (Part, Chapter, Scene, Outline)
  - Red trash icon: Delete item (with confirmation)
- **Keyboard Navigation**:
  - Enter/Space: Select item
  - Arrow Right: Expand folder
  - Arrow Left: Collapse folder
- **Structure**:
  - Book → Metadata (view/edit project info), Settings
  - Outline → Chapter Outlines
  - Manuscript → Parts → Chapters → Scenes
  - Research → (future feature)
- **Auto-numbering**: New items get sequential IDs (part-01, ch-02, scene-03)
- **Real-time**: Tree updates when you create/delete items or switch projects

### Resizable Panels
- Drag the vertical dividers between panes to resize
- Left sidebar: 200px - 500px
- Right sidebar: 300px - 600px

### AI Panel
- Type messages in the composer and click Send
- Messages appear in the chat history
- System events show in the status area
- Mock AI responses for demonstration

### TipTap Editor
- Select any **Scene** or **Chapter** to open the rich text editor
- Toggle between **Read-Only** and **Edit Mode** using the top buttons
- Hover over any paragraph or heading to see the **¶** (pilcrow) symbol
- Select text to see block ID and character offsets in the status bar
- In **Edit Mode**, select text and use:
  - **Apply Replace**: Replaces selected text
  - **Replace Block**: Replaces entire block content

### DevTools Panel
- Click the **DevTools** button (bottom-right) to open the inspector
- View all block IDs in the document with their content preview
- Open browser DevTools (F12) to see HTML comments: `<!-- id: p_xxx -->`
- Each paragraph and heading has a unique, stable block ID

### Version Panel
- Displays at the top of each document
- Shows: **Base Version** (SHA-256 hash of full document)
- Shows: **Block count**
- Click "Show Block Hashes" to expand full list:
  - Block type (paragraph, heading)
  - Block ID
  - Block hash (SHA-256)
  - Content preview

### Operations Panel
- Click the **Operations** button (bottom-right, purple) to open
- Test all 6 operation types:
  1. **Replace Text Range**: Replace portion of block
  2. **Replace Entire Block**: Replace full block content
  3. **Insert After Block**: Add new block after target
  4. **Delete Block**: Remove block from document
  5. **Move Block**: Reorder blocks
  6. **Annotate Block**: Add notes to blocks
- **Simulate**: Preview changes without applying
  - Visual diff shows old vs new
  - Color-coded by operation type
- **Apply**: Execute operation and persist to storage
- **Conflict Detection**: Automatic version checking

### Document Store
- **Zustand** for state management
- **IndexedDB** for browser persistence
- **SHA-256 hashing** for versioning
- Documents persist across browser refreshes
- Automatic seed data on first launch

### Tool Console
- Click **"Tool Console"** tab in right sidebar
- Test all AI tools without LLM:
  - **readBlocks**: Query specific blocks (by ID, range, type)
  - **find**: Regex search within document
  - **getDocIndex**: List all documents (filterable by scope)
  - **getStyleRules**: View project writing guidelines
- Results display in JSON format
- Form-based parameter input

### Accept/Reject Workflow
1. **Simulate operations** via Operations Panel
2. **Inline Diff modal** opens automatically
3. **Review each change:**
   - See old vs new text side-by-side
   - Click "✓ Accept" or "✕ Reject" per operation
   - Or use "Accept All" / "Reject All"
4. **Apply Changes panel** appears (bottom center)
5. Click **"Apply X Change(s)"** to persist accepted changes
6. Changes save to IndexedDB

### Style Linting
- Click **checkmark icon** (top-right) to toggle lint sidebar
- See all style issues in your document:
  - Adverbs (-ly words)
  - Passive voice
  - Banned words
  - Clichés
  - Long paragraphs
- Filter by severity
- Click issue cards to jump to offending text
- Configure rules in `/style/voice.json`

### Scene Outlines
- Navigate to any scene
- See **"Scene Outline"** panel below version info
- Fill in 5 story elements:
  - 🎯 **Goal** - What they want
  - ⚔️ **Conflict** - What's in the way
  - 🏁 **Outcome** - How it ends
  - ⏰ **Clock** - Time pressure
  - 🔥 **Crucible** - Why they stay
- Mark blocks as required beats
- Protected blocks cannot be deleted without confirmation

### Delete Guards
- When attempting to delete protected blocks:
  - Warning dialog appears
  - Shows outline context
  - Explains which story beat is affected
  - Cancel or override with "Delete Anyway"

### Metadata Viewer
- Click **"Book" → "Metadata"** in the project tree
- **View Mode**: Displays all project information
  - Project name, author, description
  - Version, created date, last modified date
  - Quick action buttons
- **Edit Mode**: Inline editing of all fields
  - Click "Edit" to modify
  - Save or cancel changes
  - Real-time validation
- **Quick Actions**:
  - Open project management
  - Export project

### Project Management
- Press **Ctrl+P** (Cmd+P on Mac) or click the project icon in the toolbar
- **Create New Book:**
  - Start a fresh project from scratch
  - Set project name, author, and description
  - Clears all existing data
- **Save Current Project:**
  - Saves all documents, manuscript structure, and metadata
  - Updates existing project or creates new save
  - Includes parts, chapters, scenes hierarchy
- **Load Projects:**
  - View all saved projects with details
  - Load any project to continue working
  - Shows chapter/scene counts and last saved date
- **Project Operations:**
  - Rename projects
  - Duplicate projects for variations
  - Export to JSON for backup
  - Import from JSON
  - Delete unwanted projects
- **Storage:**
  - All projects stored in browser IndexedDB
  - Private and local (never leaves your computer)
  - Multiple books/projects supported
- See `PROJECT_MANAGEMENT_GUIDE.md` for detailed instructions

### File I/O
- Click **"Export/Import"** button (bottom center)
- **Export Project:**
  - Downloads all documents as markdown files
  - Preserves folder structure
  - Includes metadata and block IDs
  - Works in browser or desktop
- **Import Project:**
  - Select markdown files from folder
  - Reconstructs document store
  - Validates hashes
  - Reloads application

### Desktop Features (Electron)
- **Native Menus:**
  - File → Open/Save/Export/Import
  - Edit → Undo/Redo/Cut/Copy/Paste
  - View → DevTools/Zoom/Fullscreen
  - Window → Minimize/Zoom/Close
  - Help → Documentation/About

- **Command Palette:**
  - Press CMD/CTRL+K
  - Quick access to all commands
  - Fuzzy search
  - Keyboard navigation
  - Action shortcuts

- **File System Access:**
  - Native folder picker
  - Direct file operations
  - Fast import/export
  - Project management

### AI Integration (Phase 6 & 7)

**Quick Actions (Phase 6):**
- **Real LLM integration** with OpenAI and Anthropic
- **AI Actions panel** with 6 quick actions:
  - ✨ Tighten - Remove weak words
  - 🔍 Expand - Add detail
  - 📝 Simplify - Accessible language
  - 🔧 Fix - Grammar and spelling
  - ⚡ Active Voice - Convert passive
  - 🔄 Rephrase - Different wording
- **Selection-based editing** - AI receives only selected text
- **Diff preview** with apply/reject
- **AI Settings** - Configure provider and API keys

**Scene Batch Actions (Phase 7):**
- **📚 Batch tab** - Process entire scenes at once
- **Smart retrieval** - BM25 search + regex filtering
- **7 batch intents**:
  - Reduce Adverbs - Find and fix -ly words
  - Fix Passive Voice - Convert to active
  - Tighten Prose - Remove filler
  - Expand Descriptions - Add detail
  - Simplify Language - Accessible prose
  - Fix Grammar - Correct errors
  - Custom Instruction - Your prompt
- **Token optimization** - 75%+ reduction in AI costs
- **Progressive processing** - Real-time progress bar
- **Combined diff** - Review all changes at once
- **Batch statistics** - See what was processed
- **Scene context** - Includes outline (goal/conflict/outcome)

**Editing Policies & QA (Phase 8):**
- **Policy enforcement** - All edits validated
- **5 style rules**:
  - NoWeakAdverbs - Detects -ly words
  - NoPassiveVoice - Detects passive constructions
  - Banlist - Forbidden words
  - MaxParagraphLength - Length limits
  - NoClichés - Common phrases
- **Outline guards** - Protect story structure
  - Required beats cannot be deleted
  - Beat markers in text
  - Risky operations blocked
- **Justification system** - Every edit explained
- **Policy warnings UI** - Visual feedback
- **Override support** - User control
- **Test harness** - 14 automated tests
- **Reversibility** - Full undo support

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

