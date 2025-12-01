import { DocumentRow } from '@/types/document';
import { API_BASE_URL } from '@/config/api';

// Group rows by customer while maintaining order
export const groupByCustomer = (rows: DocumentRow[]) => {
  const grouped = new Map<string, DocumentRow[]>();
  
  rows.forEach((row) => {
    if (!grouped.has(row.customer)) {
      grouped.set(row.customer, []);
    }
    grouped.get(row.customer)!.push(row);
  });

  return Array.from(grouped.entries());
};

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry logic with exponential backoff
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  baseDelay = 2000
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // No timeout - allow unlimited processing time
      const controller = new AbortController();
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        // No timeout, keepalive for long requests
        keepalive: false, // Set to false for large payloads
      });
      
      return response;
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        console.error(`❌ Failed after ${maxRetries + 1} attempts:`, error);
        throw error;
      }
      
      // Exponential backoff
      const delayMs = baseDelay * Math.pow(2, attempt);
      console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
      await delay(delayMs);
    }
  }
  
  throw new Error('Unexpected error in fetchWithRetry');
}

// API call for categorization
export const callCategorizeAPI = async (files: File[]): Promise<any> => {
  const formData = new FormData();
  files.forEach((file) => {
    // Force simple filename (not path) by explicitly specifying filename
    formData.append('files', file, file.name);
  });

  console.log('📤 POST /categorize - Starting...');
  
  const response = await fetchWithRetry(`${API_BASE_URL}/categorize`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ /categorize error:', response.status, errorText);
    throw new Error(`Categorize API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ /categorize - Completed');
  return result;
};

export const callGroupCreditCardsAPI = async (
  files: File[],
  documentStructure: any
): Promise<any> => {
  const formData = new FormData();
  files.forEach((file) => {
    // Force simple filename (not path) by explicitly specifying filename
    formData.append('files', file, file.name);
  });
  const structureString = JSON.stringify(documentStructure);
  formData.append('document_structure', structureString);

  console.log('📤 POST /group_credit_cards - Starting...');
  console.log('  Files:', files.map(f => f.name));
  console.log('  document_structure:', structureString);

  const response = await fetchWithRetry(`${API_BASE_URL}/group_credit_cards`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ /group_credit_cards error:', response.status, errorText);
    throw new Error(`Group credit cards API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ /group_credit_cards - Completed');
  return result;
};

export const callGroupDocumentsAPI = async (
  files: File[],
  documentStructure: any
): Promise<any> => {
  const formData = new FormData();
  files.forEach((file) => {
    // Force simple filename (not path) by explicitly specifying filename
    formData.append('files', file, file.name);
  });
  const structureString = JSON.stringify(documentStructure);
  formData.append('document_structure', structureString);

  console.log('📤 POST /group_documents - Starting...');
  console.log('  Files:', files.map(f => f.name));
  console.log('  document_structure:', structureString);
  console.log('  📊 Document structure object:', JSON.parse(structureString));

  const response = await fetchWithRetry(`${API_BASE_URL}/group_documents`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌❌❌ /group_documents BACKEND ERROR ❌❌❌');
    console.error('Status:', response.status);
    console.error('Error Response:', errorText);
    console.error('Files sent:', files.map(f => f.name));
    console.error('Structure sent:', structureString);
    
    // Try to parse error as JSON for better display
    try {
      const errorJson = JSON.parse(errorText);
      console.error('Parsed Error:', errorJson);
    } catch {
      // Not JSON, already logged as text
    }
    
    throw new Error(`Group documents API failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ /group_documents - Completed');
  return result;
};

// Map type to human-readable category name for Excel
const mapTypeToCategory = (type: string): string => {
  // Convert snake_case to Title Case
  // Examples: "credit_cards" -> "Credit Cards", "cruise_ids" -> "Cruise Ids"
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const processCustomerFiles = async (
  customerRows: DocumentRow[],
  folderFiles: File[],
  onProgress: (message: string) => void
): Promise<DocumentRow[]> => {
  const updatedRows = [...customerRows];
  
  // Get customer name from first row
  const customerName = customerRows[0]?.customer || 'Unknown';
  
  // Get only the filenames for THIS customer from Excel
  const customerFileNames = new Set(customerRows.map(row => row.file));
  
  // First, try to find any file with webkitRelativePath to understand the structure
  const sampleFile = folderFiles.find(f => (f as any).webkitRelativePath);
  const pathStructure = sampleFile ? (sampleFile as any).webkitRelativePath : '';
  console.log(`📂 Sample file path:`, pathStructure);
  
  // Filter files by matching BOTH filename AND customer folder
  // Use EXACT customer name matching - NO CLEANING
  const customerFiles = folderFiles.filter((file) => {
    // Check if filename matches
    if (!customerFileNames.has(file.name)) return false;
    
    // Check if file belongs to this customer's folder
    const filePath = (file as any).webkitRelativePath || file.name;
    const pathParts = filePath.split('/');
    
    // Path format: "2nd_stage_testing/CUSTOMER_FOLDER_NAME/filename.jpg"
    // We need EXACT match between folder name and Excel customer name
    
    if (pathParts.length >= 2) {
      const folderName = pathParts[pathParts.length - 2]; // Second to last part is folder name
      
      // EXACT match only - case sensitive
      if (folderName === customerName) return true;
      
      // Case-insensitive exact match as fallback
      if (folderName.toLowerCase() === customerName.toLowerCase()) return true;
    }
    
    return false;
  });
  
  console.log(`\n======================================`);
  console.log(`👤 Excel Customer: ${customerName}`);
  console.log(`📋 Files in Excel: ${customerFileNames.size}`, Array.from(customerFileNames));
  console.log(`📁 Files found in folder: ${customerFiles.length}`);
  if (customerFiles.length > 0) {
    const firstFilePath = (customerFiles[0] as any).webkitRelativePath || customerFiles[0].name;
    const folderNameFromPath = firstFilePath.split('/')[firstFilePath.split('/').length - 2];
    console.log(`📂 Matched Folder: ${folderNameFromPath}`);
    console.log(`📄 File names:`, customerFiles.map(f => f.name));
  }
  console.log(`======================================\n`);
  
  if (customerFiles.length === 0) {
    onProgress(`⚠️ No files found in folder for ${customerName} - SKIPPING`);
    console.warn(`⚠️ Customer "${customerName}" has no matching files in the uploaded folder. Skipping...`);
    return updatedRows;
  }
  
  onProgress(`📂 Processing ${customerFiles.length} files for ${customerName}`);
  
  // Filter out PDF and XML files - don't process them
  const imagesToProcess = customerFiles.filter((file) => {
    const ext = file.name.toLowerCase().split('.').pop();
    return ext !== 'pdf' && ext !== 'xml';
  });
  
  const pdfXmlFiles = customerFiles.filter((file) => {
    const ext = file.name.toLowerCase().split('.').pop();
    return ext === 'pdf' || ext === 'xml';
  });
  
  console.log(`📁 Total files: ${customerFiles.length}`);
  console.log(`🖼️  Images to process: ${imagesToProcess.length}`, imagesToProcess.map(f => f.name));
  console.log(`📄 PDF/XML files (skipped): ${pdfXmlFiles.length}`, pdfXmlFiles.map(f => f.name));
  
  if (imagesToProcess.length === 0) {
    onProgress('⚠️ No image files to process (only PDF/XML found)');
    return updatedRows;
  }
  
  // ========================================
  // STEP 1: CATEGORIZE ALL FILES (Images only)
  // ========================================
  onProgress(`📸 Categorizing ${imagesToProcess.length} image files...`);
  
  let categorizeResult: any;
  
  try {
    // Call /categorize API - returns structured format with categories array
    categorizeResult = await callCategorizeAPI(imagesToProcess);
    
    console.log('✅ Categorization result:', JSON.stringify(categorizeResult, null, 2));
  
    // Parse the categorization response and update Actual Output
    if (categorizeResult.categories && Array.isArray(categorizeResult.categories)) {
      categorizeResult.categories.forEach((category: any) => {
        const categoryName = mapTypeToCategory(category.type);
        
        if (category.files && Array.isArray(category.files)) {
          category.files.forEach((fileObj: any) => {
            // Extract filename based on structure
            let filename = '';
            
            if (category.type === 'credit_cards') {
              // Credit cards have { front: "...", back: "..." }
              if (fileObj.front) {
                filename = fileObj.front.split('/').pop() || '';
              }
              if (fileObj.back) {
                const backFileName = fileObj.back.split('/').pop() || '';
                const backRow = updatedRows.find((r) => r.file === backFileName);
                if (backRow) {
                  backRow.actualOutput = categoryName;
                  console.log(`  → ${backFileName}: ${categoryName}`);
                }
              }
            } else {
              // Other types have { filename: "..." }
              filename = fileObj.filename ? fileObj.filename.split('/').pop() || '' : '';
            }
            
            if (filename) {
              const row = updatedRows.find((r) => r.file === filename);
              if (row) {
                row.actualOutput = categoryName;
                console.log(`  → ${filename}: ${categoryName}`);
              }
            }
          });
        }
      });
    }
    
    onProgress('Categorization complete');
  } catch (error) {
    onProgress('Categorization failed');
    console.error('❌ Categorization error:', error);
    throw error;
  }
  
  // ========================================
  // STEP 2: GROUP CREDIT CARDS (if present)
  // ========================================
  // Find credit_cards category from categorization result
  const creditCardsCategory = categorizeResult.categories?.find(
    (cat: any) => cat.type === 'credit_cards'
    );
    
  if (creditCardsCategory && creditCardsCategory.files && creditCardsCategory.files.length > 0) {
    const creditCardFileNames = new Set<string>();
    
    // Parse and rebuild the files structure - ONLY for files in this customer's Excel
    const parsedFiles: { front: string; back: string }[] = [];
    creditCardsCategory.files.forEach((fileObj: any) => {
      const frontFile = fileObj.front || '';
      const backFile = fileObj.back || '';
      
      // Extract just the filename (last part after /)
      const frontFileName = frontFile ? frontFile.split('/').pop() || '' : '';
      const backFileName = backFile ? backFile.split('/').pop() || '' : '';
      
      // Only include if this file is in the customer's Excel rows
      const hasFront = frontFileName && customerFileNames.has(frontFileName);
      const hasBack = backFileName && customerFileNames.has(backFileName);
      
      if (hasFront || hasBack) {
        // Add to file collection (using just the filename for matching)
        if (frontFileName && hasFront) creditCardFileNames.add(frontFileName);
        if (backFileName && hasBack) creditCardFileNames.add(backFileName);
        
        // Backend expects SIMPLE FILENAMES in document_structure (not paths)
        parsedFiles.push({
          front: frontFileName,
          back: backFileName
        });
      }
    });
    
    // Filter to only image files (no PDF/XML)
    const creditCardFiles = imagesToProcess.filter((f) => creditCardFileNames.has(f.name));
    
    console.log(`💳 Credit card files to upload: ${creditCardFiles.length}`, creditCardFiles.map(f => f.name));
    onProgress(`💳 Grouping ${creditCardFiles.length} credit card files...`);
    
    // Rebuild the structure from scratch
      const documentStructure = {
        categories: [
          {
            type: 'credit_cards',
          files: parsedFiles
        }
      ]
    };
    
    console.log('💳 Sending to /group_credit_cards:');
    console.log('  Files:', creditCardFiles.map(f => f.name));
    console.log('  Structure:', JSON.stringify(documentStructure, null, 2));
    
    try {
      const groupResult = await callGroupCreditCardsAPI(creditCardFiles, documentStructure);
      
      console.log('💳 Credit cards grouping result:', JSON.stringify(groupResult, null, 2));
      
      // Parse response: { "credit_cards_group": [{ "type": "credit_cards", "files": [{ "front": "...", "back": "..." }] }] }
      if (groupResult.credit_cards_group && Array.isArray(groupResult.credit_cards_group)) {
        groupResult.credit_cards_group.forEach((categoryGroup: any) => {
          if (categoryGroup.files && Array.isArray(categoryGroup.files)) {
            categoryGroup.files.forEach((filePair: any, pairIdx: number) => {
              const groupName = `Credit Card Group ${pairIdx + 1}`;
              
              // Handle { front: "...", back: "..." }
              if (filePair.front) {
                const frontFileName = filePair.front.split('/').pop() || '';
                const row = updatedRows.find((r) => r.file === frontFileName);
                if (row) {
                  row.actualGroup = groupName;
                  console.log(`    → ${frontFileName}: ${groupName}`);
                }
              }
              if (filePair.back) {
                const backFileName = filePair.back.split('/').pop() || '';
                const row = updatedRows.find((r) => r.file === backFileName);
                if (row) {
                  row.actualGroup = groupName;
                  console.log(`    → ${backFileName}: ${groupName}`);
                }
              }
            });
          }
        });
        onProgress('Credit card grouping complete');
    }
    } catch (error: any) {
      onProgress('❌ Credit card grouping failed - Check console for details');
      console.error('❌❌❌ CREDIT CARD GROUPING ERROR ❌❌❌');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Files that were sent:', creditCardFiles.map(f => f.name));
      console.error('Structure that was sent:', JSON.stringify(documentStructure, null, 2));
      console.error('⚠️ Backend returned error. Check backend logs for detailed error!');
      
      // Continue processing other steps even if this fails
      console.warn('⚠️ Continuing with document grouping...');
    }
  } else {
    console.log('💳 No credit cards found, skipping grouping');
    onProgress('💳 No credit cards - skipping grouping');
  }
  
  // ========================================
  // STEP 3: GROUP DOCUMENTS (Send OTHER_DOCUMENTS to Gemini)
  // ========================================
  // Find OTHER_DOCUMENTS category from categorization result
  // Gemini will internally classify POS receipts, CC slips, and other docs
  const otherDocsCategory = categorizeResult.categories?.find(
    (cat: any) => cat.type === 'other_documents'
  );
  
  if (otherDocsCategory && otherDocsCategory.files && otherDocsCategory.files.length > 0) {
    const otherDocFileNames = new Set<string>();
    
    // Parse and rebuild OTHER_DOCUMENTS structure - ONLY for files in this customer's Excel
    const parsedOtherDocFiles: { filename: string }[] = [];
    otherDocsCategory.files.forEach((fileObj: any) => {
      const fullPath = fileObj.filename || '';
      if (fullPath) {
        // Extract just the filename for matching
        const justFileName = fullPath.split('/').pop() || '';
        
        // Only include if this file is in the customer's Excel rows
        if (justFileName && customerFileNames.has(justFileName)) {
          otherDocFileNames.add(justFileName);
          // Backend expects SIMPLE FILENAME in document_structure (not path)
          parsedOtherDocFiles.push({ filename: justFileName });
        }
      }
    });
    
    // Filter to only image files (no PDF/XML)
    const documentFiles = imagesToProcess.filter((f) => otherDocFileNames.has(f.name));
    
    console.log(`📄 Other documents to send: ${parsedOtherDocFiles.length}`, parsedOtherDocFiles.map((f: any) => f.filename));
    
    onProgress(`🧾 Processing ${parsedOtherDocFiles.length} other documents (Gemini will classify POS/CC slips)...`);
    
    // Send ONLY other_documents to Gemini
    const documentStructure = {
      categories: [
        {
          type: 'other_documents',
          files: parsedOtherDocFiles
        }
      ]
    };
    
    console.log('🧾 Sending to /group_documents:');
    console.log('  Files:', documentFiles.map(f => f.name));
    console.log('  Structure:', JSON.stringify(documentStructure, null, 2));
    
    try {
      const groupResult = await callGroupDocumentsAPI(documentFiles, documentStructure);
      
      console.log('🧾 Documents grouping result:', JSON.stringify(groupResult, null, 2));
      
      // PART 1: Update Actual Output with Gemini's refined categorization
      // Gemini separates other_documents into: pos_receipts, credit_card_slips, other_documents
      if (groupResult.categories && Array.isArray(groupResult.categories)) {
        groupResult.categories.forEach((category: any) => {
          const categoryName = mapTypeToCategory(category.type);
          
          if (category.files && Array.isArray(category.files)) {
            category.files.forEach((fileObj: any) => {
              const fullPath = fileObj.filename;
              const filename = fullPath ? fullPath.split('/').pop() || '' : '';
              
              if (filename) {
                const row = updatedRows.find((r) => r.file === filename);
                if (row) {
                  // Update Actual Output with refined category from Gemini
                  row.actualOutput = categoryName;
                  console.log(`  ✏️ Updated category: ${filename} → ${categoryName}`);
                }
              }
            });
          }
        });
      }
      
      // PART 2: Update Actual Group with purchase groups
      // Parse response: { "documents_groups": [{ "group": [{ "type": "...", "files": [{ "filename": "..." }] }] }] }
      if (groupResult.documents_groups && Array.isArray(groupResult.documents_groups)) {
        groupResult.documents_groups.forEach((purchaseGroup: any, groupIdx: number) => {
          const groupName = `Purchase Group ${groupIdx + 1}`;
          
          if (purchaseGroup.group && Array.isArray(purchaseGroup.group)) {
            purchaseGroup.group.forEach((category: any) => {
              if (category.files && Array.isArray(category.files)) {
                category.files.forEach((fileObj: any) => {
                  const fullPath = fileObj.filename;
                  const filename = fullPath ? fullPath.split('/').pop() || '' : '';
                  
                  if (filename) {
                    const row = updatedRows.find((r) => r.file === filename);
                    if (row) {
                      row.actualGroup = groupName;
                      console.log(`    → ${filename}: ${groupName}`);
                    }
                  }
                });
              }
            });
          }
        });
        onProgress('Document grouping complete');
      }
    } catch (error: any) {
      onProgress('❌ Document grouping failed - Check console for details');
      console.error('❌❌❌ DOCUMENT GROUPING ERROR ❌❌❌');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Files that were sent:', documentFiles.map(f => f.name));
      console.error('Structure that was sent:', JSON.stringify(documentStructure, null, 2));
      console.error('⚠️ Backend returned 500 error. Check backend logs for detailed error!');
      
      // Continue processing other customers even if this fails
      console.warn('⚠️ Continuing with next customer...');
    }
  } else {
    console.log('🧾 No other_documents found, skipping document grouping');
    onProgress('🧾 No other_documents - skipping grouping');
  }
  
  onProgress(`✅ ${customerName} - Processing complete!`);
  console.log(`\n✅ Customer "${customerName}" completed!\n`);
  return updatedRows;
};
