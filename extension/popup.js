document.getElementById('extract-btn').addEventListener('click', () => {
    const input = document.getElementById('link-input').value.trim();
    if (!input) return;

    let cleanId = input;
    if (cleanId.includes('/')) {
        cleanId = cleanId.split('/').pop();
    }

    const directUrl = "https://dd.buzzheavier.com/f/" + cleanId;
    navigator.clipboard.writeText(directUrl);

    const res = document.getElementById('result');
    res.innerHTML = `✅ Link kopiert!<br><code>${directUrl}</code>`;
});
