import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Get model from environment or use default
const DEFAULT_MODEL = 'gpt-3.5-turbo';
const MODEL = process.env.OPENAI_MODEL || DEFAULT_MODEL;

interface CommandResult {
  newCode: string | null;
  message: string;
}

interface PlanResult {
  plan: {
    description: string;
    filesToModify: string[];
    fileExplanations: Record<string, string>;
  } | null;
  message: string;
}

/**
 * Generate a plan for modifying code based on a command
 * @param {string} command - Natural language command from user
 * @param {Record<string, string>} files - Object with file paths as keys and code content as values
 * @param {string} activeFile - Currently active file path
 * @returns {Promise<PlanResult>} Plan with files to modify and description
 */
export async function generatePlan(
  command: string,
  files: Record<string, string>,
  activeFile: string
): Promise<PlanResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        plan: null,
        message: "OpenAI API key is not configured. Please add your API key to the .env.local file."
      };
    }
    
    console.log(`Generating plan with OpenAI (${MODEL}): "${command}"`);
    
    // Get information about all files in the project
    const fileEntries = Object.entries(files);
    
    // For small projects, include full content of all files
    // For larger projects, include full content of active file and relevant files,
    // and summaries of others to stay within token limits
    const MAX_FILES_FOR_FULL_CONTENT = 5;
    const MAX_FILE_SIZE = 5000; // Characters per file for non-active files
    
    let filesContent: string;
    
    if (fileEntries.length <= MAX_FILES_FOR_FULL_CONTENT) {
      // Include full content of all files for small projects
      filesContent = fileEntries.map(([path, content]) => {
        return `FILE: ${path}\n\`\`\`\n${content}\n\`\`\`\n`;
      }).join('\n');
    } else {
      // For larger projects, be more selective
      // First, create file type groups
      const filesByExtension: Record<string, string[]> = {};
      fileEntries.forEach(([path]) => {
        const ext = path.split('.').pop() || 'unknown';
        if (!filesByExtension[ext]) filesByExtension[ext] = [];
        filesByExtension[ext].push(path);
      });
      
      // Always include the active file with full content
      const activeFileContent = `ACTIVE FILE: ${activeFile}\n\`\`\`\n${files[activeFile]}\n\`\`\`\n\n`;
      
      // Include summaries of other files, grouped by type
      const otherFilesContent = Object.entries(filesByExtension)
        .map(([ext, filePaths]) => {
          const filesList = filePaths.map(path => {
            // If it's the active file, skip (we already included it)
            if (path === activeFile) return null;
            
            const content = files[path];
            // Truncate content if too large
            const truncatedContent = content.length > MAX_FILE_SIZE 
              ? content.substring(0, MAX_FILE_SIZE) + '... [truncated]'
              : content;
              
            return `FILE: ${path}\n\`\`\`\n${truncatedContent}\n\`\`\`\n`;
          }).filter(Boolean).join('\n');
          
          return `FILES OF TYPE .${ext}:\n${filesList}`;
        }).join('\n\n');
      
      filesContent = activeFileContent + otherFilesContent;
    }
    
    // Construct the prompt for GPT
    const systemPrompt = `You are an AI assistant helping a developer with code changes.
You will be provided with a command and the contents of files in a project.
Your job is to create a detailed plan for which files need to be modified based on the command and the file contents.

Please analyze all file contents to understand their purpose and relationships.
Look for dependencies between files and how they interact with each other.
Consider which files would need to change to fulfill the user's command.

For your response, follow this format exactly:
1. A description of what needs to be done (2-3 sentences)
2. A JSON array listing the file paths that need to be modified (e.g., ["/index.js", "/styles.css"])
3. For each file in the array, provide a brief explanation of why it needs to be modified (one sentence per file)

Do not include any explanations outside of this format.
Only list files that are relevant to the command and genuinely need changes.
If only one file needs changes, that's fine - don't force changes to multiple files.`;

    // Make API call to OpenAI with all file contents
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `COMMAND: ${command}\n\nFILE STRUCTURE:\n${filesContent}` }
      ],
      temperature: 0.2, // Lower temperature for more deterministic results
      max_tokens: 2048, // Increased token limit for larger responses with file content analysis
    });
    
    // Extract the response text
    const responseText = response.choices[0]?.message?.content?.trim();
    
    // Check if we got a valid response
    if (!responseText) {
      return {
        plan: null,
        message: "The AI could not generate a valid plan. Please try again with a different command."
      };
    }
    
    // Parse the response to get description and file list
    // First line should be the description
    const description = responseText.split('\n')[0].trim();
    
    // Look for a JSON array in the response
    // Use a regex that works without 's' flag for ES2018 compatibility
    const fileListMatch = responseText.match(/\[([\s\S]*?)\]/);
    let filesToModify: string[] = [];
    
    if (fileListMatch) {
      try {
        filesToModify = JSON.parse(fileListMatch[0]);
      } catch (e) {
        // If not valid JSON, try to extract file paths with regex
        const filePathRegex = /["'](\/.*?)["']/g;
        const matches = [...responseText.matchAll(filePathRegex)];
        filesToModify = matches.map(match => match[1]);
      }
    }
    
    // If we couldn't extract a file list but have a description, default to the active file
    if (filesToModify.length === 0 && description) {
      filesToModify = [activeFile];
    }
    
    // Validate the file paths - only include files that actually exist
    filesToModify = filesToModify.filter(filePath => files[filePath] !== undefined);
    
    // Extract explanations for each file if available
    const fileExplanations: Record<string, string> = {};
    filesToModify.forEach(filePath => {
      // Look for explanations after the JSON array
      const filePathEscaped = filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const explanationRegex = new RegExp(`${filePathEscaped}[^\\n]*:?\\s*([^\\n]+)`, 'i');
      const match = responseText.match(explanationRegex);
      
      if (match && match[1]) {
        fileExplanations[filePath] = match[1].trim();
      } else {
        fileExplanations[filePath] = "Will be modified based on the command.";
      }
    });
    
    return {
      plan: {
        description,
        filesToModify,
        fileExplanations
      },
      message: "Plan generated successfully with detailed file analysis."
    };
  } catch (error: any) {
    console.error('OpenAI API Error during planning:', error);
    
    // Handle different types of errors
    if (error.status === 429) {
      return {
        plan: null,
        message: "Rate limit exceeded. Please try again later."
      };
    } else if (error.status === 401) {
      return {
        plan: null,
        message: "API authentication error. Please check your API key."
      };
    } else {
      return {
        plan: null,
        message: `Error generating plan: ${error.message || 'Unknown error'}`
      };
    }
  }
}

