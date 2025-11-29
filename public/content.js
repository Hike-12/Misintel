// Misintel Content Script - Page Scanning & Highlighting
(function() {
  'use strict';
  
  let highlights = [];
  let scanOverlay = null;
  let summaryPanel = null;

  // Extract clean text from page (remove scripts, styles, ads, navigation)
  function extractPageText() {
    const clone = document.body.cloneNode(true);
    
    // Remove unwanted elements
    const selectors = ['script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer', 'aside', '[role="navigation"]', '[role="banner"]', '[role="complementary"]', '.ad', '.advertisement', '.social-share'];
    selectors.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });
    
    // Get text content
    let text = clone.textContent || '';
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  // Find all text nodes containing specific text
  function findTextNodes(searchText, maxResults = 10) {
    const results = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script, style, and hidden elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const style = window.getComputedStyle(parent);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          
          if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // Normalize search text more aggressively
    const normalizedSearchText = searchText.replace(/\s+/g, ' ').trim().toLowerCase();
    const searchWords = normalizedSearchText.split(' ').filter(w => w.length > 3); // Key words only

    let node;
    while (node = walker.nextNode()) {
      const nodeText = node.nodeValue || '';
      const normalizedNodeText = nodeText.replace(/\s+/g, ' ').trim().toLowerCase();
      
      // Try exact match first
      if (normalizedNodeText.includes(normalizedSearchText)) {
        results.push(node);
        if (results.length >= maxResults) break;
      }
      // Try partial match with key words (at least 70% of words match)
      else if (searchWords.length >= 3) {
        const matchCount = searchWords.filter(word => normalizedNodeText.includes(word)).length;
        if (matchCount >= Math.ceil(searchWords.length * 0.7)) {
          results.push(node);
          if (results.length >= maxResults) break;
        }
      }
    }

    console.log(`Found ${results.length} text nodes for: "${searchText.substring(0, 50)}..."`);
    return results;
  }

  // Highlight text with severity color
  function highlightText(textNode, searchText, severity, reason) {
    try {
      const parent = textNode.parentElement;
      if (!parent || !parent.isConnected) return;

      const text = textNode.nodeValue || '';
      const normalizedText = text.replace(/\s+/g, ' ');
      const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
      
      const index = normalizedText.toLowerCase().indexOf(normalizedSearch.toLowerCase());
      if (index === -1) return;

      // Create highlight span
      const span = document.createElement('span');
      span.className = `misintel-highlight misintel-highlight-${severity}`;
      span.setAttribute('data-misintel-reason', reason);
      span.setAttribute('data-misintel-severity', severity);

      // Split text and wrap matched portion
      const beforeText = text.substring(0, index);
      const matchText = text.substring(index, index + searchText.length);
      const afterText = text.substring(index + searchText.length);

      span.textContent = matchText;

      // Use fragment for safer DOM manipulation
      const fragment = document.createDocumentFragment();
      
      if (beforeText) {
        fragment.appendChild(document.createTextNode(beforeText));
      }
      fragment.appendChild(span);
      if (afterText) {
        fragment.appendChild(document.createTextNode(afterText));
      }

      // Replace original text node safely
      if (parent.isConnected && textNode.parentNode === parent) {
        parent.replaceChild(fragment, textNode);
        
        // Add tooltip on hover
        span.addEventListener('mouseenter', showTooltip);
        span.addEventListener('mouseleave', hideTooltip);
        
        highlights.push(span);
      }
    } catch (error) {
      console.error('Error highlighting text:', error);
    }
  }

  // Show tooltip with reason
  function showTooltip(e) {
    const target = e.target;
    const reason = target.getAttribute('data-misintel-reason');
    
    const tooltip = document.createElement('div');
    tooltip.className = 'misintel-tooltip';
    tooltip.textContent = reason;
    tooltip.style.left = e.pageX + 'px';
    tooltip.style.top = (e.pageY - 40) + 'px';
    
    document.body.appendChild(tooltip);
    target.setAttribute('data-misintel-tooltip-id', 'active');
  }

  // Hide tooltip
  function hideTooltip(e) {
    const tooltips = document.querySelectorAll('.misintel-tooltip');
    tooltips.forEach(t => t.remove());
    e.target.removeAttribute('data-misintel-tooltip-id');
  }

  // Show scanning overlay
  function showScanningOverlay() {
    if (scanOverlay) return;
    
    scanOverlay = document.createElement('div');
    scanOverlay.className = 'misintel-scanning-overlay';
    scanOverlay.innerHTML = `
      <div class="misintel-scanning-content">
        <div class="misintel-spinner"></div>
        <p>Scanning page for misinformation...</p>
      </div>
    `;
    document.body.appendChild(scanOverlay);
  }

  // Hide scanning overlay
  function hideScanningOverlay() {
    if (scanOverlay) {
      scanOverlay.remove();
      scanOverlay = null;
    }
  }

  // Show summary panel
  function showSummaryPanel(analysis) {
    if (summaryPanel) summaryPanel.remove();
    
    const { suspiciousContent, overallAssessment, isSatire } = analysis;
    
    summaryPanel = document.createElement('div');
    summaryPanel.className = 'misintel-summary-panel';
    
    const highCount = suspiciousContent.filter(c => c.severity === 'high').length;
    const mediumCount = suspiciousContent.filter(c => c.severity === 'medium').length;
    const lowCount = suspiciousContent.filter(c => c.severity === 'low').length;
    
    summaryPanel.innerHTML = `
      <div class="misintel-summary-header">
        <h3>Misintel Scan Results</h3>
        <button class="misintel-summary-close" id="misintel-close-summary">✕</button>
      </div>
      <div class="misintel-summary-body">
        ${isSatire ? '<div class="misintel-satire-badge">😄 Satire/Parody Detected</div>' : ''}
        <div class="misintel-assessment">${overallAssessment}</div>
        
        <div class="misintel-legend">
          <div class="misintel-legend-title">Color Guide:</div>
          <div class="misintel-legend-item">
            <span class="misintel-legend-color misintel-legend-high"></span>
            <span class="misintel-legend-text">High Risk - False claims</span>
          </div>
          <div class="misintel-legend-item">
            <span class="misintel-legend-color misintel-legend-medium"></span>
            <span class="misintel-legend-text">Medium Risk - Questionable</span>
          </div>
          <div class="misintel-legend-item">
            <span class="misintel-legend-color misintel-legend-low"></span>
            <span class="misintel-legend-text">Low Risk - Clickbait</span>
          </div>
          <div class="misintel-legend-tip">
            Click on stat boxes below to jump to highlights
          </div>
        </div>
        
        <div class="misintel-stats">
          <div class="misintel-stat misintel-stat-high">
            <span class="misintel-stat-label">High Risk</span>
            <span class="misintel-stat-value">${highCount}</span>
          </div>
          <div class="misintel-stat misintel-stat-medium">
            <span class="misintel-stat-label">Medium Risk</span>
            <span class="misintel-stat-value">${mediumCount}</span>
          </div>
          <div class="misintel-stat misintel-stat-low">
            <span class="misintel-stat-label">Low Risk</span>
            <span class="misintel-stat-value">${lowCount}</span>
          </div>
        </div>
        <button class="misintel-summary-btn" id="misintel-clear-highlights">Clear Highlights</button>
      </div>
    `;
    
    document.body.appendChild(summaryPanel);
    
    // Add event listeners
    document.getElementById('misintel-close-summary').addEventListener('click', () => {
      summaryPanel.remove();
      summaryPanel = null;
    });
    
    document.getElementById('misintel-clear-highlights').addEventListener('click', clearHighlights);
    
    // Add click to scroll functionality for stats
    const stats = summaryPanel.querySelectorAll('.misintel-stat');
    stats.forEach(stat => {
      stat.style.cursor = 'pointer';
      stat.addEventListener('click', () => {
        const severity = stat.classList.contains('misintel-stat-high') ? 'high' :
                        stat.classList.contains('misintel-stat-medium') ? 'medium' : 'low';
        scrollToNextHighlight(severity);
      });
    });
  }

  // Scroll to next highlight of specific severity
  let currentHighlightIndex = { high: -1, medium: -1, low: -1 };
  
  function scrollToNextHighlight(severity) {
    const severityHighlights = highlights.filter(h => 
      h.classList.contains(`misintel-highlight-${severity}`)
    );
    
    if (severityHighlights.length === 0) {
      console.log(`No ${severity} risk highlights found`);
      return;
    }
    
    // Cycle through highlights
    currentHighlightIndex[severity] = (currentHighlightIndex[severity] + 1) % severityHighlights.length;
    const targetHighlight = severityHighlights[currentHighlightIndex[severity]];
    
    // Remove previous focus
    highlights.forEach(h => h.style.outline = '');
    
    // Add focus ring
    targetHighlight.style.outline = '3px solid rgba(255, 255, 255, 0.8)';
    targetHighlight.style.outlineOffset = '2px';
    
    // Scroll to highlight
    targetHighlight.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center' 
    });
    
    // Flash animation
    targetHighlight.style.transition = 'transform 0.3s ease';
    targetHighlight.style.transform = 'scale(1.1)';
    setTimeout(() => {
      targetHighlight.style.transform = 'scale(1)';
      setTimeout(() => {
        targetHighlight.style.outline = '';
      }, 2000);
    }, 300);
    
    console.log(`Scrolled to ${severity} highlight ${currentHighlightIndex[severity] + 1}/${severityHighlights.length}`);
  }

  // Clear all highlights
  function clearHighlights() {
    highlights.forEach(span => {
      try {
        if (span.parentNode && span.isConnected) {
          const text = span.textContent;
          const textNode = document.createTextNode(text);
          span.parentNode.replaceChild(textNode, span);
        }
      } catch (error) {
        console.error('Error clearing highlight:', error);
      }
    });
    highlights = [];
    currentHighlightIndex = { high: -1, medium: -1, low: -1 };
    
    if (summaryPanel) {
      summaryPanel.remove();
      summaryPanel = null;
    }
    
    // Normalize text nodes safely
    try {
      document.body.normalize();
    } catch (error) {
      console.error('Error normalizing DOM:', error);
    }
  }

  // Main scan function
  async function analyzePage() {
    console.log('🔍 Misintel: analyzePage() called');
    
    try {
      // Clear previous highlights
      clearHighlights();
      console.log('✓ Highlights cleared');
      
      // Show loading
      showScanningOverlay();
      console.log('✓ Scanning overlay shown');
      
      // Extract page content
      const text = extractPageText();
      const title = document.title;
      const url = window.location.href;
      
      console.log('Misintel: Extracted text length:', text.length);
      console.log('Misintel: Page title:', title);
      console.log('Misintel: Page URL:', url);
      
      // Send to backend for analysis - use localhost for development
      const apiBase = 'http://localhost:3000';
      
      const response = await fetch(`${apiBase}/api/scan-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url, title }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Analysis failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error');
      }
      
      const { analysis } = data;
      
      // Track which items were successfully highlighted
      const actuallyHighlightedContent = [];
      
      // Highlight suspicious content
      console.log('Attempting to highlight', analysis.suspiciousContent.length, 'items');
      analysis.suspiciousContent.forEach((item, idx) => {
        console.log(`Item ${idx + 1} [${item.severity}]: "${item.text.substring(0, 60)}..."`);
        const initialHighlightCount = highlights.length;
        const nodes = findTextNodes(item.text, 5);
        if (nodes.length === 0) {
          console.warn(`⚠️ Could not find text nodes for: "${item.text.substring(0, 60)}..."`);
        } else {
          nodes.forEach(node => {
            highlightText(node, item.text, item.severity, item.reason);
          });
          // Only count items that were actually highlighted
          if (highlights.length > initialHighlightCount) {
            actuallyHighlightedContent.push(item);
          }
        }
      });
      
      console.log('✓ Highlighting complete. Total highlights applied:', highlights.length);
      console.log(`Successfully highlighted ${actuallyHighlightedContent.length} out of ${analysis.suspiciousContent.length} items`);
      
      // Update analysis to only show what was actually highlighted
      analysis.suspiciousContent = actuallyHighlightedContent;
      
      // Show summary with corrected counts
      showSummaryPanel(analysis);
      
      console.log('Misintel: Scan complete. Found', analysis.suspiciousContent.length, 'suspicious items');
      
    } catch (error) {
      console.error('Misintel scan error:', error);
      alert('Failed to scan page: ' + error.message);
    } finally {
      hideScanningOverlay();
    }
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Misintel: Message received:', message);
    
    if (message.action === 'scanPage') {
      console.log('Misintel: Starting page scan...');
      analyzePage();
      sendResponse({ success: true });
    } else if (message.action === 'clearHighlights') {
      console.log('Misintel: Clearing highlights...');
      clearHighlights();
      sendResponse({ success: true });
    }
    return true;
  });

  // Add visual feedback when text is selected
  document.addEventListener('mouseup', () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && selectedText.length > 10) {
      console.log('Misintel: Text selected for fact-checking');
    }
  });
  
  // Listen for keyboard shortcut (Ctrl+Shift+F or Cmd+Shift+F)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      const selectedText = window.getSelection().toString().trim();
      if (selectedText) {
        chrome.storage.local.set({
          selectedText: selectedText,
          timestamp: Date.now()
        }, () => {
          chrome.runtime.sendMessage({ action: 'openPopup' });
        });
      }
    }
    
    // Scan page shortcut (Ctrl+Shift+S or Cmd+Shift+S)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      analyzePage();
    }
  });
  
  console.log('Misintel content script loaded');
})();