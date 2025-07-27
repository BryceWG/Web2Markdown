// Content script to capture webpage content
(function() {
  'use strict';

  // Function to extract readable content from the page
  function extractPageContent() {
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'noscript', 'iframe', 'object', 'embed',
      'nav', 'header', 'footer', 'aside', '.advertisement', '.ad',
      '.sidebar', '.menu', '.navigation', '.social-share', '.comments'
    ];
    
    const clone = document.cloneNode(true);
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });

    // Extract main content
    let mainContent = '';
    
    // Try to find main content area
    const mainSelectors = [
      'main', 'article', '[role="main"]', '.main-content', 
      '.content', '.post-content', '.article-content', '#content'
    ];
    
    let contentElement = null;
    for (const selector of mainSelectors) {
      contentElement = clone.querySelector(selector);
      if (contentElement) break;
    }
    
    // If no main content found, use body
    if (!contentElement) {
      contentElement = clone.querySelector('body');
    }
    
    if (contentElement) {
      mainContent = contentElement.innerText || contentElement.textContent;
    }
    
    // Clean up the content
    mainContent = mainContent
      .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
      .replace(/\n\s*\n/g, '\n\n')  // Clean up multiple newlines
      .trim();
    
    return {
      title: document.title,
      url: window.location.href,
      content: mainContent,
      timestamp: new Date().toISOString()
    };
  }

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      try {
        const content = extractPageContent();
        sendResponse({
          success: true,
          data: content
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error.message
        });
      }
    }
    return true; // Keep the message channel open for async response
  });

  // Auto-extract content if enabled in settings
  chrome.storage.sync.get(['autoExtract']).then(result => {
    if (result.autoExtract) {
      // Wait a bit for the page to fully load
      setTimeout(() => {
        const content = extractPageContent();
        chrome.runtime.sendMessage({
          action: 'autoConvert',
          data: content
        });
      }, 2000);
    }
  });
})();