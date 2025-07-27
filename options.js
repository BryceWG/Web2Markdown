// Options page JavaScript
(function() {
  'use strict';

  const DEFAULT_SYSTEM_PROMPT = `You are a **high-fidelity** web content extraction and formatting expert. Your task is to analyze the provided raw webpage content and **fully extract, verbatim,** the core body content of the page. You must ignore all non-essential elements and output the result in clean, well-structured Markdown.

**Core Principles (CRITICAL!):**

1.  **NEVER SUMMARIZE OR ABBREVIATE:** Your job is **Extraction**, not **Summarization**. You must preserve every sentence and paragraph from the original main content. Think of yourself as an intelligent "copy-paste" tool whose only job is to remove irrelevant elements (like ads and navigation bars) and convert the format. **You must not, under any circumstances, alter or shorten the substance of the original text.** The length of your output should be nearly identical to the length of the original source's core content.
2.  **EXTRACT, DON'T CREATE:** Do not add any headings, commentary, explanations, or introductory text that were not present in the original source. Your output must be derived entirely from the input.

**Core Task & Analysis Logic:**

1.  **Identify the Main Content:** Act like a reader who only wants to read the primary article. Accurately identify the main body of the page, such as a news article, blog post, product description, or tutorial.
2.  **Filter Irrelevant Information:** Aggressively filter out all non-essential content.

**List of Elements to Exclude:**

*   **Navigational Elements:** The main header, sidebars, and footer.
*   **Advertisements & Promotions:** Any form of ads, sponsored content, or promotional links.
*   **Social & Interactive Elements:** User comment sections, share buttons, and like counters.
*   **Meta-information & Boilerplate Text:** Breadcrumbs, author bios (unless integral to the content), lists of "related articles," and cookie consent banners.
*   **Common Site Components:** Logos and search bars.

**Output Formatting Requirements (Markdown):**

*   **Headings:** Preserve the original heading hierarchy (\`#\`, \`##\`, \`###\`...).
*   **Paragraphs:** Maintain original paragraph breaks, separated by a blank line.
*   **Lists:** Convert to Markdown's \`-\` or \`1.\` format.
*   **Text Formatting:** Preserve **bold** and *italic* text.
*   **Links:** Retain all hyperlinks, converting them to the \`[link text](URL)\` format.
*   **Images:** Convert images to the \`![alt text](image URL)\` format.
*   **Code Blocks:** It is crucial to preserve code blocks and wrap them in Markdown's \`\`\` syntax.
*   **Blockquotes:** Convert to the \`> \` format.

**Final Goal:**
Produce a **complete and pristine** "Reader Mode" version of the content that retains its original structure. Begin the output directly with the Markdown content, without any preamble.`;

  // Load saved settings
  function loadSettings() {
    browser.storage.sync.get([
      'llmModel', 'llmEndpoint', 'llmApiKey', 'systemPrompt', 
      'temperature', 'autoCopy', 'showNotifications', 'autoExtract', 'appendPageInfo', 'includeImages', 'modelHistory'
    ]).then(result => {
      document.getElementById('llmEndpoint').value = result.llmEndpoint || 'https://api.openai.com/v1/chat/completions';
      document.getElementById('llmModel').value = result.llmModel || 'gpt-4.1-nano';
      document.getElementById('llmApiKey').value = result.llmApiKey || '';
      document.getElementById('systemPrompt').value = result.systemPrompt || DEFAULT_SYSTEM_PROMPT;
      document.getElementById('temperature').value = result.temperature || 0.3;
      document.getElementById('autoCopy').checked = result.autoCopy !== false;
      document.getElementById('showNotifications').checked = result.showNotifications !== false;
      document.getElementById('autoExtract').checked = result.autoExtract || false;
      document.getElementById('appendPageInfo').checked = result.appendPageInfo || false;
      document.getElementById('includeImages').checked = result.includeImages !== false;
      
      // Load model history
      loadModelHistory(result.modelHistory || []);
    });
  }

  // Save settings
  function saveSettings() {
    const currentModel = document.getElementById('llmModel').value.trim();
    const currentEndpoint = document.getElementById('llmEndpoint').value.trim();
    
    // Get current model history
    browser.storage.sync.get(['modelHistory']).then(result => {
      let modelHistory = result.modelHistory || [];
      
      // Add current model to history if it's not empty and not already in history
      if (currentModel && !modelHistory.some(item => item.model === currentModel)) {
        const modelEntry = {
          model: currentModel,
          endpoint: currentEndpoint,
          timestamp: Date.now()
        };
        
        // Add to beginning of array and limit to 10 items
        modelHistory.unshift(modelEntry);
        modelHistory = modelHistory.slice(0, 10);
      }
      
      const settings = {
        llmEndpoint: currentEndpoint,
        llmModel: currentModel,
        llmApiKey: document.getElementById('llmApiKey').value,
        systemPrompt: document.getElementById('systemPrompt').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        autoCopy: document.getElementById('autoCopy').checked,
        showNotifications: document.getElementById('showNotifications').checked,
        autoExtract: document.getElementById('autoExtract').checked,
        appendPageInfo: document.getElementById('appendPageInfo').checked,
        includeImages: document.getElementById('includeImages').checked,
        modelHistory: modelHistory
      };
      
      browser.storage.sync.set(settings).then(() => {
        showStatus('Settings saved successfully!', 'success');
        loadModelHistory(modelHistory); // Refresh the model history display
      }).catch(error => {
        showStatus('Error saving settings: ' + error.message, 'error');
      });
    });
  }

  // Load and display model history
  function loadModelHistory(modelHistory) {
    const historyContainer = document.getElementById('modelHistory');
    historyContainer.innerHTML = '';
    
    modelHistory.forEach(entry => {
      const modelBtn = createModelButton(entry);
      historyContainer.appendChild(modelBtn);
    });
  }

  // Create a model history button
  function createModelButton(entry) {
    const button = document.createElement('div');
    button.className = 'model-btn';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'model-btn-name';
    nameSpan.textContent = entry.model;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'model-btn-delete';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Remove from history';
    
    button.appendChild(nameSpan);
    button.appendChild(deleteBtn);
    
    // Handle model selection
    nameSpan.addEventListener('click', () => {
      document.getElementById('llmModel').value = entry.model;
      document.getElementById('llmEndpoint').value = entry.endpoint;
    });
    
    // Handle model deletion
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeModelFromHistory(entry.model);
    });
    
    return button;
  }

  // Remove model from history
  function removeModelFromHistory(modelName) {
    browser.storage.sync.get(['modelHistory']).then(result => {
      let modelHistory = result.modelHistory || [];
      modelHistory = modelHistory.filter(entry => entry.model !== modelName);
      
      browser.storage.sync.set({ modelHistory }).then(() => {
        loadModelHistory(modelHistory);
        showStatus('Model removed from history', 'success');
      });
    });
  }

  // Test API connection
  async function testConnection() {
    const endpoint = document.getElementById('llmEndpoint').value;
    const apiKey = document.getElementById('llmApiKey').value;
    const model = document.getElementById('llmModel').value;

    if (!endpoint || !apiKey) {
      showTestStatus('Please enter endpoint and API key first', 'error');
      return;
    }

    showTestStatus('Testing connection...', 'success');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: 'Test connection'
            }
          ],
          max_tokens: 10
        })
      });

      if (response.ok) {
        showTestStatus('Connection successful!', 'success');
      } else {
        const errorData = await response.json();
        showTestStatus(`Connection failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      showTestStatus(`Connection failed: ${error.message}`, 'error');
    }
  }

  // Show status message
  function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }

  // Show test status message (near test button)
  function showTestStatus(message, type) {
    const statusEl = document.getElementById('testStatus');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('testConnection').addEventListener('click', testConnection);
    
    // Save on Enter key in form fields
    document.querySelectorAll('input, textarea, select').forEach(field => {
      field.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          saveSettings();
        }
      });
    });
  });
})();