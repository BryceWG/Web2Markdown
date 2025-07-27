// Content script to capture webpage content
(function() {
  'use strict';

  // Function to extract content with minimal HTML for essential elements
  function extractOptimizedContent(element, includeImages = true) {
    let content = '';
    let listLevel = 0;
    let inCodeBlock = false;
    
    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.textContent;
        // Preserve code formatting
        if (!inCodeBlock) {
          text = text.replace(/\s+/g, ' ');
        }
        content += text;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        // Handle images
        if (tagName === 'img' && includeImages) {
          let src = node.getAttribute('src');
          const alt = node.getAttribute('alt') || '';
          const dataSrc = node.getAttribute('data-src'); // Lazy loading
          
          // Handle relative URLs
          if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            src = new URL(src, window.location.href).href;
          } else if (!src && dataSrc) {
            src = dataSrc.startsWith('http') ? dataSrc : new URL(dataSrc, window.location.href).href;
          }
          
          if (src) {
            content += `![${alt}](${src})`;
          }
          return;
        }
        
        // Handle links
        if (tagName === 'a') {
          const href = node.getAttribute('href');
          const text = node.textContent.trim();
          if (href && text) {
            let fullHref = href;
            if (!href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
              fullHref = new URL(href, window.location.href).href;
            }
            content += `[${text}](${fullHref})`;
          } else {
            for (const child of node.childNodes) {
              processNode(child);
            }
          }
          return;
        }
        
        // Handle headings
        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          const level = '#'.repeat(parseInt(tagName.charAt(1)));
          content += `\n\n${level} `;
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '\n\n';
          return;
        }
        
        // Handle paragraphs and divs
        if (['p', 'div'].includes(tagName)) {
          content += '\n\n';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '\n';
          return;
        }
        
        // Handle lists
        if (['ul', 'ol'].includes(tagName)) {
          content += '\n';
          listLevel++;
          for (const child of node.childNodes) {
            processNode(child);
          }
          listLevel--;
          content += '\n';
          return;
        }
        
        if (tagName === 'li') {
          const indent = '  '.repeat(Math.max(0, listLevel - 1));
          const parent = node.parentElement;
          const bullet = parent && parent.tagName.toLowerCase() === 'ol' ? '1. ' : '- ';
          content += `\n${indent}${bullet}`;
          for (const child of node.childNodes) {
            processNode(child);
          }
          return;
        }
        
        // Handle code blocks and inline code
        if (tagName === 'pre') {
          content += '\n\n```\n';
          inCodeBlock = true;
          for (const child of node.childNodes) {
            processNode(child);
          }
          inCodeBlock = false;
          content += '\n```\n\n';
          return;
        }
        
        if (tagName === 'code' && node.parentElement.tagName.toLowerCase() !== 'pre') {
          content += '`';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '`';
          return;
        }
        
        // Handle blockquotes
        if (tagName === 'blockquote') {
          content += '\n\n> ';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '\n\n';
          return;
        }
        
        // Handle tables
        if (tagName === 'table') {
          content += '\n\n';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '\n\n';
          return;
        }
        
        if (tagName === 'tr') {
          content += '|';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '\n';
          return;
        }
        
        if (['td', 'th'].includes(tagName)) {
          content += ' ';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += ' |';
          return;
        }
        
        // Handle line breaks
        if (tagName === 'br') {
          content += '\n';
          return;
        }
        
        // Handle formatting
        if (['strong', 'b'].includes(tagName)) {
          content += '**';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '**';
          return;
        }
        
        if (['em', 'i'].includes(tagName)) {
          content += '*';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '*';
          return;
        }
        
        if (tagName === 'u') {
          content += '<u>';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '</u>';
          return;
        }
        
        if (tagName === 'del' || tagName === 's') {
          content += '~~';
          for (const child of node.childNodes) {
            processNode(child);
          }
          content += '~~';
          return;
        }
        
        // Handle horizontal rules
        if (tagName === 'hr') {
          content += '\n\n---\n\n';
          return;
        }
        
        // For other elements, just process children
        for (const child of node.childNodes) {
          processNode(child);
        }
      }
    }
    
    processNode(element);
    
    // Clean up the content
    return content
      .replace(/\n\s*\n\s*\n+/g, '\n\n')  // Remove excessive newlines
      .replace(/[ \t]+/g, ' ')  // Normalize whitespace
      .replace(/\n +/g, '\n')  // Remove leading spaces on new lines
      .replace(/ +\n/g, '\n')  // Remove trailing spaces
      .trim();
  }

  // Function to extract readable content from the page
  async function extractPageContent() {
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
      try {
        // Get image extraction setting
        const result = await browser.storage.sync.get(['includeImages']);
        const includeImages = result.includeImages !== false; // Default to true
        mainContent = extractOptimizedContent(contentElement, includeImages);
      } catch (error) {
        // Fallback if storage fails
        mainContent = extractOptimizedContent(contentElement, true);
      }
    }
    
    return {
      title: document.title,
      url: window.location.href,
      content: mainContent,
      timestamp: new Date().toISOString()
    };
  }

  // Listen for messages from popup/background
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractContent') {
      extractPageContent().then(content => {
        sendResponse({
          success: true,
          data: content
        });
      }).catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    }
    return true; // Keep the message channel open for async response
  });

  // Auto-extract content if enabled in settings
  browser.storage.sync.get(['autoExtract']).then(result => {
    if (result.autoExtract) {
      // Wait a bit for the page to fully load
      setTimeout(async () => {
        try {
          const content = await extractPageContent();
          browser.runtime.sendMessage({
            action: 'autoConvert',
            data: content
          });
        } catch (error) {
          console.error('Auto-extract failed:', error);
        }
      }, 2000);
    }
  });
})();