# LLM-Integrated Sandpack

A Next.js application that integrates a code sandbox (using Sandpack) with LLM capabilities for modifying code through natural language commands.

## Features

- Interactive code sandbox with real-time preview
- Natural language commands to modify code
- Integrated with OpenAI API (with fallback to mock service)
- Built with Next.js for both frontend and API routes

## Getting Started

### Prerequisites

- Node.js 16.8.0 or later
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with your OpenAI API key:

```
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o  # Optional, defaults to gpt-3.5-turbo
```

### Running the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## API Routes

- `/api/status` - Returns the current status of the LLM service
- `/api/llm-command` - Processes LLM commands to modify code
- `/api/health` - Simple health check endpoint

## Using the App

1. The app loads with a sample JavaScript file
2. Type natural language commands in the input area (e.g., "Fix the syntax error" or "Add a function to reverse a string")
3. Click "Run AI Command" to process the command
4. The code will be updated based on the LLM's response

## Mock Mode

If no OpenAI API key is provided, the app will run in mock mode with limited functionality.
Mock mode supports basic commands like:
- "Fix bug"
- "Add comments"
- "Add reverse string function"

## License

MIT
