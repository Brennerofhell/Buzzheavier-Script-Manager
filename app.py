#!/usr/bin/env python3
"""
Buzzheavier Web GUI Application
-------------------------------
A modern desktop Web GUI for Buzzheavier file hosting.
Launches a local web server and opens the browser interface automatically.
"""

import os
import sys
import json
import urllib.parse
import urllib.request
import urllib.error
import http.server
import socketserver
import threading
import webbrowser

PORT = 5000
UPLOAD_BASE_URL = "https://w.buzzheavier.com"
WEB_BASE_URL = "https://buzzheavier.com"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buzzheavier GUI - Modern File Manager</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0b0d17;
            --bg-card: rgba(22, 27, 46, 0.7);
            --bg-card-hover: rgba(30, 37, 62, 0.85);
            --border-glow: rgba(139, 92, 246, 0.3);
            --primary: #8b5cf6;
            --primary-hover: #7c3aed;
            --secondary: #06b6d4;
            --accent: #ec4899;
            --text-main: #f3f4f6;
            --text-muted: #9ca3af;
            --success: #10b981;
            --error: #ef4444;
            --radius-lg: 16px;
            --radius-md: 12px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background-color: var(--bg-dark);
            background-image: 
                radial-gradient(circle at 15% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 45%),
                radial-gradient(circle at 85% 80%, rgba(6, 182, 212, 0.15) 0%, transparent 45%);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: flex-start;
            padding: 40px 20px;
        }

        .container {
            width: 100%;
            max-width: 900px;
            background: var(--bg-card);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border-glow);
            border-radius: var(--radius-lg);
            padding: 36px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(139, 92, 246, 0.1);
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .logo-group {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .logo-icon {
            width: 46px;
            height: 46px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: var(--radius-md);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 24px;
            color: white;
            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
        }

        .title-area h1 {
            font-size: 26px;
            font-weight: 700;
            background: linear-gradient(90deg, #ffffff, #c4b5fd);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .title-area p {
            font-size: 14px;
            color: var(--text-muted);
        }

        .tabs {
            display: flex;
            gap: 12px;
            background: rgba(15, 20, 35, 0.6);
            padding: 6px;
            border-radius: var(--radius-md);
            margin-bottom: 28px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .tab-btn {
            flex: 1;
            padding: 12px 20px;
            background: transparent;
            border: none;
            color: var(--text-muted);
            font-size: 15px;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .tab-btn.active {
            background: linear-gradient(135deg, var(--primary), var(--primary-hover));
            color: white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .tab-content {
            display: none;
            animation: fadeIn 0.4s ease;
        }

        .tab-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Drop Zone */
        .drop-zone {
            border: 2px dashed rgba(139, 92, 246, 0.4);
            border-radius: var(--radius-md);
            padding: 45px 20px;
            text-align: center;
            background: rgba(15, 20, 35, 0.3);
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
        }

        .drop-zone:hover, .drop-zone.dragover {
            border-color: var(--secondary);
            background: rgba(6, 182, 212, 0.08);
            box-shadow: 0 0 20px rgba(6, 182, 212, 0.2);
        }

        .drop-icon {
            font-size: 48px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .drop-text {
            font-size: 16px;
            font-weight: 500;
            margin-bottom: 6px;
        }

        .drop-subtext {
            font-size: 13px;
            color: var(--text-muted);
        }

        input[type="file"] {
            display: none;
        }

        /* Form Controls */
        .form-group {
            margin-top: 20px;
        }

        .form-label {
            display: block;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 8px;
            color: #d1d5db;
        }

        .form-input {
            width: 100%;
            padding: 14px 16px;
            background: rgba(15, 20, 35, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            color: white;
            font-size: 15px;
            transition: all 0.3s ease;
            outline: none;
        }

        .form-input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
        }

        .btn {
            width: 100%;
            padding: 16px;
            margin-top: 24px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border: none;
            border-radius: var(--radius-md);
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .btn:hover {
            opacity: 0.92;
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(139, 92, 246, 0.4);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }

        /* Progress Bar */
        .progress-container {
            margin-top: 20px;
            display: none;
        }

        .progress-bar-bg {
            height: 10px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 5px;
            overflow: hidden;
            position: relative;
        }

        .progress-bar-fill {
            height: 100%;
            width: 0%;
            background: linear-gradient(90deg, var(--primary), var(--secondary));
            border-radius: 5px;
            transition: width 0.3s ease;
        }

        .progress-info {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 6px;
        }

        /* Results Card */
        .result-card {
            margin-top: 24px;
            padding: 20px;
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            border-radius: var(--radius-md);
            display: none;
        }

        .result-card.error {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.3);
        }

        .result-title {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .result-url {
            word-break: break-all;
            background: rgba(0, 0, 0, 0.3);
            padding: 10px 14px;
            border-radius: 8px;
            font-family: monospace;
            font-size: 14px;
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .copy-btn {
            background: rgba(255, 255, 255, 0.15);
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .copy-btn:hover {
            background: var(--primary);
        }

        /* History Table */
        .history-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 16px;
        }

        .history-item {
            background: rgba(15, 20, 35, 0.5);
            padding: 14px 18px;
            border-radius: var(--radius-md);
            border: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .history-info h4 {
            font-size: 15px;
            font-weight: 500;
        }

        .history-info p {
            font-size: 12px;
            color: var(--text-muted);
        }

        .history-actions {
            display: flex;
            gap: 8px;
        }

        .action-link {
            color: var(--secondary);
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            padding: 6px 12px;
            background: rgba(6, 182, 212, 0.1);
            border-radius: 6px;
            transition: all 0.2s;
        }

        .action-link:hover {
            background: var(--secondary);
            color: white;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <div class="logo-group">
            <div class="logo-icon">B</div>
            <div class="title-area">
                <h1>Buzzheavier GUI</h1>
                <p>Fast & Minimal File Hosting Control Panel</p>
            </div>
        </div>
    </div>

    <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('upload')">📤 Datei Hochladen</button>
        <button class="tab-btn" onclick="switchTab('download')">📥 Link & Download</button>
        <button class="tab-btn" onclick="switchTab('history')">📜 Verlauf</button>
    </div>

    <!-- TAB 1: UPLOAD -->
    <div id="tab-upload" class="tab-content active">
        <div class="drop-zone" id="drop-zone" onclick="document.getElementById('file-input').click()">
            <div class="drop-icon">☁️</div>
            <div class="drop-text" id="drop-text">Klicke oder ziehe eine Datei hierher</div>
            <div class="drop-subtext">Alle Dateitypen unterstützt (Unbegrenzte Größe)</div>
            <input type="file" id="file-input" onchange="handleFileSelect(this.files)">
        </div>

        <div class="form-group">
            <label class="form-label">Account Token / Bearer Key (Optional für deinen eigenen Account):</label>
            <input type="password" id="upload-token" class="form-input" placeholder="z. B. account_token_123">
        </div>

        <div class="form-group">
            <label class="form-label">Unterordner ID (Optional):</label>
            <input type="text" id="upload-parent" class="form-input" placeholder="z. B. folder_id_456">
        </div>

        <button class="btn" id="upload-btn" onclick="startUpload()" disabled>
            🚀 Hochladen starten
        </button>

        <div class="progress-container" id="upload-progress">
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" id="progress-fill"></div>
            </div>
            <div class="progress-info">
                <span id="progress-status">Upload läuft...</span>
                <span id="progress-pct">0%</span>
            </div>
        </div>

        <div class="result-card" id="upload-result">
            <div class="result-title" id="result-title">✅ Upload Erfolgreich!</div>
            <div class="result-url">
                <span id="result-url-text">https://buzzheavier.com/...</span>
                <button class="copy-btn" onclick="copyToClipboard('result-url-text')">Kopieren</button>
            </div>
        </div>
    </div>

    <!-- TAB 2: DOWNLOAD -->
    <div id="tab-download" class="tab-content">
        <div class="form-group">
            <label class="form-label">Buzzheavier URL oder Datei-ID eingeben:</label>
            <input type="text" id="download-url" class="form-input" placeholder="z. B. https://buzzheavier.com/dr7u0u1a7edw oder dr7u0u1a7edw">
        </div>

        <button class="btn" onclick="resolveDownload()">
            🔍 Direktlink Extrahieren
        </button>

        <div class="result-card" id="download-result">
            <div class="result-title">⚡ Direkter Download-Link:</div>
            <div class="result-url">
                <span id="download-url-text">https://dd.buzzheavier.com/...</span>
                <button class="copy-btn" onclick="copyToClipboard('download-url-text')">Kopieren</button>
            </div>
        </div>
    </div>

    <!-- TAB 3: HISTORY -->
    <div id="tab-history" class="tab-content">
        <h3 style="font-size:16px; margin-bottom:12px;">Letzte Hochgeladene Dateien:</h3>
        <div class="history-list" id="history-list">
            <p style="color:var(--text-muted); font-size:14px;">Noch keine Dateien in dieser Sitzung hochgeladen.</p>
        </div>
    </div>
</div>

<script>
    let selectedFile = null;
    let uploadHistory = [];

    function switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        event.target.classList.add('active');
        document.getElementById('tab-' + tabName).classList.add('active');
    }

    const dropZone = document.getElementById('drop-zone');
    
    ['dragenter', 'dragover'].forEach(name => {
        dropZone.addEventListener(name, e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(name => {
        dropZone.addEventListener(name, e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });

    dropZone.addEventListener('drop', e => {
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFileSelect(files);
    });

    function handleFileSelect(files) {
        selectedFile = files[0];
        document.getElementById('drop-text').textContent = "Ausgewählt: " + selectedFile.name + " (" + formatBytes(selectedFile.size) + ")";
        document.getElementById('upload-btn').disabled = false;
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function startUpload() {
        if (!selectedFile) return;

        const token = document.getElementById('upload-token').value.trim();
        const parent = document.getElementById('upload-parent').value.trim();
        
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressPct = document.getElementById('progress-pct');
        const resultCard = document.getElementById('upload-result');

        progressContainer.style.display = 'block';
        resultCard.style.display = 'none';

        const xhr = new XMLHttpRequest();
        let targetUrl = '/api/upload?filename=' + encodeURIComponent(selectedFile.name);
        if (token) targetUrl += '&token=' + encodeURIComponent(token);
        if (parent) targetUrl += '&parent=' + encodeURIComponent(parent);

        xhr.open('POST', targetUrl, true);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = pct + '%';
                progressPct.textContent = pct + '%';
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const resp = JSON.parse(xhr.responseText);
                if (resp.success) {
                    resultCard.classList.remove('error');
                    document.getElementById('result-title').textContent = "✅ Upload Erfolgreich!";
                    document.getElementById('result-url-text').textContent = resp.url;
                    resultCard.style.display = 'block';

                    // Save to history
                    uploadHistory.unshift({ name: selectedFile.name, size: formatBytes(selectedFile.size), url: resp.url });
                    renderHistory();
                } else {
                    showError(resp.error || "Upload fehlgeschlagen.");
                }
            } else {
                showError("Fehler beim Upload (Status " + xhr.status + ")");
            }
        };

        xhr.onerror = function() {
            showError("Netzwerkfehler beim Upload.");
        };

        xhr.send(selectedFile);
    }

    function showError(msg) {
        const resultCard = document.getElementById('upload-result');
        resultCard.classList.add('error');
        document.getElementById('result-title').textContent = "❌ " + msg;
        document.getElementById('result-url-text').textContent = "";
        resultCard.style.display = 'block';
    }

    function resolveDownload() {
        const urlInput = document.getElementById('download-url').value.trim();
        if (!urlInput) return;

        let cleanId = urlInput;
        if (cleanId.includes('/')) {
            cleanId = cleanId.split('/').pop();
        }

        const directUrl = "https://dd.buzzheavier.com/f/" + cleanId;
        document.getElementById('download-url-text').textContent = directUrl;
        document.getElementById('download-result').style.display = 'block';
    }

    function renderHistory() {
        const container = document.getElementById('history-list');
        if (uploadHistory.length === 0) return;

        container.innerHTML = uploadHistory.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <h4>${item.name}</h4>
                    <p>${item.size}</p>
                </div>
                <div class="history-actions">
                    <a href="${item.url}" target="_blank" class="action-link">Öffnen</a>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText('${item.url}')">Kopieren</button>
                </div>
            </div>
        `).join('');
    }

    function copyToClipboard(elementId) {
        const text = document.getElementById(elementId).textContent;
        navigator.clipboard.writeText(text).then(() => {
            alert("Link in die Zwischenablage kopiert!");
        });
    }
</script>

</body>
</html>
"""


class BuzzheavierRequestHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        if parsed_path.path == "/api/upload":
            query_params = urllib.parse.parse_qs(parsed_path.query)
            filename = query_params.get("filename", ["uploaded_file"])[0]
            token = query_params.get("token", [None])[0]
            parent = query_params.get("parent", [None])[0]

            content_length = int(self.headers.get('Content-Length', 0))
            file_data = self.rfile.read(content_length)

            encoded_name = urllib.parse.quote(filename)
            if parent:
                upload_url = f"{UPLOAD_BASE_URL}/{parent}/{encoded_name}"
            else:
                upload_url = f"{UPLOAD_BASE_URL}/{encoded_name}"

            req_headers = {
                "User-Agent": "Mozilla/5.0",
                "Content-Length": str(len(file_data))
            }
            if token:
                req_headers["Authorization"] = f"Bearer {token}"

            req = urllib.request.Request(upload_url, data=file_data, headers=req_headers, method="PUT")
            try:
                with urllib.request.urlopen(req) as resp:
                    resp_body = resp.read().decode("utf-8")
                    resp_json = json.loads(resp_body)
                    file_id = resp_json.get("data", {}).get("id", "")
                    file_url = f"{WEB_BASE_URL}/{file_id}" if file_id else f"{WEB_BASE_URL}/f/{encoded_name}"

                    self._send_json({"success": True, "url": file_url, "data": resp_json.get("data")})
            except urllib.error.HTTPError as e:
                err_text = e.read().decode("utf-8")
                self._send_json({"success": False, "error": f"HTTP {e.code}: {err_text}"})
            except Exception as e:
                self._send_json({"success": False, "error": str(e)})
        else:
            self.send_response(404)
            self.end_headers()

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def log_message(self, format, *args):
        pass  # Suppress default HTTP logging to keep console clean


def main():
    server = socketserver.TCPServer(("127.0.0.1", PORT), BuzzheavierRequestHandler)
    print(f"✨ Buzzheavier Web GUI gestartet!")
    print(f"🔗 Öffne im Browser: http://localhost:{PORT}")
    
    # Open browser automatically
    threading.Thread(target=lambda: webbrowser.open(f"http://localhost:{PORT}")).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nGUI Server beendet.")
        server.server_close()


if __name__ == "__main__":
    main()
