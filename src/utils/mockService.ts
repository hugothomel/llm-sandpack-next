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
 * Mock LLM plan generation for when OpenAI API key is not available
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
  console.log(`[MOCK] Generating plan for command: ${command}`);
  
  // Simple plan generation based on keywords in the command
  const filesToModify: string[] = [activeFile];
  const fileExplanations: Record<string, string> = {};
  fileExplanations[activeFile] = "This is the active file that will be modified.";
  
  // If the command mentions specific files or file types, include them
  Object.keys(files).forEach(filePath => {
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
  
  // Determine a description based on the command
  let description = `[MOCK] I'll modify ${filesToModify.length} file(s) based on your command.`;
  
  if (command.toLowerCase().includes('fix')) {
    description = `[MOCK] I'll fix issues in the code as requested.`;
  } else if (command.toLowerCase().includes('add')) {
    description = `[MOCK] I'll add new functionality as requested.`;
  } else if (command.toLowerCase().includes('refactor')) {
    description = `[MOCK] I'll refactor the code to improve its structure and readability.`;
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
 * @returns {Promise<CommandResult>} Modified code and message
 */
export async function processCommand(
  command: string, 
  code: string, 
  filePath: string,
  allFiles?: Record<string, string>
): Promise<CommandResult> {
  console.log(`[MOCK] Processing command: ${command} for ${filePath}`);
  console.log(`[MOCK] Context includes ${allFiles ? Object.keys(allFiles).length : 0} files`);
  
  // Simple processing based on keywords in the command
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