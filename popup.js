// Popup JavaScript
(function() {
  'use strict';

  let currentTab = null;
  let lastResult = '';

  // Initialize popup
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // Get current tab info
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tabs[0];
      
      // Update page info
      document.getElementById('pageTitle').textContent = currentTab.title || 'Unknown';
      document.getElementById('pageUrl').textContent = currentTab.url || '';
      
      // Setup event listeners
      setupEventListeners();
      
      // Check if we have API key configured
      checkConfiguration();
      
    } catch (error) {
      showStatus('Error initializing popup: ' + error.message, 'error');
    }
  });

  function setupEventListeners() {
    document.getElementById('convertBtn').addEventListener('click', convertPage);
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('copyBtn').addEventListener('click', copyResult);
    document.getElementById('clearBtn').addEventListener('click', clearResult);
  }

  async function checkConfiguration() {
    try {
      const settings = await chrome.storage.sync.get(['llmApiKey']);
      if (!settings.llmApiKey) {
        showStatus('API key not configured. Click Settings to configure.', 'error');
        document.getElementById('convertBtn').disabled = true;
      }
    } catch (error) {
      console.error('Error checking configuration:', error);
    }
  }

  async function convertPage() {
    if (!currentTab) {
      showStatus('No active tab found', 'error');
      return;
    }

    try {
      // Show processing status
      showStatus('Extracting content...', 'processing');
      document.getElementById('convertBtn').disabled = true;
      document.getElementById('convertBtn').innerHTML = '<span class="loading"></span>Converting...';

      // Extract content from the page
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        action: 'extractContent'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to extract content');
      }

      // Update status
      showStatus('Converting to markdown...', 'processing');

      // Send to background script for LLM processing
      const result = await chrome.runtime.sendMessage({
        action: 'convertToMarkdown',
        data: response.data
      });

      if (result.success) {
        lastResult = result.markdown;
        showResult(result.markdown);
        showStatus('Conversion completed!', 'success');
      } else {
        throw new Error(result.error || 'Conversion failed');
      }

    } catch (error) {
      console.error('Conversion error:', error);
      showStatus('Error: ' + error.message, 'error');
    } finally {
      // Reset button
      document.getElementById('convertBtn').disabled = false;
      document.getElementById('convertBtn').innerHTML = 'Convert to Markdown';
    }
  }

  function showResult(markdown) {
    const resultArea = document.getElementById('resultArea');
    const markdownResult = document.getElementById('markdownResult');
    
    markdownResult.textContent = markdown;
    resultArea.style.display = 'block';
  }

  async function copyResult() {
    if (!lastResult) {
      showStatus('No result to copy', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(lastResult);
      showStatus('Copied to clipboard!', 'success');
    } catch (error) {
      // Fallback method
      const textarea = document.createElement('textarea');
      textarea.value = lastResult;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showStatus('Copied to clipboard!', 'success');
    }
  }

  function clearResult() {
    document.getElementById('resultArea').style.display = 'none';
    document.getElementById('markdownResult').textContent = '';
    lastResult = '';
    hideStatus();
  }

  function openSettings() {
    chrome.runtime.openOptionsPage();
    window.close();
  }

  function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    if (type === 'success') {
      setTimeout(() => {
        hideStatus();
      }, 3000);
    }
  }

  function hideStatus() {
    const statusEl = document.getElementById('statusMessage');
    statusEl.style.display = 'none';
  }
})();