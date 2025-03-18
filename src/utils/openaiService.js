import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Get model from environment or use default
const DEFAULT_MODEL = 'gpt-3.5-turbo';
const MODEL = process.env.OPENAI_MODEL || DEFAULT_MODEL;

/**
 * Process a user command to modify code
 * @param {string} command - Natural language command from user
 * @param {string} code - Current code to be modified
 * @param {string} filePath - Path of the file being modified
 * @returns {Promise<{newCode: string|null, message: string}>} Modified code and message
 */
export async function processCommand(command, code, filePath) {
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
    else if (fileExtension === 'html') language = 'HTML';
    else if (fileExtension === 'css') language = 'CSS';
    else if (fileExtension === 'py') language = 'Python';
    
    // Construct the prompt for GPT
    const systemPrompt = `You are an expert ${language} developer. 
You will be given a piece of code and a command describing how to modify it.
Analyze the code, understand what changes are needed, and return only the modified code.
Do not include any explanations, comments about what you did, or markdown formatting in your response.
Just return the complete, modified code file that addresses the user's request.
If you cannot make the requested change, return the original code unchanged.`;

    // Make API call to OpenAI
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `CODE:\n\`\`\`${language}\n${code}\n\`\`\`\n\nCOMMAND: ${command}` }
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