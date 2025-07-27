// Background script for handling LLM API calls and notifications
(function() {
  'use strict';

  // Initialize default settings and context menu
  browser.runtime.onInstalled.addListener(() => {
    browser.storage.sync.get([
      'llmModel', 'llmEndpoint', 'llmApiKey', 'systemPrompt', 
      'temperature', 'autoCopy', 'showNotifications', 'autoExtract', 
      'appendPageInfo', 'modelHistory'
    ]).then(result => {
      const updates = {};
      
      // Only set these basic defaults, let options.js handle UI-specific defaults
      if (result.autoCopy === undefined) updates.autoCopy = true;
      if (result.showNotifications === undefined) updates.showNotifications = true;
      if (result.autoExtract === undefined) updates.autoExtract = false;
      if (result.appendPageInfo === undefined) updates.appendPageInfo = false;
      if (result.modelHistory === undefined) updates.modelHistory = [];
      if (result.temperature === undefined) updates.temperature = 0.3;
      
      if (Object.keys(updates).length > 0) {
        browser.storage.sync.set(updates);
      }
    });

    // Create context menu
    browser.contextMenus.create({
      id: 'web2markdown-convert',
      title: 'Convert to Markdown',
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