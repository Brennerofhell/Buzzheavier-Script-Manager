(function() {
    function injectDirectLink() {
        const downloadBtn = document.querySelector('a[hx-get*="/download"]');
        if (!downloadBtn || document.getElementById('bh-ext-container')) return;

        const fileId = window.location.pathname.replace(/^\/f\//, '').replace(/^\//, '');
        if (!fileId) return;

        const directUrl = "https://dd.buzzheavier.com/f/" + fileId;

        const container = document.createElement('div');
        container.id = 'bh-ext-container';
        container.style.cssText = `
            margin-top: 15px;
            padding: 14px;
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid rgba(139, 92, 246, 0.5);
            border-radius: 10px;
            text-align: center;
        `;
        container.innerHTML = `
            <div style="font-weight: bold; color: #c4b5fd; margin-bottom: 6px;">⚡ Direct Download Link (Extension)</div>
            <a href="${directUrl}" style="color: #06b6d4; word-break: break-all; font-family: monospace;">${directUrl}</a>
        `;

        downloadBtn.parentNode.insertBefore(container, downloadBtn.nextSibling);
    }

    window.addEventListener('load', injectDirectLink);
    setInterval(injectDirectLink, 1000);
})();
