# Google Stitch Prompt — Food Guidance ChatBot Frontend

## How to Use
1. Go to https://stitch.withgoogle.com
2. Click **"New Project"** → choose **"Web App"**
3. Paste the prompt below into the Stitch input
4. Review the generated UI and iterate with the refinement prompts at the bottom

---

## Main Prompt

```
Design a premium, production-quality chat interface for a "Dietary Guidance RAG ChatBot" 
web application. The design must be inspired by ChatGPT / Google Gemini — modern, dark-themed, 
clean, and highly polished.

## VISUAL DESIGN REQUIREMENTS

**Color Palette (Dark Theme):**
- Background base: #0a0d14
- Surface panels (sidebar, header, cards): #111827
- Elevated elements (message bubbles, inputs): #1a2236
- Primary accent: Emerald green #10b981 (used for AI elements, CTA buttons, active states)
- Secondary accent: Indigo #6366f1 (used for user messages)
- Text primary: #f1f5f9
- Text secondary: #94a3b8
- Text muted: #475569

**Typography:**
- Font family: Inter (Google Fonts)
- Body text: 14-15px, line-height 1.7
- Headings: Semi-bold, tight letter spacing

**Visual Flourishes:**
- Subtle gradient backgrounds on key elements
- Glassmorphism on modals (backdrop blur + semi-transparent)
- Soft box shadows on cards and buttons
- Micro-animations: hover scale effects, fade-in for messages, floating icon animation on welcome screen
- Gradient text on titles using emerald-to-indigo

---

## LAYOUT STRUCTURE

### Left Sidebar (280px wide, collapsible on mobile)
- App logo/name: "🥗 NutriChat" with gradient text
- "✚ New Chat" button — full width, emerald gradient, rounded, with hover glow effect
- Chat history list:
  - Section label "Conversations" in small uppercase muted text
  - Each item: chat icon + title (truncated), timestamp
  - Active item: left border accent, slightly brighter background
  - Hover reveals action buttons (delete icon)
- Footer: small text "Powered by WHO, NHS, USDA & FAO guidance"

### Main Chat Area
1. **Header Bar** (60px tall):
   - Chat title (bold, truncatable)
   - Right side: Document filter dropdown + Share button
   - Subtle separator line below

2. **Messages Scroll Area** (flex-grows to fill):
   - When empty: Welcome screen with centered content
   - When active: Scrollable message list with auto-scroll to bottom

3. **Input Area** (fixed bottom, blurred glass background):
   - Rounded pill-style input box with emerald focus ring glow
   - Auto-resizing textarea (grows up to 5 lines)
   - Send button: circular, emerald gradient, subtle lift on hover
   - Hint text below: "Shift+Enter for new line"

---

## WELCOME SCREEN (shown when no messages)

Center-aligned content:
- Large animated 🥗 emoji (gentle floating animation)
- Gradient heading: "Dietary Guidance Assistant"
- Subtitle paragraph explaining the chatbot's purpose
- 2×2 suggestion card grid:
  - Card 1: 🥗 "How much salt should I eat per day?"
  - Card 2: 🍗 "How long can cooked chicken be refrigerated?"
  - Card 3: 🥦 "What vegetables does the Eatwell Guide recommend?"
  - Card 4: 🛢️ "Is it safe to reuse cooking oil?"
  - Cards: dark elevated background, rounded corners, hover lift + emerald border glow

---

## MESSAGE BUBBLES

**User Messages (right-aligned):**
- Indigo gradient bubble (#6366f1 → #4f46e5)
- Right avatar: user icon in indigo circle
- Max-width: 75% of chat area
- Slightly smaller bottom-right radius (tail effect)

**AI Messages (left-aligned):**
- Dark elevated background with subtle border
- Left avatar: 🥗 in emerald circle
- Full width available
- Renders markdown: headers, bold, lists, code blocks, tables, links
- Citation links styled in emerald color

**Special Message States:**
- OOS (Out of Scope) refusal: Red-tinted bubble + "⚠️ Out of Scope" badge
- NIC (Not in Corpus) refusal: Amber/yellow-tinted bubble + "📭 Not in Corpus" badge

**Message Metadata (below each bubble):**
- Timestamp in muted small text
- "✨ Multi-Source" badge (indigo pill) when answer combines multiple documents
- "📚 [Document Name]" source badges in emerald pill style
- On hover: action icons appear (edit pencil for user, copy for AI)

---

## INLINE MESSAGE EDITING

When user clicks the edit (pencil) icon on a user message:
- The message transforms into an inline edit form
- Auto-resizing textarea pre-filled with original message
- "Save" button (emerald) and "Cancel" button (ghost)
- Pressing Enter submits, Escape cancels
- Visual: emerald border glow to indicate edit mode
- Note: saving re-runs the AI pipeline from that message point

---

## TYPING / LOADING INDICATOR

Three bouncing dots animation in emerald color, inside an AI-styled bubble:
- Each dot is 7px circle
- Staggered bounce animation (0ms, 200ms, 400ms delay)

---

## SHARE MODAL

Triggered by "Share" button in header:
- Modal overlay with blur backdrop
- Centered card with rounded corners (glassmorphism effect)
- Title: "Share Conversation" with share icon
- Explanation text: "Anyone with this link can view in read-only mode"
- URL input (read-only, monospace font) + "Copy" button
- "Copy" button changes to "✓ Copied!" on click with color shift
- "Close" ghost button at bottom

---

## DOCUMENT FILTER DROPDOWN (in header)

- Styled select: dark background, subtle border, emerald focus
- Options: "All Documents" + individual document names
- Selecting a document scopes all subsequent queries to that source
- Small label or icon indicating filter is active

---

## RESPONSIVE BEHAVIOR

- Desktop (>768px): Full sidebar + chat layout as described
- Mobile (<768px): Sidebar hidden (hamburger menu to toggle), full-width chat
- Input area: Always full width, padding adjusted for mobile

---

## MICRO-ANIMATIONS (important for premium feel)

1. Messages slide up + fade in when appearing (0.3s ease-out)
2. New chat button lifts 2px on hover with glow shadow
3. Suggestion cards lift 2px on hover with border glow
4. Send button scales 1.08x on hover
5. Session items smoothly highlight on hover
6. Welcome emoji floats gently (CSS keyframe, 3s loop)
7. Modal slides up + fades in from overlay
8. Share "Copy" button briefly pulses on click
9. Edit mode bubble glows with emerald ring

---

## PAGES TO DESIGN

### Page 1: Main Chat Interface (described above)
Route: /

### Page 2: Shared Conversation View
Route: /share/[sessionId]

Layout:
- Simplified header: logo + chat title + "Start your own chat →" CTA button
- Read-only chat message list (same bubble styling as main page)
- No input area, no sidebar
- Banner note: "This is a read-only view of a shared conversation"

---

## TECH STACK CONTEXT (for Stitch to generate correct code)

- Framework: Next.js 14 (App Router)
- Language: TypeScript
- Styling: Vanilla CSS (CSS custom properties / variables)
- Markdown rendering: react-markdown with remark-gfm
- Animations: CSS keyframes + framer-motion for complex transitions
- State: React useState / useCallback (no Redux needed)
- API: REST calls to FastAPI backend via fetch()
- Font: Inter from Google Fonts

---

## REFINEMENT PROMPTS (use these to iterate in Stitch)

After initial generation, use these follow-up prompts:

1. "Make the suggestion cards more visually distinct with icons displayed larger and add a subtle emerald gradient border glow on hover"

2. "Add a smooth slide-in animation for sidebar session items when the list updates"

3. "Improve the message bubble shadows — user bubbles should have a soft indigo glow, AI bubbles should have a subtle dark shadow"

4. "Make the document filter dropdown show a small colored indicator when a filter is active (not 'All Documents')"

5. "Add a loading skeleton animation while sessions are being fetched from the API"

6. "Make the header share button have a pulsing animation when a conversation has messages (to draw attention to the feature)"
```

---

## Files Already Created (Reference This When Implementing)

The following files are already built and should be used as the implementation:

| File | Purpose |
|---|---|
| `frontend/src/app/page.tsx` | Main chat interface (full implementation) |
| `frontend/src/app/share/[sessionId]/page.tsx` | Shareable read-only view |
| `frontend/src/app/globals.css` | Complete design system CSS |
| `frontend/src/lib/api.ts` | API client |
| `frontend/src/types/index.ts` | TypeScript types |
| `api/main.py` | FastAPI backend |
| `vercel.json` | Vercel deployment config |
| `railway.json` | Railway deployment config |
