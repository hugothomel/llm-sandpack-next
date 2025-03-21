# LLM Sandpack

## Overview

LLM Sandpack is an interactive web application that combines the power of Large Language Models (LLMs) with Sandpack, a live coding environment from CodeSandbox. This project allows users to modify code using natural language commands, creating a seamless integration between AI and code editing.

## Repository Structure

The repository consists of two main parts:

1. **Root `src/` Directory**
   - `components/` - Contains UI components like `SandpackEditor.jsx` and `LLMCommandInput.jsx`
   - `utils/` - Utility functions and helpers
   - `app/` - Contains API endpoints for LLM integration

2. **Next.js Application (`llm-sandpack-next/`)**
   - A complete Next.js application with its own structure:
     - `src/pages/` - Contains the main application pages and layout
     - `src/components/` - React components for the UI
     - `src/utils/` - Utility functions
     - `src/pages/api/` - API routes for LLM functionality

## Key Features

- **Interactive Code Editing** - Live code environment powered by Sandpack
- **LLM Command Processing** - Use natural language to modify code
- **Plan-Based Execution** - Complex modifications are planned before execution
- **File Creation and Modification** - Create new files or modify existing ones using LLM
- **Real-time Preview** - See code changes immediately in the preview pane

## Technical Stack

- **Frontend**
  - Next.js - React framework for server-rendered applications
  - React - Frontend UI library
  - Tailwind CSS - Utility-first CSS framework

- **Code Editing**
  - `@codesandbox/sandpack-react` - React components for Sandpack
  - `@codesandbox/sandpack-client` - Client library for Sandpack
  - `sandpack-file-explorer` - File explorer for Sandpack

- **AI Integration**
  - OpenAI API - For accessing LLM capabilities
  - Custom API endpoints for processing LLM commands

## Core Components

### Critical Architecture Components (Do Not Modify)

The following components form the core architecture of LLM Sandpack and should not be modified if implementing this system in another application:

#### 1. **SandpackCodePanel**

This component (formerly named `SandpackPanel`) is the central UI element that provides:
- The Sandpack code editor interface
- File explorer functionality
- Live preview rendering
- Integration with Sandpack methods

It exposes critical methods through the `onSandpackReady` callback that other components depend on.

#### 2. **SandpackChatPanel**

This component (formerly named `ChatPanel`) handles all LLM interactions:
- Command input and submission
- Communication with the LLM API endpoint
- Plan generation and execution
- Log display and user feedback

#### 3. **Critical Sandpack Methods**

The following Sandpack methods are essential for the LLM integration to work:
- `getFiles()` - Retrieves all files in the Sandpack environment
- `getActiveFile()` - Gets the currently active file path
- `updateFile(filePath, newCode)` - Updates or creates files with new content

### Command Processing

The command processing flow works as follows:

1. User enters a natural language command (e.g., "Add a button that shows an alert when clicked")
2. The command is sent to the LLM API endpoint
3. The LLM analyzes the current code and generates a plan
4. The plan is executed, making necessary modifications to files
5. Changes are immediately reflected in the Sandpack editor and preview

### API Endpoints

- `/api/llm-commands` - Main endpoint that processes all LLM operations:
  - `?operation=status` - Checks the API status and model availability 
  - `POST` with `operation=plan` - Generates plans for executing complex commands
  - `POST` with `operation=command` - Processes commands to modify existing files

## How It Works

1. **Initialization**
   - The application loads with a set of initial files in the Sandpack environment
   - The SandpackCodePanel component initializes with the Sandpack provider and UI components

2. **Command Input**
   - Users can enter natural language commands using the SandpackChatPanel component
   - Commands are sent to the API for processing

3. **Planning Phase**
   - The LLM analyzes the command and current codebase
   - It generates a plan specifying which files to modify or create
   - The plan is presented to the user for approval

4. **Execution Phase**
   - Once approved, the plan is executed
   - For each file in the plan:
     - If the file exists, it's modified according to the command
     - If the file doesn't exist, it's created with appropriate content
   - The Sandpack editor is updated with the new content

5. **Preview**
   - Changes are immediately reflected in the preview pane
   - Users can interact with the preview to test the modifications

## Environment Configuration

The application requires several environment variables to be set in a `.env.local` file:
- OpenAI API keys for LLM functionality
- Model configurations
- API endpoint settings

An example configuration is provided in `.env.example`.

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd llm-sandpack
   ```

2. **Install dependencies**
   ```bash
   # For the Next.js application
   cd llm-sandpack-next
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your OpenAI API key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open your browser and navigate to `http://localhost:3003`

## Key Usage Examples

1. **Simple Code Modifications**
   - "Add a function to calculate the factorial of a number"
   - "Fix the bug in the brokenFunction"

2. **UI Component Creation**
   - "Create a button component with hover effects"
   - "Add a form with validation for email and password"

3. **File Management**
   - "Create a new utils.js file with helper functions"
   - "Split this component into multiple files"

## Development and Extension

To extend the application with new features:

1. **Add new components** in the `components/` directory
2. **Create new API endpoints** in the `api/` directory
3. **Modify the SandpackCodePanel** to add new functionality
4. **Enhance the command processing** to handle more complex commands

## Limitations and Considerations

- LLM-based code modifications may not always be perfect and might require manual adjustments
- Complex code modifications may require multiple steps or commands
- API rate limits may apply depending on your OpenAI subscription

## Troubleshooting

- **API Connection Issues**: Check your API key and environment variables
- **Command Processing Errors**: Try simplifying your command or breaking it into multiple steps
- **Sandpack Editor Loading**: If the editor fails to load, check your browser console for errors

# LLM Sandpack Next

A Next.js application that integrates Sandpack Editor with LLM capabilities.

## API Endpoints

The application provides a unified API endpoint for all LLM operations:

### GET /api/llm-commands

- `operation=health`: Check API health
- `operation=status`: Get the current status of the LLM service (OpenAI or Mock)

```bash
# Health check
curl -X GET "http://localhost:3000/api/llm-commands?operation=health"

# Status check 
curl -X GET "http://localhost:3000/api/llm-commands?operation=status"
```

### POST /api/llm-commands

This endpoint handles two main operations:

#### Plan Generation (`operation=plan`)

```json
{
  "operation": "plan",
  "command": "Your command text",
  "files": { 
    "/file1.js": "content of file1",
    "/file2.js": "content of file2"
  },
  "activeFile": "/file1.js"
}
```

#### Command Execution (`operation=command`)

```json
{
  "operation": "command",
  "command": "Your command text",
  "currentCode": "Current file content",
  "filePath": "/path/to/file.js",
  "allFiles": {
    "/file1.js": "content of file1",
    "/file2.js": "content of file2"
  },
  "isNewFile": false
}
```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `OPENAI_MODEL`: The model to use (defaults to 'gpt-3.5-turbo')

## Development

```bash
npm install
npm run dev
```

Then open http://localhost:3000 in your browser.
