// ==UserScript==
// @name         Buzzheavier Direct Link & Motrix Helper
// @namespace    https://github.com/buzzheavier-tampermonkey
// @version      2.0
// @description  Extrahiert direkt downloadbare URLs (inklusive Token) von Buzzheavier für Motrix/JDownloader, umgeht Landingpages und Werbung.
// @author       Buzzheavier Script Builder
// @match        *://buzzheavier.com/*
// @match        *://*.buzzheavier.com/*
// @match        http://localhost:*/*
// @match        http://127.0.0.1:*/*
// @grant        GM_setClipboard
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      buzzheavier.com
// @connect      ts.buzzheavier.com
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=buzzheavier.com
// @updateURL    https://buzzheavier.com/
// @supportURL   https://buzzheavier.com/
// ==/UserScript==

(function() {
  'use strict';

  const targetWin = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  function logToApp(msg) {
    console.log("[Buzzheavier Helper] " + msg);
    try {
      targetWin.postMessage({ type: "BUZZ_LOG", message: msg }, "*");
    } catch(e) {}
  }

  if (window.location.hostname !== 'buzzheavier.com' && !window.location.hostname.endsWith('.buzzheavier.com')) {
    // Aktiv auf localhost / Steuerungsseite
    logToApp("Aktiv auf Steuerungsseite: " + window.location.origin);
    
    // Melde Bereitschaft an die App
    setInterval(() => {
      targetWin.postMessage({ type: "BUZZ_HELPER_READY" }, "*");
    }, 1000);

    // Auf Anfragen zur Hintergrund-Auflösung lauschen
    targetWin.addEventListener("message", (event) => {
      if (event.data && event.data.type === "REQUEST_BUZZ_RESOLVE") {
        const { id, url } = event.data;
        if (id) {
          logToApp("Hintergrund-Auflösung gestartet für ID: " + id);
          const targetUrl = url || "https://buzzheavier.com/f/" + id;
          
          GM_xmlhttpRequest({
            method: "GET",
            url: targetUrl,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
            },
            onerror: function(err) {
              logToApp("Netzwerkfehler beim Laden der Landingpage (" + id + "): " + JSON.stringify(err));
            },
            ontimeout: function() {
              logToApp("Timeout beim Laden der Landingpage (" + id + ")");
            },
            onload: function(response) {
              logToApp("Landingpage geladen. Status: " + response.status + " für ID: " + id);
              if (response.status !== 200) {
                logToApp("Fehler beim Laden der Landingpage: Status " + response.status);
                return;
              }
              const html = response.responseText;
              
              // Details extrahieren
              let filename = "";
              const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || 
                              html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
                              html.match(/<title>([\s\S]*?)<\/title>/i);
              if (h1Match) {
                filename = h1Match[1].replace(/<[^>]*>/g, "").replace(/\s*-\s*Buzzheavier/i, "").trim();
              }
              let size = "Unbekannt";
              const sizeMatch = html.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))/i);
              if (sizeMatch) size = sizeMatch[1];
              
              logToApp("Datei-Details extrahiert: Name=" + filename + ", Größe=" + size);

              const hxGetMatch = html.match(/hx-get=["']([^"']+)["']/i);
              const copyMatch = html.match(/copyDownloadLink\(["']([^"']+)["']\)/i);
              const hxPath = hxGetMatch ? hxGetMatch[1] : (copyMatch ? copyMatch[1] : "");
              
              if (hxPath) {
                const fetchUrl = hxPath.startsWith("http") ? hxPath : "https://buzzheavier.com" + hxPath;
                logToApp("HTMX Download-Pfad gefunden: " + hxPath + ". Sende Sub-Request...");
                GM_xmlhttpRequest({
                  method: "GET",
                  url: fetchUrl,
                  headers: {
                    "HX-Request": "true",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                  },
                  onerror: function(err) {
                    logToApp("Netzwerkfehler im Sub-Request: " + JSON.stringify(err));
                                 onload: function(subRes) {
                    logToApp("Sub-Request Antwort erhalten. Status: " + subRes.status);
                    
                    let directUrl = subRes.finalUrl || subRes.finalURL;
                    
                    if (!directUrl) {
                      const headersStr = subRes.responseHeaders || "";
                      const headers = {};
                      headersStr.split("\r\n").forEach(line => {
                        const parts = line.split(": ");
                        if (parts[0]) {
                          headers[parts[0].toLowerCase()] = parts.slice(1).join(": ");
                        }
                      });
                      
                      directUrl = headers["hx-redirect"] || headers["hx-refresh"];
                    }
                    
                    if (!directUrl && subRes.responseText) {
                      try {
                        const parsed = JSON.parse(subRes.responseText);
                        if (parsed.redirect) directUrl = parsed.redirect;
                      } catch(e) {}
                    }
                    
                    if (directUrl) {
                      logToApp("Erfolgreich Direktlink extrahiert: " + directUrl);
                      if (directUrl.includes("v=") && !directUrl.includes("ts.buzzheavier.com")) {
                        directUrl = directUrl.replace("buzzheavier.com", "ts.buzzheavier.com");
                      }
                      targetWin.postMessage({
                        type: "BUZZ_RESOLVED",
                        id: id,
                        directUrl: directUrl,
                        filename: filename || ("buzz_file_" + id),
                        size: size
                      }, "*");
                    } else {
                      logToApp("Warnung: Keine Weiterleitung in Headern gefunden. Antwort-Body: " + subRes.responseText.substring(0, 100));
                    }
                  }
                });
              } else {
                logToApp("Kein HTMX-Pfad gefunden. Versuche direkten HTML-Regex Match...");
                const tokenUrlRegex = /https?:\/\/(?:ts\.)?buzzheavier\.com\/d\/[a-zA-Z0-9_-]+\?v=[a-zA-Z0-9_=-]+/i;
                const matchTokenUrl = html.match(tokenUrlRegex);
                if (matchTokenUrl) {
                  let directUrl = matchTokenUrl[0];
                  logToApp("Regex-Direktlink gefunden: " + directUrl);
                  if (!directUrl.includes("ts.buzzheavier.com")) {
                    directUrl = directUrl.replace("buzzheavier.com", "ts.buzzheavier.com");
                  }
                  targetWin.postMessage({
                    type: "BUZZ_RESOLVED",
                    id: id,
                    directUrl: directUrl,
                    filename: filename || ("buzz_file_" + id),
                    size: size
                  }, "*");
                } else {
                  logToApp("Fehler: Kein direkt downloadbarer Link oder Token in der Seite gefunden.");
                }
              }
            }
          });
        }
      }
    });
    return;
  }

  // Konfigurationen
  const CONFIG = {
    autoRedirect: false,
    autoClick: true,
    autoClickDelay: 1,
    copyToClipboard: true,
    embedPlayer: true,
    customDarkTheme: true,
    hideAdblockWarning: true,
    showNotification: true
  };

  // Hilfsfunktion für Notifications
  function notify(msg) {
    if (CONFIG.showNotification && typeof GM_notification !== 'undefined') {
      GM_notification({
        text: msg,
        title: "⚡ Buzzheavier Helper",
        timeout: 3000
      });
    } else {
      console.log("[Buzzheavier Helper] " + msg);
    }
  }

  // 1. SOFORTIGER REDIRECT
  if (CONFIG.autoRedirect) {
    const pathParts = window.location.pathname.split('/');
    let id = "";
    if (pathParts[1] === "f" && pathParts[2]) {
      id = pathParts[2];
    } else if (pathParts[1] && pathParts[1].length >= 8 && pathParts[1] !== "d") {
      id = pathParts[1];
    }

    if (id) {
      console.log("[Buzzheavier Helper] Automatischer Redirect zum direkten Download...");
      window.location.replace("https://buzzheavier.com/d/" + id);
      return;
    }
  }

  // 2. DOM-INITIALISIERUNG
  document.addEventListener('DOMContentLoaded', () => {
    if (CONFIG.customDarkTheme) {
      injectDarkTheme();
    }

    const pathParts = window.location.pathname.split('/');
    let id = "";
    if (pathParts[1] === "f" && pathParts[2]) {
      id = pathParts[2];
    } else if (pathParts[1] && pathParts[1].length >= 8 && pathParts[1] !== "d") {
      id = pathParts[1];
    }

    if (!id) return;

    if (CONFIG.hideAdblockWarning) {
      removeAdblockBlockers();
    }

    extractDirectLink(id);
  });

  async function extractDirectLink(id) {
    let token = "";
    let actionUrl = "https://buzzheavier.com/d/" + id;
    let foundUrl = "";

    try {
      const hxElement = document.querySelector('[hx-get*="/download"]') || 
                        document.querySelector('[hx-get*="/d/"]') ||
                        document.querySelector('[hx-get]');
      if (hxElement) {
        const hxGet = hxElement.getAttribute('hx-get');
        if (hxGet) {
          const fetchUrl = hxGet.startsWith('http') ? hxGet : window.location.origin + hxGet;
          
          const res = await fetch(fetchUrl, {
            headers: {
              "HX-Request": "true",
              "HX-Current-URL": window.location.href
            }
          });
          
          const redirectUrl = res.headers.get("HX-Redirect");
          if (redirectUrl) {
            foundUrl = redirectUrl;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    if (!foundUrl) {
      const allLinks = Array.from(document.querySelectorAll('a'));
      for (const a of allLinks) {
        const href = a.getAttribute('href') || '';
        if ((href.includes('/d/') || href.includes('buzzheavier.com')) && href.includes('v=')) {
          foundUrl = href;
          break;
        }
      }
    }

    if (!foundUrl) {
      const form = document.querySelector('form[action*="/d/"]');
      if (form) {
        const vInput = form.querySelector('input[name="v"]');
        if (vInput && vInput.value) {
          token = vInput.value;
        }
      }
    }

    let finalDirectUrl = foundUrl ? foundUrl : (token ? `${actionUrl}?v=${token}` : `https://ts.buzzheavier.com/d/${id}`);

    if (finalDirectUrl.indexOf("v=") !== -1) {
      if (finalDirectUrl.indexOf("ts.buzzheavier.com") === -1) {
        finalDirectUrl = finalDirectUrl.replace("buzzheavier.com", "ts.buzzheavier.com");
      }
    }

    if (CONFIG.copyToClipboard) {
      try {
        if (typeof GM_setClipboard !== 'undefined') {
          GM_setClipboard(finalDirectUrl);
        } else {
          navigator.clipboard.writeText(finalDirectUrl);
        }
        notify("Direktlink automatisch für Motrix kopiert!");
      } catch (e) {}
    }

    if (window.opener) {
      try {
        let fn = "";
        const h1 = document.querySelector('h1') || document.querySelector('h2');
        if (h1) fn = h1.innerText.replace(/\s*-\s*Buzzheavier/i, "").trim();
        let sz = "Unbekannt";
        const sizeMatch = document.body.innerText.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))/i);
        if (sizeMatch) sz = sizeMatch[1];

        window.opener.postMessage({
          type: "BUZZ_RESOLVED",
          id: id,
          directUrl: finalDirectUrl,
          filename: fn || "buzz_file_" + id,
          size: sz
        }, "*");

        if (window.name === "buzz_batch_resolve_" + id || window.location.search.includes("batch=1")) {
          setTimeout(() => { window.close(); }, 800);
        }
      } catch (err) {}
    }

    if (CONFIG.embedPlayer) {
      addStreamingPlayer(finalDirectUrl);
    }

    createHelperPanel(finalDirectUrl);

    if (CONFIG.autoClick) {
      setTimeout(() => {
        const btn = document.querySelector('input[type="submit"]') || document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      }, CONFIG.autoClickDelay * 1000);
    }
  }

  function createHelperPanel(directUrl) {
    const panel = document.createElement('div');
    panel.id = 'motrix-helper-panel';
    panel.style.cssText = 'position: fixed; bottom: 24px; right: 24px; background: linear-gradient(145deg, #1e293b, #0f172a); border: 1.5px solid #38bdf8; border-radius: 12px; padding: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); z-index: 999999; width: 320px; color: #f8fafc; font-family: system-ui, sans-serif;';
    panel.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 700; color: #38bdf8; font-size: 14px;">⚡ Motrix & Direct Downloader</span>
        <button id="close-helper-panel" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px;">&times;</button>
      </div>
      <input type="text" readonly value="${directUrl}" style="width:100%; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#38bdf8; padding:6px 10px; font-size:10px; font-family:monospace; margin-bottom:12px; outline:none;" />
      <div style="display:flex; gap:8px;">
        <button id="btn-copy-helper" style="flex:1; background:#0284c7; border:none; color:white; border-radius:6px; padding:8px; font-size:11px; font-weight:600; cursor:pointer;">📋 Link kopieren</button>
        <a href="${directUrl}" style="background:#1e293b; border:1px solid #475569; color:white; border-radius:6px; padding:8px; font-size:11px; text-decoration:none; text-align:center; font-weight:600; flex:1;">📥 Download</a>
      </div>`;
    document.body.appendChild(panel);

    document.getElementById('close-helper-panel').addEventListener('click', () => { panel.remove(); });
    const copyBtn = document.getElementById('btn-copy-helper');
    copyBtn.addEventListener('click', () => {
      if (typeof GM_setClipboard !== 'undefined') { GM_setClipboard(directUrl); } else { navigator.clipboard.writeText(directUrl); }
      copyBtn.innerText = "✅ Kopiert!";
      setTimeout(() => { copyBtn.innerText = "📋 Link kopieren"; }, 2000);
    });
  }

  function injectDarkTheme() {
    const style = document.createElement('style');
    style.innerHTML = 'body { background-color: #0b0f19 !important; color: #e2e8f0 !important; }';
    document.head.appendChild(style);
  }

  function removeAdblockBlockers() {}
  function addStreamingPlayer(directUrl) {}
})();
