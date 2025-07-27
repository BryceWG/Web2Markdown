// Options page JavaScript
(function() {
  'use strict';

  const DEFAULT_SYSTEM_PROMPT = `You are a content extraction assistant. Convert the provided webpage content to clean, well-formatted markdown. Follow these guidelines:

1. Extract only the main content, ignoring navigation, advertisements, and sidebar content
2. Preserve the hierarchical structure using appropriate markdown headers (# ## ###)
3. Format lists, links, and emphasis properly
4. Remove any redundant or promotional content
5. Ensure the markdown is clean and readable
6. Include the original title as the main header

Return only the markdown content without any explanations or metadata.`;

  // Load saved settings
  function loadSettings() {
    browser.storage.sync.get([
      'llmModel', 'llmEndpoint', 'llmApiKey', 'systemPrompt', 
      'temperature', 'autoCopy', 'showNotifications', 'autoExtract', 'appendPageInfo'
    ]).then(result => {
      document.getElementById('llmEndpoint').value = result.llmEndpoint || 'https://api.openai.com/v1/chat/completions';
      document.getElementById('llmModel').value = result.llmModel || 'gpt-3.5-turbo';
      document.getElementById('llmApiKey').value = result.llmApiKey || '';
      document.getElementById('systemPrompt').value = result.systemPrompt || DEFAULT_SYSTEM_PROMPT;
      document.getElementById('temperature').value = result.temperature || 0.3;
      document.getElementById('autoCopy').checked = result.autoCopy !== false;
      document.getElementById('showNotifications').checked = result.showNotifications !== false;
      document.getElementById('autoExtract').checked = result.autoExtract || false;
      document.getElementById('appendPageInfo').checked = result.appendPageInfo || false;
    });
  }

  // Save settings
  function saveSettings() {
    const settings = {
      llmEndpoint: document.getElementById('llmEndpoint').value,
      llmModel: document.getElementById('llmModel').value,
      llmApiKey: document.getElementById('llmApiKey').value,
      systemPrompt: document.getElementById('systemPrompt').value,
      temperature: parseFloat(document.getElementById('temperature').value),
      autoCopy: document.getElementById('autoCopy').checked,
      showNotifications: document.getElementById('showNotifications').checked,
      autoExtract: document.getElementById('autoExtract').checked,
      appendPageInfo: document.getElementById('appendPageInfo').checked
    };

    browser.storage.sync.set(settings).then(() => {
      showStatus('Settings saved successfully!', 'success');
    }).catch(error => {
      showStatus('Error saving settings: ' + error.message, 'error');
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

  // Handle preset model buttons
  function setupPresetButtons() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const model = e.target.getAttribute('data-model');
        document.getElementById('llmModel').value = model;
        
        // Update endpoint for known providers
        const endpointMap = {
          'gpt-3.5-turbo': 'https://api.openai.com/v1/chat/completions',
          'gpt-4': 'https://api.openai.com/v1/chat/completions',
          'claude-3-sonnet': 'https://api.anthropic.com/v1/messages',
          'llama-2-70b': 'https://api.together.xyz/inference'
        };
        
        if (endpointMap[model]) {
          document.getElementById('llmEndpoint').value = endpointMap[model];
        }
      });
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupPresetButtons();
    
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