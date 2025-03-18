interface CommandResult {
  newCode: string | null;
  message: string;
}

/**
 * Mock LLM service for when OpenAI API key is not available
 * @param {string} command - Natural language command from user
 * @param {string} code - Current code to be modified
 * @param {string} filePath - Path of the file being modified
 * @returns {Promise<CommandResult>} Modified code and message
 */
export async function processCommand(
  command: string, 
  code: string, 
  filePath: string
): Promise<CommandResult> {
  console.log(`[MOCK] Processing command: ${command} for ${filePath}`);
  
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