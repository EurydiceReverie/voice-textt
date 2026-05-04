# AI Chat

A calm, fast AI chat application with streaming responses, voice input.

## Features

- **Real-time streaming** — AI responses stream back word-by-word
- **Voice input** — Speak your messages using browser speech recognition
- **Dark/Light theme** — Automatic detection with manual toggle
- **Conversation history** — Persisted in localStorage
- **Markdown rendering** — Full support for code blocks, lists, headings, etc.
- **Resizable sidebar** — Drag to resize, collapse for more space
- **Responsive** — Works on desktop and mobile

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Backend:** Hono (lightweight server for API proxying)
- **AI:** Groq API with Llama 3.3 70B
- **Build:** Vite, Bun (optional)

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- A [Groq API key](https://console.groq.com/)

### Installation

```bash
# Install dependencies
npm install
# or
bun install
```

### Environment Setup

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Add your Groq API key to `.env`:
   ```
   GROQ_API_KEY=your_actual_api_key_here
   ```

### Development

```bash
npm run dev
# or
bun dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── chat/          # Chat UI components
│   │   └── ui/            # shadcn/ui components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities (storage, speech, etc.)
│   ├── routes/            # Page components
│   ├── server/            # Hono API server
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   └── styles.css         # Global styles
├── .env.example           # Environment template
├── index.html             # HTML entry
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

## Scripts

| Command           | Description               |
| ----------------- | ------------------------- |
| `npm run dev`     | Start development server  |
| `npm run build`   | Build for production      |
| `npm run preview` | Preview production build  |
| `npm run lint`    | Run ESLint                |
| `npm run format`  | Format code with Prettier |

## Environment Variables

| Variable       | Required | Description                          |
| -------------- | -------- | ------------------------------------ |
| `GROQ_API_KEY` | Yes      | Your Groq API key for AI completions |

## License

MIT Licensed
