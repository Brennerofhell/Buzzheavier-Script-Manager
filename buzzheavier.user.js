// ==UserScript==
// @name         Buzzheavier Direct Link & Helper
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a 1-click Direct Download Link button to Buzzheavier file pages.
// @author       Brennerofhell
// @match        https://buzzheavier.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function initHelper() {
        const downloadBtn = document.querySelector('a[hx-get*="/download"]');
        if (!downloadBtn || document.getElementById('bh-direct-link-container')) return;

        const fileId = window.location.pathname.replace(/^\/f\//, '').replace(/^\//, '');
        if (!fileId) return;

        const directUrl = "https://dd.buzzheavier.com/f/" + fileId;

        const container = document.createElement('div');
        container.id = 'bh-direct-link-container';
        container.style.cssText = `
            margin-top: 20px;
            padding: 16px;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.4);
            border-radius: 12px;
            text-align: center;
            font-family: system-ui, -apple-system, sans-serif;
            backdrop-filter: blur(10px);
        `;

        container.innerHTML = `
            <div style="font-weight: 600; color: #c4b5fd; margin-bottom: 8px; font-size: 15px;">⚡ Direkter Download-Link:</div>
            <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                <input type="text" readonly value="${directUrl}" id="bh-direct-input" style="
                    width: 70%;
                    padding: 8px 12px;
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.2);
                    background: rgba(0,0,0,0.4);
                    color: #fff;
                    font-size: 13px;
                " />
                <button id="bh-copy-btn" style="
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #8b5cf6, #06b6d4);
                    border: none;
                    border-radius: 6px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 13px;
                    transition: transform 0.2s;
                ">Kopieren</button>
            </div>
        `;

        downloadBtn.parentNode.insertBefore(container, downloadBtn.nextSibling);

        document.getElementById('bh-copy-btn').addEventListener('click', () => {
            const input = document.getElementById('bh-direct-input');
            input.select();
            navigator.clipboard.writeText(directUrl);
            const btn = document.getElementById('bh-copy-btn');
            btn.textContent = 'Kopiert! ✅';
            setTimeout(() => { btn.textContent = 'Kopieren'; }, 2000);
        });
    }

    // Run on load and observe HTMX dynamic page updates
    window.addEventListener('load', initHelper);
    const observer = new MutationObserver(initHelper);
    observer.observe(document.body, { childList: true, subtree: true });
})();
