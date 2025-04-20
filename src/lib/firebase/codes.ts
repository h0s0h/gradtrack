import { ref, get, set, remove } from 'firebase/database';
import { database } from './firebaseConfig';

// Interface for code snippet data
export interface CodeSnippet {
  content: string;
  language: string;
  relatedId: string;
  relatedType: string;
  createdBy: string;
  id?: string;
  createdAt?: number;
  updatedAt?: number;
}

/**
 * Saves a code snippet to Firebase
 * @param codeData The code snippet data to save
 * @returns The unique identifier for the saved code snippet
 */
export async function saveCodeSnippet(codeData: CodeSnippet): Promise<string> {
  try {
    // Validate required fields
    if (!codeData.content || typeof codeData.content !== 'string') {
      throw new Error("Invalid content: Content must be a non-empty string");
    }
    if (!codeData.language || typeof codeData.language !== 'string') {
      throw new Error("Invalid language: Language must be a non-empty string");
    }
    if (!codeData.relatedId || typeof codeData.relatedId !== 'string') {
      throw new Error("Invalid relatedId: RelatedId must be a non-empty string");
    }
    if (!codeData.relatedType || typeof codeData.relatedType !== 'string') {
      throw new Error("Invalid relatedType: RelatedType must be a non-empty string");
    }
    if (!codeData.createdBy || typeof codeData.createdBy !== 'string') {
      throw new Error("Invalid createdBy: CreatedBy must be a non-empty string");
    }
    
    // Generate a unique ID if not provided
    const codeId = codeData.id || `code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const path = `codes/${codeId}`;
    
    console.log(`Saving code snippet to Firebase path: ${path}`);
    
    // Prepare the data for Firebase
    const dataToSave = {
      content: codeData.content,
      language: codeData.language,
      relatedId: codeData.relatedId,
      relatedType: codeData.relatedType,
      createdBy: codeData.createdBy,
      createdAt: codeData.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    
    // Implement retry mechanism (up to 3 attempts)
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const dbRef = ref(database, path);
        await set(dbRef, dataToSave);
        console.log(`Successfully saved code snippet to Firebase path: ${path}`);
        return codeId;
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts}/${maxAttempts} failed:`, error);
        
        if (attempts >= maxAttempts) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to save code snippet after ${maxAttempts} attempts: ${errorMessage}`);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    throw new Error("Failed to save code snippet after maximum attempts");
  } catch (error) {
    console.error("Error saving code snippet:", error);
    throw error;
  }
}

/**
 * Retrieves a code snippet from Firebase by its ID
 * @param codeId The unique identifier of the code snippet
 * @returns The code snippet data or null if not found
 */
export async function getCodeSnippet(codeId: string): Promise<any> {
  try {
    if (!codeId || typeof codeId !== 'string') {
      throw new Error("Invalid codeId: CodeId must be a non-empty string");
    }
    
    const path = `codes/${codeId}`;
    console.log(`Fetching code snippet from Firebase path: ${path}`);
    
    const dbRef = ref(database, path);
    const snapshot = await get(dbRef);
    
    if (snapshot.exists()) {
      console.log(`Successfully fetched code snippet from Firebase path: ${path}`);
      return snapshot.val();
    }
    
    console.log(`No code snippet found at path: ${path}`);
    return null;
  } catch (error) {
    console.error("Error fetching code snippet:", error);
    throw error;
  }
}

/**
 * Deletes a code snippet from Firebase
 * @param codeId The unique identifier of the code snippet to delete
 * @returns A boolean indicating whether the deletion was successful
 */
export async function deleteCodeSnippet(codeId: string): Promise<boolean> {
  try {
    if (!codeId || typeof codeId !== 'string') {
      throw new Error("Invalid codeId: CodeId must be a non-empty string");
    }
    
    const path = `codes/${codeId}`;
    console.log(`Deleting code snippet from Firebase path: ${path}`);
    
    const dbRef = ref(database, path);
    await remove(dbRef);
    
    console.log(`Successfully deleted code snippet from Firebase path: ${path}`);
    return true;
  } catch (error) {
    console.error("Error deleting code snippet:", error);
    throw error;
  }
}

/**
 * Updates an existing code snippet in Firebase
 * @param codeId The unique identifier of the code snippet to update
 * @param updates The data to update
 * @returns A boolean indicating whether the update was successful
 */
export async function updateCodeSnippet(codeId: string, updates: Partial<CodeSnippet>): Promise<boolean> {
  try {
    if (!codeId || typeof codeId !== 'string') {
      throw new Error("Invalid codeId: CodeId must be a non-empty string");
    }
    
    if (!updates || typeof updates !== 'object') {
      throw new Error("Invalid updates: Updates must be a non-empty object");
    }
    
    const path = `codes/${codeId}`;
    console.log(`Updating code snippet at Firebase path: ${path}`);
    
    // Get current data
    const dbRef = ref(database, path);
    const snapshot = await get(dbRef);
    
    if (!snapshot.exists()) {
      throw new Error(`Code snippet with ID ${codeId} not found`);
    }
    
    const currentData = snapshot.val();
    
    // Merge with updates
    const updatedData = {
      ...currentData,
      ...updates,
      updatedAt: Date.now()
    };
    
    // Save updated data
    await set(dbRef, updatedData);
    
    console.log(`Successfully updated code snippet at Firebase path: ${path}`);
    return true;
  } catch (error) {
    console.error("Error updating code snippet:", error);
    throw error;
  }
} 