/**
 * Process a user command to modify code
 * @param {string} command - Natural language command from user
 * @param {string} code - Current code to be modified
 * @param {string} filePath - Path of the file being modified
 * @param {Record<string, string>} [allFiles] - All files in the project for context
 * @returns {Promise<CommandResult>} Modified code and message
 */
export async function processCommand(
  command: string, 
  code: string, 
  filePath: string,
  allFiles?: Record<string, string>
): Promise<CommandResult> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        newCode: null,
        message: "OpenAI API key is not configured. Please add your API key to the .env.local file."
      };
    }
    
    console.log(`Processing command with OpenAI (${MODEL}): "${command}" for ${filePath}`);
    
    // Determine file type from path for better context
    const fileExtension = filePath.split('.').pop();
    let language = 'JavaScript'; // Default language
    
    // Map file extensions to languages
    if (fileExtension === 'js') language = 'JavaScript';
    else if (fileExtension === 'ts' || fileExtension === 'tsx') language = 'TypeScript';
    else if (fileExtension === 'jsx') language = 'React JSX';
    else if (fileExtension === 'html') language = 'HTML';
    else if (fileExtension === 'css') language = 'CSS';
    else if (fileExtension === 'py') language = 'Python';
    
    // Construct the context for other files
    let filesContext = '';
    
    // Selectively include relevant files for context
    if (allFiles && Object.keys(allFiles).length > 0) {
      // Determine which files might be relevant to the current task
      // Look for imports/requires in the current file to find dependencies
      const importMatches = [...code.matchAll(/(?:import|require).*?['"](.+?)['"]/g)];
      const possibleDependencies = importMatches.map(match => match[1]);
      
      // Include up to 3 other files that might be most relevant
      // Priority: 1) Files with similar names, 2) Files imported by current file
      const MAX_CONTEXT_FILES = 3;
      const MAX_CONTEXT_SIZE = 3000; // Characters per context file
      
      // Create a list of files, prioritizing by potential relevance
      const currentFileBaseName = filePath.split('/').pop()?.split('.')[0] || '';
      const relevantFiles = Object.entries(allFiles)
        // Exclude the current file and node_modules
        .filter(([path]) => path !== filePath && !path.includes('node_modules'))
        // Sort by relevance
        .sort(([pathA, contentA], [pathB, contentB]) => {
          const baseNameA = pathA.split('/').pop()?.split('.')[0] || '';
          const baseNameB = pathB.split('/').pop()?.split('.')[0] || '';
          
          // Calculate relevance scores (higher is more relevant)
          let scoreA = 0;
          let scoreB = 0;
          
          // Similar filename is highly relevant
          if (baseNameA.includes(currentFileBaseName) || currentFileBaseName.includes(baseNameA)) {
            scoreA += 10;
          }
          if (baseNameB.includes(currentFileBaseName) || currentFileBaseName.includes(baseNameB)) {
            scoreB += 10;
          }
          
          // Direct imports are also relevant
          const importPathA = possibleDependencies.find(dep => pathA.includes(dep));
          const importPathB = possibleDependencies.find(dep => pathB.includes(dep));
          
          if (importPathA) scoreA += 5;
          if (importPathB) scoreB += 5;
          
          return scoreB - scoreA; // Sort by highest score first
        })
        .slice(0, MAX_CONTEXT_FILES);
      
      // Build the context with the selected files
      if (relevantFiles.length > 0) {
        filesContext = '\n\nRELEVANT PROJECT FILES FOR CONTEXT:\n';
        
        relevantFiles.forEach(([path, content]) => {
          // Truncate content if too large
          const truncatedContent = content.length > MAX_CONTEXT_SIZE 
            ? content.substring(0, MAX_CONTEXT_SIZE) + '... [truncated]'
            : content;
            
          filesContext += `\nFILE: ${path}\n\`\`\`\n${truncatedContent}\n\`\`\`\n`;
        });
      }
      
      // Also add simple file structure overview
      const fileStructure = Object.keys(allFiles)
        .filter(path => !path.includes('node_modules'))
        .map(path => `- ${path}`)
        .join('\n');
        
      filesContext += `\n\nPROJECT FILE STRUCTURE:\n${fileStructure}`;
    }

    // Construct the prompt for GPT
    const systemPrompt = `You are an expert ${language} developer. 
You will be given a piece of code and a command describing how to modify it.
Analyze the code, understand what changes are needed, and return only the modified code.

${allFiles ? 'You have access to other files in the project for context to understand the codebase better.' : ''}
${allFiles ? 'Use this context to ensure your modifications are consistent with the project structure and patterns.' : ''}

Do not include any explanations, comments about what you did, or markdown formatting in your response.
Just return the complete, modified code file that addresses the user's request.
If you cannot make the requested change, return the original code unchanged.`;

    // Make API call to OpenAI
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `CURRENT FILE (${filePath}):\n\`\`\`${language}\n${code}\n\`\`\`\n\nCOMMAND: ${command}${filesContext}` }
      ],
      temperature: 0.2, // Lower temperature for more deterministic results
      max_tokens: 2048, // Limit response size
    });
    
    // Extract the response text
    const newCode = response.choices[0]?.message?.content?.trim();
    
    // Check if we got a valid response
    if (!newCode) {
      return {
        newCode: null,
        message: "The AI could not generate a valid response. Please try again with a different command."
      };
    }
    
    // Compare to see if code was changed
    if (newCode === code) {
      return {
        newCode: null,
        message: "The AI understood your request but determined no changes were needed."
      };
    }
    
    return {
      newCode,
      message: `Successfully modified code based on: "${command}"`
    };
  } catch (error: any) {
    console.error('OpenAI API Error:', error);
    
    // Handle different types of errors
    if (error.status === 429) {
      return {
        newCode: null,
        message: "Rate limit exceeded. Please try again later."
      };
    } else if (error.status === 401) {
      return {
        newCode: null,
        message: "API authentication error. Please check your API key."
      };
    } else {
      return {
        newCode: null,
        message: `Error processing command: ${error.message || 'Unknown error'}`
      };
    }
  }
} 