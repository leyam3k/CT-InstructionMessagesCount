# CT-InstructionMessagesCount

A SillyTavern/CozyTavern extension that helps track and manage instruction messages in your chat. It provides awareness of active instruction messages and tools to navigate and manage them efficiently.

## Features

### 📊 Counter Badge
- Displays active/total instruction messages in format `x/x` (e.g., `1/5`)
- Shows 1 active instruction out of 5 total instructions
- Updates automatically as messages are added, hidden, or deleted

### 📌 Keep Instructions
- Pin important instructions to prevent auto-hiding
- Kept instructions are automatically unhidden if they were hidden
- Persistent per-chat storage using message content hash
- Survives message deletions and reordering
- **Message-level button**: Click the thumbtack button in the message's extra buttons menu (3 dots)
- **Panel button**: Use the keep button in the instruction messages panel
- Both buttons sync automatically - keeping via one updates the other

### 🧭 Navigation
- Click any instruction in the list to navigate to it
- Smooth scrolling with highlight animation
- Pagination-aware: notifies if message needs to be loaded first

### 🎯 Auto-Hide Feature
- Automatically hide instructions that are no longer second-to-last message
- Excludes kept instructions from auto-hiding
- Optional: can be toggled in settings

### 🔧 Force Hide
- Manually hide all old non-kept instructions at once
- Useful for cleaning up after a conversation segment

### 🧹 Automatic Cleanup
- Automatically removes orphaned kept instructions from deleted messages
- Prevents extension settings bloat from deleted/regenerated messages
- Runs automatically when messages are deleted or chat changes
- Keeps storage clean and efficient

## Installation

1. Open SillyTavern
2. Go to Extensions → Install Extension
3. Paste the GitHub URL: `https://github.com/leyam3k/CT-InstructionMessagesCount`
4. Refresh the page

Or manually place the extension folder in:
```
public/scripts/extensions/third-party/CT-InstructionMessagesCount/
```

## Usage

### Counter Button
- Located in the left send form area
- Shows badge with active/total count (e.g., `1/5`)
- Click to open the instruction messages panel

### Instruction Panel
- **Message List**: Shows all instruction messages with:
  - Message number (e.g., `#6`)
  - Content preview (first 60 characters)
  - Hidden status (grayed out with strikethrough)
- **Keep Button** (📌): Pin/unpin instruction to prevent auto-hiding
- **Navigate Button** (➤): Jump to the message in chat
- **Force Hide Button** (👁️‍🗨️): Hide all old non-kept instructions
- **Refresh Button** (🔄): Manually update the list

### Message-Level Keep Button
- Each instruction message has a thumbtack button in its extra buttons menu (click the 3 dots)
- Click to keep/unkeep the instruction
- Button opacity is 1 when instruction is kept, 0.7 when not kept
- Syncs automatically with the panel's keep status

### Settings
Find CT-InstructionMessagesCount in the Extensions panel:

- **Auto-hide Old Instructions**: Automatically hide instructions that are no longer at least second to the last message (excludes kept instructions)

## What are Instruction Messages?

Instruction messages are system messages with the name "Instruction" (case-insensitive). They are commonly used for:
- Temporary one-time instructions
- Scene directions
- OOC guidance
- Narrative instructions

These messages are typically hidden after use to prevent redundancy in the LLM context.

## How Keep Works

The "Keep" feature uses a unique hash based on message content and timestamp to track instructions across:
- Message deletions
- Message reordering
- Chat reloads

Kept instructions are:
- Immune to auto-hiding
- Automatically unhidden when marked as kept
- Stored per-chat in extension settings

## Use Cases

- Track how many active instructions are in your current context
- Quickly navigate between instruction messages
- Keep important recurring instructions visible
- Clean up old instructions with one click
- Prevent accidental hiding of important instructions

## Troubleshooting

If the extension isn't working:

1. Check browser console (F12) for `[CT-InstructionMessagesCount]` messages
2. Verify all files are in the correct directory
3. Try refreshing the page
4. Check that instruction messages have the name "Instruction"

## Tips

- Use the **Keep** button for instructions you want to reference multiple times
- The **Force Hide** button is useful after completing a conversation segment
- The counter badge helps you stay aware of context usage
- Kept instructions persist across chat sessions

## License

MIT
