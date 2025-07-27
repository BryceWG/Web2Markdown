// Background script for handling LLM API calls and notifications
(function() {
  'use strict';

  // Default settings
  const DEFAULT_SETTINGS = {
    llmModel: 'gpt-3.5-turbo',
    llmEndpoint: 'https://api.openai.com/v1/chat/completions',
    llmApiKey: '',
    systemPrompt: `You are a content extraction assistant. Convert the provided webpage content to clean, well-formatted markdown. Follow these guidelines:

1. Extract only the main content, ignoring navigation, advertisements, and sidebar content
2. Preserve the hierarchical structure using appropriate markdown headers (# ## ###)
3. Format lists, links, and emphasis properly
4. Remove any redundant or promotional content
5. Ensure the markdown is clean and readable
6. Include the original title as the main header

Return only the markdown content without any explanations or metadata.`,
    temperature: 0.3,
    autoCopy: true,
    showNotifications: true,
    autoExtract: false,
    appendPageInfo: false,
    modelHistory: []
  };

  // Initialize default settings and context menu
  browser.runtime.onInstalled.addListener(() => {
    // Set default settings
    browser.storage.sync.get(Object.keys(DEFAULT_SETTINGS)).then(result => {
      const updates = {};
      Object.keys(DEFAULT_SETTINGS).forEach(key => {
        if (result[key] === undefined) {
          updates[key] = DEFAULT_SETTINGS[key];
        }
      });
      if (Object.keys(updates).length > 0) {
        browser.storage.sync.set(updates);
      }
    });

    // Create context menu
    browser.contextMenus.create({
      id: 'web2markdown-convert',
      title: '🔄 Convert to Markdown',
      contexts: ['page', 'selection']
    });
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'web2markdown-convert') {
      // Extract content from the active tab
      browser.tabs.sendMessage(tab.id, {
        action: 'extractContent'
      }).then(response => {
        if (response.success) {
          convertToMarkdown(response.data);
        }
      }).catch(error => {
        console.error('Context menu conversion error:', error);
        browser.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Web2Markdown Error',
          message: 'Failed to extract content from page'
        });
      });
    }
  });

  // Handle messages from content script and popup
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'convertToMarkdown') {
      convertToMarkdown(request.data).then(sendResponse);
      return true; // Keep the message channel open for async response
    }
    
    if (request.action === 'autoConvert') {
      browser.storage.sync.get(['autoExtract']).then(result => {
        if (result.autoExtract) {
          convertToMarkdown(request.data);
        }
      });
    }
  });

  // Convert content to markdown using LLM
  async function convertToMarkdown(pageData) {
    try {
      // Get settings
      const settings = await browser.storage.sync.get([
        'llmModel', 'llmEndpoint', 'llmApiKey', 'systemPrompt', 
        'temperature', 'autoCopy', 'showNotifications', 'appendPageInfo'
      ]);

      if (!settings.llmApiKey) {
        throw new Error('API key not configured. Please set it in the extension options.');
      }

      // Processing notification removed - only show completion/error notifications

      // Prepare the prompt
      const userPrompt = `Title: ${pageData.title}\nURL: ${pageData.url}\n\nContent:\n${pageData.content}`;

      // Make API call
      const response = await fetch(settings.llmEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.llmApiKey}`
        },
        body: JSON.stringify({
          model: settings.llmModel,
          messages: [
            {
              role: 'system',
              content: settings.systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: settings.temperature,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      let markdown = data.choices[0].message.content;

      // Append page info if enabled
      if (settings.appendPageInfo) {
        const pageInfo = `\n\n---\n**Source:** [${pageData.title}](${pageData.url})`;
        markdown += pageInfo;
      }

      // Copy to clipboard if enabled
      if (settings.autoCopy) {
        await copyToClipboard(markdown);
      }

      // Show success notification
      if (settings.showNotifications) {
        browser.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Web2Markdown',
          message: settings.autoCopy ? 
            'Content converted and copied to clipboard!' : 
            'Content converted to markdown!'
        });
      }

      return {
        success: true,
        markdown: markdown
      };

    } catch (error) {
      console.error('Conversion error:', error);
      
      // Show error notification
      if (settings.showNotifications !== false) {
        browser.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Web2Markdown Error',
          message: error.message
        });
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Copy text to clipboard
  async function copyToClipboard(text) {
    try {
      // Use the newer Clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback method
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }
})();