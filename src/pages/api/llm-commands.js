import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Get model from environment or use default
const DEFAULT_MODEL = 'gpt-3.5-turbo';
const MODEL = process.env.OPENAI_MODEL || DEFAULT_MODEL;

//======================================================
// OPENAI SERVICE FUNCTIONS
//======================================================

/**
 * Generate a plan for modifying code based on a command
 * @param {string} command - Natural language command from user
 * @param {Record<string, string>} files - Object with file paths as keys and code content as values
 * @param {string} activeFile - Currently active file path
 * @returns {Promise<Object>} Plan with files to modify and description
 */
async function generateOpenAIPlan(command, files, activeFile) {
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
    
    let filesContent;
    
    if (fileEntries.length <= MAX_FILES_FOR_FULL_CONTENT) {
      // Include full content of all files for small projects
      filesContent = fileEntries.map(([path, content]) => {
        return `FILE: ${path}\n\`\`\`\n${content}\n\`\`\`\n`;
      }).join('\n');
    } else {
      // For larger projects, be more selective
      // First, create file type groups
      const filesByExtension = {};
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

IMPORTANT: You can suggest creating NEW files if the task requires it. You should do this when:
1. The command asks to add a new component, module, or feature
2. Best practices suggest separating concerns into different files
3. The task would be better implemented in a new file rather than modifying existing ones

For your response, follow this format exactly:
1. A description of what needs to be done (2-3 sentences)
2. A JSON array listing the file paths that need to be modified or created (e.g., ["/index.js", "/styles.css", "/NEW_FILE.js"])
3. For each file in the array, provide a brief explanation of why it needs to be modified or if it needs to be created

When suggesting a new file, include "NEW:" at the beginning of the explanation.
File paths for new files should reflect a reasonable location in the project structure.

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
    let filesToModify = [];
    
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
    
    // Filter files to separate existing files from new files
    const existingFilePaths = Object.keys(files);
    const newFilesToCreate = filesToModify.filter(path => !existingFilePaths.includes(path));
    const existingFilesToModify = filesToModify.filter(path => existingFilePaths.includes(path));
    
    // Combine both lists, but put existing files first
    const orderedFilesToModify = [...existingFilesToModify, ...newFilesToCreate];
    
    // Extract explanations for each file if available
    const fileExplanations = {};
    orderedFilesToModify.forEach(filePath => {
      // Look for explanations after the JSON array
      const filePathEscaped = filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const explanationRegex = new RegExp(`${filePathEscaped}[^\\n]*:?\\s*([^\\n]+)`, 'i');
      const match = responseText.match(explanationRegex);
      
      // Check if this is a new file
      const isNewFile = !existingFilePaths.includes(filePath);
      
      if (match && match[1]) {
        fileExplanations[filePath] = isNewFile 
          ? `NEW: ${match[1].trim()}`
          : match[1].trim();
      } else {
        fileExplanations[filePath] = isNewFile 
          ? "NEW: This file will be created as requested."
          : "Will be modified based on the command.";
      }
    });
    
    return {
      plan: {
        description,
        filesToModify: orderedFilesToModify,
        fileExplanations
      },
      message: "Plan generated successfully with detailed file analysis."
    };
  } catch (error) {
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
 * Process a user command to modify code using OpenAI
 * @param {string} command - Natural language command from user
 * @param {string} code - Current code to be modified
 * @param {string} filePath - Path of the file being modified
 * @param {Record<string, string>} [allFiles] - All files in the project for context
 * @param {boolean} [isNewFile] - Whether this is a new file being created
 * @returns {Promise<Object>} Modified code and message
 */
async function processOpenAICommand(command, code, filePath, allFiles, isNewFile) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        newCode: null,
        message: "OpenAI API key is not configured. Please add your API key to the .env.local file."
      };
    }
    
    console.log(`Processing command with OpenAI (${MODEL}): "${command}" for ${filePath}`);
    console.log(`Is creating new file: ${isNewFile ? 'Yes' : 'No'}`);
    
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
    const systemPrompt = isNewFile 
      ? `You are an expert ${language} developer.
You are being asked to create a new file called ${filePath}.
Based on the command and the context of other project files, generate appropriate code for this new file.
The file should be fully functional and follow best practices for ${language}.

${allFiles ? 'You have access to other files in the project for context to understand the codebase better.' : ''}
${allFiles ? 'Use this context to ensure your new file is consistent with the project structure and patterns.' : ''}

Do not include any explanations, comments about what you did, or markdown formatting in your response.
Just return the complete code for the new file that addresses the user's request.`
      : `You are an expert ${language} developer. 
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
        { role: "user", content: `${isNewFile ? 'CREATE NEW FILE' : 'CURRENT FILE'} (${filePath}):\n\`\`\`${language}\n${code}\n\`\`\`\n\nCOMMAND: ${command}${filesContext}` }
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
    
    // For new files, any content is valid. For existing files, compare to see if code was changed
    if (!isNewFile && newCode === code) {
      return {
        newCode: null,
        message: "The AI understood your request but determined no changes were needed."
      };
    }
    
    return {
      newCode,
      message: isNewFile 
        ? `Successfully created new file ${filePath}` 
        : `Successfully modified code based on: "${command}"`
    };
  } catch (error) {
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

//======================================================
// MOCK SERVICE FUNCTIONS
//======================================================

/**
 * Mock LLM plan generation for when OpenAI API key is not available
 * @param {string} command - Natural language command from user
 * @param {Record<string, string>} files - Object with file paths as keys and code content as values
 * @param {string} activeFile - Currently active file path
 * @returns {Promise<Object>} Plan with files to modify and description
 */
async function generateMockPlan(command, files, activeFile) {
  console.log(`[MOCK] Generating plan for command: ${command}`);
  
  // Simple plan generation based on keywords in the command
  const filesToModify = [activeFile];
  const fileExplanations = {};
  fileExplanations[activeFile] = "This is the active file that will be modified.";
  
  // If the command mentions specific files or file types, include them
  Object.keys(files).forEach(filePath => {
    if (filePath === activeFile) return; // Skip active file, already included
    
    const ext = filePath.split('.').pop() || '';
    
    if (command.toLowerCase().includes(ext) && !filesToModify.includes(filePath)) {
      filesToModify.push(filePath);
      fileExplanations[filePath] = `This file matches the ${ext} file type mentioned in the command.`;
    }
    
    const fileName = filePath.split('/').pop() || '';
    if (command.toLowerCase().includes(fileName.toLowerCase()) && !filesToModify.includes(filePath)) {
      filesToModify.push(filePath);
      fileExplanations[filePath] = `This file's name was mentioned in the command.`;
    }
  });
  
  // Check if we need to create a new file based on command keywords
  const shouldCreateNewFile = 
    command.toLowerCase().includes('create') || 
    command.toLowerCase().includes('new file') || 
    command.toLowerCase().includes('add file');
    
  // Add new file suggestion if command seems to ask for it
  if (shouldCreateNewFile) {
    // Try to determine file type from the command
    let fileExtension = 'js'; // Default to JS
    if (command.toLowerCase().includes('css')) fileExtension = 'css';
    else if (command.toLowerCase().includes('html')) fileExtension = 'html';
    else if (command.toLowerCase().includes('typescript') || command.toLowerCase().includes('ts')) fileExtension = 'ts';
    else if (command.toLowerCase().includes('component') || command.toLowerCase().includes('react')) fileExtension = 'jsx';
    
    // Try to extract a name for the new file from the command
    let fileName = 'NewFile';
    const nameMatch = command.match(/(?:create|new|add)\s+(?:file|component)?\s+(?:called|named)?\s+['"]?([a-zA-Z0-9_-]+)['"]?/i);
    if (nameMatch && nameMatch[1]) {
      fileName = nameMatch[1];
    }
    
    // Ensure the first letter is capitalized for components
    if (fileExtension === 'jsx' || fileExtension === 'tsx') {
      fileName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
    }
    
    const newFilePath = `/${fileName}.${fileExtension}`;
    
    // Add to the files to modify list
    filesToModify.push(newFilePath);
    fileExplanations[newFilePath] = `NEW: This new file will be created as requested in the command.`;
  }
  
  // Determine a description based on the command
  let description = `[MOCK] I'll modify ${filesToModify.length} file(s) based on your command.`;
  
  if (command.toLowerCase().includes('fix')) {
    description = `[MOCK] I'll fix issues in the code as requested.`;
  } else if (command.toLowerCase().includes('add')) {
    description = `[MOCK] I'll add new functionality as requested.`;
  } else if (command.toLowerCase().includes('refactor')) {
    description = `[MOCK] I'll refactor the code to improve its structure and readability.`;
  } else if (shouldCreateNewFile) {
    description = `[MOCK] I'll create a new file and implement the requested functionality.`;
  }
  
  return {
    plan: {
      description,
      filesToModify,
      fileExplanations
    },
    message: "[MOCK] Generated a simple plan based on your command."
  };
}

/**
 * Mock LLM service for when OpenAI API key is not available
 * @param {string} command - Natural language command from user
 * @param {string} code - Current code to be modified
 * @param {string} filePath - Path of the file being modified
 * @param {Record<string, string>} [allFiles] - All files in the project for context
 * @param {boolean} [isNewFile] - Whether this is a new file being created
 * @returns {Promise<Object>} Modified code and message
 */
async function processMockCommand(command, code, filePath, allFiles, isNewFile) {
  console.log(`[MOCK] Processing command: ${command} for ${filePath}`);
  console.log(`[MOCK] Context includes ${allFiles ? Object.keys(allFiles).length : 0} files`);
  console.log(`[MOCK] Is creating new file: ${isNewFile ? 'Yes' : 'No'}`);
  
  // Handle new file creation
  if (isNewFile) {
    const fileExtension = filePath.split('.').pop() || '';
    let newFileContent = '';
    
    // Generate appropriate mock content based on file extension
    if (fileExtension === 'js' || fileExtension === 'jsx') {
      newFileContent = `// [MOCK] New JavaScript file: ${filePath}
// Created based on command: ${command}

/**
 * This is a mock implementation created by the Mock LLM Service
 */
function main() {
  console.log("New file created: ${filePath}");
  return "Hello from mock file!";
}

export default main;`;
    } else if (fileExtension === 'ts' || fileExtension === 'tsx') {
      newFileContent = `// [MOCK] New TypeScript file: ${filePath}
// Created based on command: ${command}

/**
 * This is a mock implementation created by the Mock LLM Service
 */
function main(): string {
  console.log("New file created: ${filePath}");
  return "Hello from mock file!";
}

export default main;`;
    } else if (fileExtension === 'html') {
      newFileContent = `<!DOCTYPE html>
<html>
<head>
  <title>[MOCK] New HTML File</title>
  <meta charset="UTF-8">
</head>
<body>
  <h1>New HTML File Created</h1>
  <p>This file was created based on: ${command}</p>
</body>
</html>`;
    } else if (fileExtension === 'css') {
      newFileContent = `/* [MOCK] New CSS file: ${filePath} */
/* Created based on command: ${command} */

body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f5f5f5;
}

h1 {
  color: #333;
}`;
    } else {
      // Generic content for other file types
      newFileContent = `// [MOCK] New file: ${filePath}
// Created based on command: ${command}

// This is a mock implementation created by the Mock LLM Service
// for demonstration purposes only.`;
    }
    
    return {
      newCode: newFileContent,
      message: `[MOCK] Successfully created new file: ${filePath}`
    };
  }
  
  // Existing processing for modifying files
  if (command.toLowerCase().includes('fix') && command.toLowerCase().includes('bug')) {
    // Fix missing semicolons
    const newCode = code.replace(/let x = 5\n/g, 'let x = 5;\n');
    return {
      newCode,
      message: "[MOCK] Fixed missing semicolon after variable declaration."
    };
  } 
  
  if (command.toLowerCase().includes('add') && command.toLowerCase().includes('comment')) {
    // Add comments to the code
    const lines = code.split('\n');
    const newLines = lines.map(line => {
      if (line.trim().startsWith('function') && !line.includes('//')) {
        return `// Function declaration\n${line}`;
      }
      return line;
    });
    
    return {
      newCode: newLines.join('\n'),
      message: "[MOCK] Added comments to function declarations."
    };
  }
  
  if (command.toLowerCase().includes('reverse') && command.toLowerCase().includes('string')) {
    // Add a string reverse function
    const reverseFunction = `
// Function to reverse a string
function reverseString(str) {
  return str.split('').reverse().join('');
}

// Example usage
console.log(reverseString("Hello, Sandpack!"));
`;
    
    return {
      newCode: code + '\n' + reverseFunction,
      message: "[MOCK] Added a function to reverse strings with example usage."
    };
  }
  
  // Default response if no specific command is matched
  return {
    newCode: null,
    message: "[MOCK] I couldn't understand that command. Try 'fix bug', 'add comments', or 'add reverse string function'."
  };
}

// API handler for Pages Router
export default async function handler(req, res) {
  // Handle different HTTP methods
  if (req.method === 'GET') {
    const { operation } = req.query;

    // Handle health check operation
    if (operation === 'health') {
      return res.status(200).json({ status: 'ok' });
    }
    
    // Handle status operation
    if (operation === 'status') {
      // Log for debugging
      console.log('Status API called, OpenAI API Key available:', !!process.env.OPENAI_API_KEY);
      console.log('Using model:', process.env.OPENAI_MODEL || 'gpt-3.5-turbo (default)');
      
      return res.status(200).json({ 
        status: 'ok',
        usingOpenAI: !!process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        message: process.env.OPENAI_API_KEY 
          ? `Using OpenAI API (${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'})` 
          : 'Using mock LLM service (set OPENAI_API_KEY to use OpenAI)'
      });
    }

    // Return error for unknown GET operations
    return res.status(400).json({ error: "Unknown operation specified" });
  } 
  
  if (req.method === 'POST') {
    try {
      const { operation } = req.body;
      
      if (!operation) {
        return res.status(400).json({ error: "Operation parameter is required" });
      }
      
      // Handle LLM plan operation
      if (operation === 'plan') {
        const { command, activeFile, files } = req.body;
        
        if (!command) {
          return res.status(400).json({ error: "Command is required" });
        }
        
        if (!files || Object.keys(files).length === 0) {
          return res.status(400).json({ error: "Files content is required" });
        }
        
        if (!activeFile) {
          return res.status(400).json({ error: "Active file path is required" });
        }
        
        // Log for debugging
        console.log(`Generating plan for command: "${command}" with activeFile: ${activeFile}`);
        console.log(`Received ${Object.keys(files).length} files for analysis`);
        console.log(`OpenAI API Key available: ${!!process.env.OPENAI_API_KEY}`);
        
        // Determine which service to use
        let result;
        if (process.env.OPENAI_API_KEY) {
          // Call the OpenAI service to generate a plan
          result = await generateOpenAIPlan(command, files, activeFile);
        } else {
          // Use mock service if no API key
          result = await generateMockPlan(command, files, activeFile);
        }
        
        return res.status(200).json(result);
      }
      
      // Handle LLM command operation
      if (operation === 'command') {
        const { command, currentCode, filePath, allFiles, isNewFile } = req.body;
        
        if (!command || currentCode === undefined || !filePath) {
          return res.status(400).json({ 
            message: "Missing required parameters: command, currentCode, or filePath" 
          });
        }
        
        // Log for debugging
        console.log(`Processing command: "${command}" for ${filePath}`);
        console.log(`Is creating new file: ${isNewFile ? 'yes' : 'no'}`);
        console.log(`OpenAI API Key available: ${!!process.env.OPENAI_API_KEY}`);
        
        // Process the command with the appropriate service
        const result = process.env.OPENAI_API_KEY
          ? await processOpenAICommand(command, currentCode, filePath, allFiles, isNewFile)
          : await processMockCommand(command, currentCode, filePath, allFiles, isNewFile);
        
        return res.status(200).json(result);
      }
      
      // Return error for unknown POST operations
      return res.status(400).json({ error: "Unknown operation specified" });
    } catch (error) {
      console.error('Error processing API request:', error);
      return res.status(500).json({ error: error.message || "An unexpected error occurred" });
    }
  }
  
  // Handle unsupported methods
  return res.status(405).json({ error: 'Method not allowed' });
} 