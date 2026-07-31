// ==UserScript==
// @name         Buzzheavier Ultimate Helper & Direct Downloader
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds 1-click direct download links, auto-copy features, and quick upload widgets to Buzzheavier.com
// @author       Brennerofhell
// @match        https://buzzheavier.com/*
// @grant        GM_setClipboard
// @run-at       document-idle
// @icon         https://buzzheavier.com/favicon.ico
// ==/UserScript==

(function() {
    'use strict';

    function injectDirectLinkWidget() {
        if (document.getElementById('bh-direct-widget')) return;

        const downloadBtn = document.querySelector('a[hx-get*="/download"]');
        if (!downloadBtn) return;

        // Extract File ID from current URL
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        const fileId = pathParts[pathParts.length - 1];

        if (!fileId || fileId === 'download') return;

        const directLink = `https://dd.buzzheavier.com/f/${fileId}`;

        // Create Widget Container
        const widget = document.createElement('div');
        widget.id = 'bh-direct-widget';
        widget.style.cssText = `
            margin: 20px 0;
            padding: 18px;
            background: rgba(139, 92, 246, 0.12);
            border: 1px solid rgba(139, 92, 246, 0.4);
            border-radius: 14px;
            text-align: center;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(139, 92, 246, 0.15);
        `;

        widget.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px; font-size: 16px;">
                <span>⚡ Direkter Download-Link (Bypass)</span>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: wrap;">
                <input type="text" readonly value="${directLink}" id="bh-direct-input" style="
                    flex: 1;
                    min-width: 260px;
                    padding: 10px 14px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    background: rgba(15, 20, 35, 0.7);
                    color: #f3f4f6;
                    font-size: 13px;
                    font-family: monospace;
                    outline: none;
                " />
                <button id="bh-copy-btn" style="
                    padding: 10px 18px;
                    background: linear-gradient(135deg, #8b5cf6, #06b6d4);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 13px;
                    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                    transition: all 0.2s ease;
                ">📋 Link Kopieren</button>
                <a href="${directLink}" target="_blank" style="
                    padding: 10px 18px;
                    background: linear-gradient(135deg, #10b981, #059669);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    text-decoration: none;
                    font-size: 13px;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    transition: all 0.2s ease;
                ">🚀 Direkt Starten</a>
            </div>
        `;

        downloadBtn.parentNode.insertBefore(widget, downloadBtn.nextSibling);

        // Copy Event Listener
        document.getElementById('bh-copy-btn').addEventListener('click', () => {
            const input = document.getElementById('bh-direct-input');
            input.select();
            if (typeof GM_setClipboard !== 'undefined') {
                GM_setClipboard(directLink);
            } else {
                navigator.clipboard.writeText(directLink);
            }
            const btn = document.getElementById('bh-copy-btn');
            btn.textContent = '✅ Kopiert!';
            setTimeout(() => { btn.textContent = '📋 Link Kopieren'; }, 2000);
        });
    }

    // Initialize and observe for HTMX dynamic page changes
    initDirectWidget();
    window.addEventListener('load', initDirectWidget);

    function initDirectWidget() {
        injectDirectLinkWidget();
    }

    const observer = new MutationObserver(initDirectWidget);
    observer.observe(document.body, { childList: true, subtree: true });
})();
