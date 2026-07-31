// ==UserScript==
// @name         Buzzheavier JDownloader 2 Batch Scraper & Link Copier
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Automates link copying & scraping for JDownloader 2 from Buzzheavier pages and mirror links.
// @author       Brennerofhell
// @match        https://buzzheavier.com/*
// @grant        GM_setClipboard
// @grant        GM_notification
// @run-at       document-idle
// @icon         https://buzzheavier.com/favicon.ico
// ==/UserScript==

(function() {
    'use strict';

    function initJDownloaderPanel() {
        if (document.getElementById('jd2-panel')) return;

        const container = document.createElement('div');
        container.id = 'jd2-panel';
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 99999;
            background: rgba(15, 20, 35, 0.9);
            border: 1px solid rgba(139, 92, 246, 0.5);
            border-radius: 16px;
            padding: 16px 20px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(139, 92, 246, 0.25);
            backdrop-filter: blur(14px);
            font-family: system-ui, -apple-system, sans-serif;
            color: white;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 320px;
        `;

        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 14px; color: #c4b5fd;">
                <span>🚀 JDownloader 2 Link Helper</span>
                <span id="jd2-close" style="cursor: pointer; opacity: 0.7; font-size: 16px;">✕</span>
            </div>
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">Extrahiere alle Direkt- & Spiegel-Links für JDownloader 2.</p>
            <button id="jd2-copy-current" style="
                padding: 10px 14px;
                background: linear-gradient(135deg, #8b5cf6, #06b6d4);
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                cursor: pointer;
                font-size: 13px;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                transition: all 0.2s;
            ">📋 JDownloader 2 Links Kopieren</button>
            <button id="jd2-scrape-all" style="
                padding: 8px 12px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: #e5e7eb;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            ">🔍 Alle Links auf Seite Scrapen</button>
            <div id="jd2-status" style="font-size: 11px; color: #10b981; display: none; text-align: center;"></div>
        `;

        document.body.appendChild(container);

        document.getElementById('jd2-close').addEventListener('click', () => {
            container.style.display = 'none';
        });

        document.getElementById('jd2-copy-current').addEventListener('click', copyCurrentPageLinks);
        document.getElementById('jd2-scrape-all').addEventListener('click', scrapeAllPageLinks);
    }

    function extractFileId() {
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        return pathParts[pathParts.length - 1];
    }

    function copyCurrentPageLinks() {
        const fileId = extractFileId();
        if (!fileId) return showStatus("Keine Datei-ID gefunden", true);

        // Find "Copy download link" or mirror links on page if present
        const pageLinks = [
            `https://buzzheavier.com/${fileId}`,
            `https://dd.buzzheavier.com/f/${fileId}`,
            `https://buzzheavier.com/f/${fileId}`
        ];

        // Add any mirror links found in DOM
        document.querySelectorAll('a[href*="buzzheavier"], a[hx-get*="download"]').forEach(el => {
            let href = el.getAttribute('href') || el.getAttribute('hx-get');
            if (href && !href.startsWith('http')) {
                href = window.location.origin + href;
            }
            if (href && !pageLinks.includes(href)) pageLinks.push(href);
        });

        const textToCopy = pageLinks.join('\n');
        copyToClipboard(textToCopy);
        showStatus(`✅ ${pageLinks.length} Links für JDownloader 2 kopiert!`);
    }

    function scrapeAllPageLinks() {
        const foundUrls = new Set();
        document.querySelectorAll('a').forEach(a => {
            const href = a.href;
            if (href && (href.includes('buzzheavier.com') || href.includes('/f/'))) {
                foundUrls.add(href);
            }
        });

        if (foundUrls.size === 0) {
            return showStatus("Keine Links auf der Seite gefunden.", true);
        }

        const formattedText = Array.from(foundUrls).join('\n');
        copyToClipboard(formattedText);
        showStatus(`✅ ${foundUrls.size} Links extrahiert & kopiert!`);
    }

    function copyToClipboard(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            GM_setClipboard(text);
        } else {
            navigator.clipboard.writeText(text);
        }
    }

    function showStatus(msg, isError = false) {
        const statusEl = document.getElementById('jd2-status');
        statusEl.textContent = msg;
        statusEl.style.color = isError ? '#ef4444' : '#10b981';
        statusEl.style.display = 'block';
        setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    }

    // Run panel on load
    window.addEventListener('load', initJDownloaderPanel);
    const observer = new MutationObserver(initJDownloaderPanel);
    observer.observe(document.body, { childList: true, subtree: true });
})();
