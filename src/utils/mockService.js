/**
 * Mock LLM plan generation for when OpenAI API key is not available
 * @param {string} command - Natural language command from user
 * @param {Record<string, string>} files - Object with file paths as keys and code content as values
 * @param {string} activeFile - Currently active file path
 * @returns {Promise<Object>} Plan with files to modify and description
 */
export async function generatePlan(command, files, activeFile) {
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
export async function processCommand(command, code, filePath, allFiles, isNewFile) {
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
  
  // Existing processing for modifying files - rest of the function unchanged
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