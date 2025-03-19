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
     - `src/app/` - Contains the main application pages and layout
     - `src/components/` - React components for the UI
     - `src/utils/` - Utility functions
     - `src/app/api/` - API routes for LLM functionality

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

### SandpackEditor

The central component of the application, `SandpackEditor.jsx`, integrates Sandpack with LLM capabilities. It provides:

- A code editor for writing and editing code
- A file explorer for managing files
- A preview pane to see the results in real-time
- A command panel for entering and processing LLM commands

### Command Processing

The command processing flow works as follows:

1. User enters a natural language command (e.g., "Add a button that shows an alert when clicked")
2. The command is sent to the LLM API endpoint
3. The LLM analyzes the current code and generates a plan
4. The plan is executed, making necessary modifications to files
5. Changes are immediately reflected in the Sandpack editor and preview

### API Endpoints

- `/api/llm-command/` - Processes commands to modify existing files
- `/api/llm-plan/` - Generates plans for executing complex commands
- `/api/status/` - Checks the API status and model availability
- `/api/health/` - Health check endpoint

## How It Works

1. **Initialization**
   - The application loads with a set of initial files in the Sandpack environment
   - The SandpackEditor component initializes with the Sandpack provider and UI components

2. **Command Input**
   - Users can enter natural language commands using the LLMCommandInput component
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
3. **Modify the SandpackEditor** to add new functionality
4. **Enhance the command processing** to handle more complex commands

## Limitations and Considerations

- LLM-based code modifications may not always be perfect and might require manual adjustments
- Complex code modifications may require multiple steps or commands
- API rate limits may apply depending on your OpenAI subscription

## Troubleshooting

- **API Connection Issues**: Check your API key and environment variables
- **Command Processing Errors**: Try simplifying your command or breaking it into multiple steps
- **Sandpack Editor Loading**: If the editor fails to load, check your browser console for errors
