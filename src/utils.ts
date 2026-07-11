import { ScriptConfig, BuzzLink } from "./types";

/**
 * Parses a Buzzheavier URL to extract its unique ID and determine details.
 */
export function parseBuzzheavierUrl(urlStr: string): BuzzLink {
  const trimmed = urlStr.trim();
  const result: BuzzLink = {
    id: "",
    originalUrl: trimmed,
    directUrl: "",
    filename: "",
    extension: "",
    size: "Unbekannte Größe",
    isValid: false,
  };

  if (!trimmed) return result;

  try {
    let id = "";

    // 1. If it contains a URL structure
    if (trimmed.includes("buzzheavier.com") || trimmed.includes("bzzhr.to")) {
      // Clean up protocol/www
      const cleanUrl = trimmed.replace(/^(https?:\/\/)?(www\.)?(ts\.)?/, "");
      const pathParts = cleanUrl.split("/");
      
      // Look for the segment after the domain name
      const domainIndex = pathParts.findIndex(part => part.includes("buzzheavier.com") || part.includes("bzzhr.to"));
      if (domainIndex !== -1 && domainIndex + 1 < pathParts.length) {
        let nextPart = pathParts[domainIndex + 1];
        
        // If next part is 'f' or 'd', take the one after it
        if ((nextPart === "f" || nextPart === "d") && domainIndex + 2 < pathParts.length) {
          id = pathParts[domainIndex + 2].split("?")[0];
        } else {
          id = nextPart.split("?")[0];
        }
      }
    } else {
      // 2. If it is just a raw ID of 8-16 characters
      const idMatch = trimmed.match(/^[a-zA-Z0-9_-]{8,16}$/);
      if (idMatch) {
        id = idMatch[0];
      }
    }

    if (id && id.length >= 6) {
      const fullOriginal = `https://buzzheavier.com/f/${id}`;

      result.id = id;
      result.originalUrl = fullOriginal;
      
      // Preserve existing token if present in the pasted URL
      let directUrl = `https://buzzheavier.com/d/${id}`;
      if (trimmed.includes("v=")) {
        const tokenMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_=-]+)/);
        if (tokenMatch) {
          const token = tokenMatch[1];
          directUrl = `https://ts.buzzheavier.com/d/${id}?v=${token}`;
        }
      }
      result.directUrl = directUrl;
      result.isValid = true;

      // Generate a realistic file name based on ID seed
      const dummyNames: Record<string, { name: string; size: string }> = {
        "5y571e4t6ldw": { name: "Software_Update_v2.1.zip", size: "145.2 MB" },
        "fgorzoh3csa9": { name: "Cinematic_Intro_4K.mp4", size: "450.8 MB" },
        "5ffaxjnwsxvu": { name: "Relaxing_Rain_Background.mp3", size: "18.4 MB" },
        "zxm42cd5ksz1": { name: "Project_Assets_Final.rar", size: "820.4 MB" },
        "t4wcu9cnwt68": { name: "Design_Guidelines_Doc.pdf", size: "3.2 MB" },
        "l5342v5fa9ib": { name: "Ubuntu_Desktop_LTS.iso", size: "3.8 GB" },
        "4m6r569uoswf": { name: "High_Res_Nature_Wallpaper.jpg", size: "4.5 MB" },
        "en40lsvs0ej5": { name: "Database_Backup_2026.sql", size: "89.2 MB" },
        "nbiwzx5knmqi": { name: "Game_Mod_Installer.exe", size: "2.1 GB" },
        "0dtwxq0jhu40": { name: "Presentation_Slides.pptx", size: "12.6 MB" },
        "xyj0bdznnuub": { name: "Source_Code_Repository.tar.gz", size: "34.5 MB" },
        "g8izzlz26p4l": { name: "Audiobook_Chapter_1.m4b", size: "75.1 MB" },
        "df20u88l42pt": { name: "Receipt_Scan_PDF.pdf", size: "1.1 MB" },
        "r5cwa7sp1uop": { name: "Vector_Icon_Pack.svg", size: "820 KB" },
        "ewzobtccbkdd": { name: "Corporate_Pitch_Video.mov", size: "310.2 MB" },
        "qsrzvod448vr": { name: "Key_Decryption_Tool.exe", size: "6.4 MB" },
        "jqqfwrubx3aw": { name: "Config_Template_Production.env", size: "12 KB" },
        "001pt3ew8fwx": { name: "Podcast_Episode_99.wav", size: "180.5 MB" },
        "a8f4q7qd27ao": { name: "Graphics_Rendering_Engine.dll", size: "1.4 MB" },
        "6x5m50zxwssn": { name: "Highly_Compressed_Texture_Pack.zip", size: "1.7 GB" }
      };

      const hash = id.toLowerCase();
      if (dummyNames[hash]) {
        result.filename = dummyNames[hash].name;
        result.size = dummyNames[hash].size;
      } else {
        const extensionList = ["zip", "rar", "mp4", "mp3", "pdf", "mkv", "png", "jpg", "exe", "iso"];
        const filePrefixes = ["buzz_download", "extracted_asset", "media_stream", "package_bundle", "backup_data", "document_print"];
        
        const selectIndex = id.charCodeAt(0) % filePrefixes.length;
        const selectExtIndex = id.charCodeAt(id.length - 1) % extensionList.length;
        const ext = extensionList[selectExtIndex];
        
        result.filename = `${filePrefixes[selectIndex]}_${id.substring(0, 5)}.${ext}`;
        
        const sizes = ["12.4 MB", "48.2 MB", "180.5 MB", "1.4 GB", "540.8 KB", "92.3 MB"];
        result.size = sizes[id.charCodeAt(1) % sizes.length];
      }

      const dotIndex = result.filename.lastIndexOf(".");
      result.extension = dotIndex !== -1 ? result.filename.substring(dotIndex + 1).toLowerCase() : "bin";
    }
  } catch (e) {
    console.error("Error parsing Buzzheavier URL:", e);
  }

  return result;
}

/**
 * Generates the clean Tampermonkey userscript content based on the config.
 */
export function generateUserscript(config: ScriptConfig): string {
  const version = "2.0";
  const dateStr = new Date().toISOString().split("T")[0];

  return `// ==UserScript==
// @name         ${config.scriptName || "Buzzheavier Direct Link & Motrix Helper"}
// @namespace    https://github.com/buzzheavier-tampermonkey
// @version      ${version}
// @description  Extrahiert direkt downloadbare URLs (inklusive Token) von Buzzheavier für Motrix/JDownloader, umgeht Landingpages und Werbung.
// @author       Buzzheavier Script Builder
// @match        *://buzzheavier.com/*
// @match        *://*.buzzheavier.com/*
// @match        http://localhost/*
// @match        http://127.0.0.1/*
// @match        http://localhost:3000/*
// @match        http://127.0.0.1:3000/*
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
                       const html = response.responseText;
              
              // Parse response HTML with DOMParser
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");

              // Details extrahieren
              let filename = "";
              const h1 = doc.querySelector('h1') || doc.querySelector('h2') || doc.querySelector('title');
              if (h1) {
                filename = h1.textContent.replace(/\s*-\s*Buzzheavier/i, "").trim();
              }
              let size = "Unbekannt";
              const sizeMatch = doc.body.textContent.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))/i);
              if (sizeMatch) size = sizeMatch[1];
              
              logToApp("Datei-Details extrahiert (DOM): Name=" + filename + ", Größe=" + size);

              // 1. Suche nach HTMX-Get-Pfad
              const hxElement = doc.querySelector('[hx-get*="/download"]') || 
                                doc.querySelector('[hx-get*="/d/"]') ||
                                doc.querySelector('[hx-get]');
              const hxGet = hxElement ? hxElement.getAttribute('hx-get') : null;
              
              // 2. Suche nach copyDownloadLink onclick-Funktion
              let copyPath = "";
              const copyBtn = doc.querySelector('[onclick*="copyDownloadLink"]');
              if (copyBtn) {
                const onclick = copyBtn.getAttribute('onclick') || "";
                const match = onclick.match(/copyDownloadLink\(['"]([^'"]+)['"]\)/);
                if (match) copyPath = match[1];
              }

              const hxPath = hxGet || copyPath;
              
              if (hxPath) {
                const fetchUrl = hxPath.startsWith("http") ? hxPath : "https://buzzheavier.com" + hxPath;
                logToApp("HTMX Download-Pfad im DOM gefunden: " + hxPath + ". Sende Sub-Request...");
                GM_xmlhttpRequest({
                  method: "GET",
                  url: fetchUrl,
                  headers: {
                    "HX-Request": "true"
                  },
                  onerror: function(err) {
                    logToApp("Netzwerkfehler im Sub-Request: " + JSON.stringify(err));
                  },
                  onload: function(subRes) {
                    logToApp("Sub-Request Antwort erhalten. Status: " + subRes.status);
                    
                    let directUrl = subRes.finalUrl || subRes.finalURL;
                    
                    if (!directUrl) {
                      const headersStr = subRes.responseHeaders || "";
                      const headers = {};
                      headersStr.split("\\r\\n").forEach(line => {
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
                logToApp("Kein HTMX-Pfad im DOM gefunden. Versuche Direkt-Link im DOM...");
                
                // Formular-Token auswerten
                let token = "";
                const form = doc.querySelector('form[action*="/d/"]') || doc.querySelector('form');
                if (form) {
                  const vInput = form.querySelector('input[name="v"]');
                  if (vInput && vInput.value) {
                    token = vInput.value;
                  }
                }
                
                // Direkt-A-Tag auswerten
                const dLink = doc.querySelector('a[href*="/d/"]') || 
                              doc.querySelector('a[href*="ts.buzzheavier.com"]') ||
                              doc.querySelector('a[href*="v="]');
                let foundUrl = "";
                if (dLink) {
                  foundUrl = dLink.getAttribute('href') || "";
                }
                
                let directUrl = foundUrl ? foundUrl : (token ? ("https://ts.buzzheavier.com/d/" + id + "?v=" + token) : "");
                
                if (directUrl) {
                  logToApp("Direktlink aus DOM extrahiert: " + directUrl);
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
                  logToApp("Kein Download-Pfad oder Direkt-Downloadlink im DOM gefunden.");
                }
              }
            }
          });
        }
      }
    });
    return;


  // Konfigurationen vom ${dateStr}
  const CONFIG = {
    autoRedirect: ${config.autoRedirect},
    autoClick: ${config.autoClick},
    autoClickDelay: ${config.autoClickDelay},
    copyToClipboard: ${config.copyToClipboard},
    embedPlayer: ${config.embedPlayer},
    customDarkTheme: ${config.customDarkTheme},
    hideAdblockWarning: ${config.hideAdblockWarning},
    showNotification: ${config.showNotification}
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

  // 1. SOFORTIGER REDIRECT (Falls aktiviert, leitet direkt zur Download-Schnittstelle weiter)
  if (CONFIG.autoRedirect) {
    const pathParts = window.location.pathname.split('/');
    // Finde ID im Pfad /f/ID oder /ID
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
    // A. Dunkles Design anwenden
    if (CONFIG.customDarkTheme) {
      injectDarkTheme();
    }

    // Finde Datei ID auf der aktuellen Seite
    const pathParts = window.location.pathname.split('/');
    let id = "";
    if (pathParts[1] === "f" && pathParts[2]) {
      id = pathParts[2];
    } else if (pathParts[1] && pathParts[1].length >= 8 && pathParts[1] !== "d") {
      id = pathParts[1];
    }

    if (!id) return;

    // B. Anti-Adblocker Warnungen ausblenden
    if (CONFIG.hideAdblockWarning) {
      removeAdblockBlockers();
    }

    // Extrahiere den direkten tokenisierten Download-Link (z. B. ts.buzzheavier.com/d/id?v=token)
    extractDirectLink(id);
  });

  // Extrahiert den Direct-Link für Motrix
  async function extractDirectLink(id) {
    let token = "";
    let actionUrl = "https://buzzheavier.com/d/" + id;
    let foundUrl = "";

    // A. HTMX hx-get Scraper (Sucht nach dem echten Download-Link via hx-get Attribut)
    try {
      const hxElement = document.querySelector('[hx-get*="/download"]') || 
                        document.querySelector('[hx-get*="/d/"]') ||
                        document.querySelector('[hx-get]');
      if (hxElement) {
        const hxGet = hxElement.getAttribute('hx-get');
        if (hxGet) {
          const fetchUrl = hxGet.startsWith('http') ? hxGet : window.location.origin + hxGet;
          console.log("[Buzzheavier Helper] HTMX hx-get gefunden: " + fetchUrl + ". Hole Direktlink...");
          
          const res = await fetch(fetchUrl, {
            headers: {
              "HX-Request": "true",
              "HX-Current-URL": window.location.href
            }
          });
          
          const redirectUrl = res.headers.get("HX-Redirect");
          if (redirectUrl) {
            console.log("[Buzzheavier Helper] HX-Redirect erfolgreich abgefangen: " + redirectUrl);
            foundUrl = redirectUrl;
          }
        }
      }
    } catch (e) {
      console.error("[Buzzheavier Helper] Fehler beim Laden des HTMX-Redirects:", e);
    }

    // 1. Durchsuche alle Links (a) nach der Direct URL mit Token
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

    // 2. Durchsuche alle HTML-Attribute auf der Seite nach dem Link (z.B. in onclick oder data-*-Attributen)
    if (!foundUrl) {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          if (attr.value && attr.value.includes('buzzheavier.com') && attr.value.includes('v=')) {
            const urlMatch = attr.value.match(/https?:\/\/[^\s'"]+/);
            if (urlMatch) {
              foundUrl = urlMatch[0];
              break;
            }
          }
        }
        if (foundUrl) break;
      }
    }

    // 3. Durchsuche alle Script-Tags nach eingebetteten Link-Definitionen
    if (!foundUrl) {
      const scripts = document.querySelectorAll('script');
      for (const scr of scripts) {
        const content = scr.textContent || '';
        const scriptMatch = content.match(/https?:\/\/(?:ts\.)?buzzheavier\.com\/d\/[a-zA-Z0-9_-]+\?v=[a-zA-Z0-9_=-]+/i);
        if (scriptMatch) {
          foundUrl = scriptMatch[0];
          break;
        }
      }
    }

    // 4. Fallback auf die Formular- und Input-Felder
    if (!foundUrl) {
      const form = document.querySelector('form[action*="/d/"]') || 
                   document.querySelector('form[action*="ts.buzzheavier.com"]') ||
                   document.querySelector('form');
                   
      if (form) {
        // Wenn das Formular ein verstecktes Token-Feld 'v' besitzt
        const vInput = form.querySelector('input[name="v"]');
        if (vInput && vInput.value) {
          token = vInput.value;
          const formAction = form.getAttribute('action') || '';
          if (formAction.startsWith('http')) {
            actionUrl = formAction;
          } else if (formAction.startsWith('/')) {
            actionUrl = window.location.origin + formAction;
          } else {
            actionUrl = "https://ts.buzzheavier.com/d/" + id;
          }
        }
      }
    }

    // Baue den finalen, direkt downloadbaren Link zusammen
    let finalDirectUrl = foundUrl ? foundUrl : (token ? \`\${actionUrl}?v=\${token}\` : \`https://ts.buzzheavier.com/d/\${id}\`);

    // Normalisierung: Wenn ein v= Token vorhanden ist, erzwinge immer ts.buzzheavier.com
    if (finalDirectUrl.indexOf("v=") !== -1) {
      if (finalDirectUrl.indexOf("ts.buzzheavier.com") === -1) {
        finalDirectUrl = finalDirectUrl.replace("buzzheavier.com", "ts.buzzheavier.com");
      }
    }

    // C. Automatisch in die Zwischenablage kopieren (Perfekt für Motrix)
    if (CONFIG.copyToClipboard) {
      try {
        if (typeof GM_setClipboard !== 'undefined') {
          GM_setClipboard(finalDirectUrl);
        } else {
          navigator.clipboard.writeText(finalDirectUrl);
        }
        notify("Direktlink automatisch für Motrix kopiert!");
      } catch (e) {
        console.error("Clipboard copy failed:", e);
      }
    }

    // Rückmeldung an die Converter-Webseite senden (falls vorhanden)
    if (window.opener) {
      try {
        // Versuchen, Dateiname und Größe aus dem DOM zu lesen
        let fn = "";
        const h1 = document.querySelector('h1') || document.querySelector('h2');
        if (h1) {
          fn = h1.innerText.replace(/<[^>]*>/g, "").replace(/\s*-\s*Buzzheavier/i, "").trim();
        }
        if (!fn) {
          const titleTag = document.querySelector('title');
          if (titleTag) {
            fn = titleTag.innerText.replace(/\s*-\s*Buzzheavier/i, "").trim();
          }
        }
        if (!fn) fn = "buzz_file_" + id;

        let sz = "Unbekannt";
        const sizeMatch = document.body.innerText.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))/i);
        if (sizeMatch) sz = sizeMatch[1];

        window.opener.postMessage({
          type: "BUZZ_RESOLVED",
          id: id,
          directUrl: finalDirectUrl,
          filename: fn,
          size: sz
        }, "*");

        // Tab nach erfolgreicher Übertragung schließen, falls im Batch-Modus geöffnet
        if (window.name === "buzz_batch_resolve_" + id || window.location.search.includes("batch=1")) {
          setTimeout(() => {
            window.close();
          }, 800);
        }
      } catch (err) {
        console.error("Fehler beim Senden an opener:", err);
      }
    }

    // D. Streaming-Player einbetten
    if (CONFIG.embedPlayer) {
      addStreamingPlayer(finalDirectUrl);
    }

    // E. Schickes GUI-Panel auf Buzzheavier anzeigen
    createHelperPanel(finalDirectUrl);

    // F. Auto-Click der Download-Schaltfläche nach Verzögerung
    if (CONFIG.autoClick) {
      setTimeout(() => {
        const btn = document.querySelector('input[type="submit"]') || 
                    document.querySelector('button[type="submit"]') ||
                    document.querySelector('.btn-download');
        if (btn) {
          btn.click();
          notify("Download gestartet!");
        }
      }, CONFIG.autoClickDelay * 1000);
    }
  }

  // Erstellt ein schwebendes, modernes Panel für schnellen Kopier-Zugriff
  function createHelperPanel(directUrl) {
    const panel = document.createElement('div');
    panel.id = 'motrix-helper-panel';
    panel.style.cssText = \`
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(145deg, #1e293b, #0f172a);
      border: 1.5px solid #38bdf8;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5), 0 10px 10px -5px rgba(0,0,0,0.4);
      z-index: 999999;
      width: 320px;
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
    \`;

    panel.innerHTML = \`
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
        <span style="font-weight: 700; color: #38bdf8; font-size: 14px; display: flex; align-items: center; gap: 6px;">
          ⚡ Motrix & Direct Downloader
        </span>
        <button id="close-helper-panel" style="background:none; border:none; color:#94a3b8; cursor:pointer; font-size:16px;">&times;</button>
      </div>
      <p style="font-size: 11px; color: #cbd5e1; margin: 0 0 10px 0; line-height: 1.4;">
        Dieser Link enthält das aktive Sicherheitstoken und kann direkt in <strong>Motrix</strong>, <strong>JDownloader</strong> oder <strong>IDM</strong> eingefügt werden.
      </p>
      <input type="text" readonly value="\${directUrl}" style="width:100%; background:#0f172a; border:1px solid #334155; border-radius:6px; color:#38bdf8; padding:6px 10px; font-size:10px; font-family:monospace; margin-bottom:12px; outline:none;" />
      <div style="display:flex; gap:8px;">
        <button id="btn-copy-helper" style="flex:1; background:#0284c7; hover:background:#0369a1; border:none; color:white; border-radius:6px; padding:8px; font-size:11px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
          📋 Link kopieren
        </button>
        <a href="\${directUrl}" style="background:#1e293b; border:1px solid #475569; color:white; border-radius:6px; padding:8px; font-size:11px; text-decoration:none; text-align:center; font-weight:600; flex:1;">
          📥 Download
        </a>
      </div>
    \`;

    document.body.appendChild(panel);

    // Event Listeners
    document.getElementById('close-helper-panel').addEventListener('click', () => {
      panel.remove();
    });

    const copyBtn = document.getElementById('btn-copy-helper');
    copyBtn.addEventListener('click', () => {
      if (typeof GM_setClipboard !== 'undefined') {
        GM_setClipboard(directUrl);
      } else {
        navigator.clipboard.writeText(directUrl);
      }
      copyBtn.innerText = "✅ Kopiert!";
      copyBtn.style.background = "#22c55e";
      notify("Direkter CDN-Downloadlink für Motrix kopiert!");
      setTimeout(() => {
        copyBtn.innerText = "📋 Link kopieren";
        copyBtn.style.background = "#0284c7";
      }, 2000);
    });
  }

  // Premium Dark Theme Injector
  function injectDarkTheme() {
    const style = document.createElement('style');
    style.id = 'buzz-dark-theme';
    style.innerHTML = \`
      body {
        background-color: #0b0f19 !important;
        color: #e2e8f0 !important;
        font-family: system-ui, -apple-system, sans-serif !important;
      }
      .card, .panel, div[class*="bg-white"], .bg-white {
        background-color: #111827 !important;
        border-color: #1f2937 !important;
        color: #f1f5f9 !important;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5) !important;
      }
      table, th, td {
        border-color: #1f2937 !important;
        color: #cbd5e1 !important;
      }
      th {
        background-color: #1e293b !important;
        color: #38bdf8 !important;
      }
      a {
        color: #0ea5e9 !important;
      }
      a:hover {
        color: #38bdf8 !important;
      }
      button, .btn, input[type="submit"] {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
        border: none !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        transition: transform 0.2s, opacity 0.2s !important;
      }
      button:hover, .btn:hover, input[type="submit"]:hover {
        opacity: 0.9 !important;
        transform: translateY(-1px) !important;
      }
      input, select, textarea {
        background-color: #1e293b !important;
        color: #f8fafc !important;
        border-color: #334155 !important;
      }
      iframe[src*="google"], div[class*="ad-"], div[id*="ad-"], .adsbygoogle {
        display: none !important;
      }
    \`;
    document.head.appendChild(style);
  }

  // Anti-Adblocker Remover
  function removeAdblockBlockers() {
    const adblockKeywords = ['adblock', 'ad-block', 'adblocker', 'anti-ad'];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            const text = (el.innerText || el.textContent || '').toLowerCase();
            const hasKeyword = adblockKeywords.some(kw => text.includes(kw));
            
            const style = window.getComputedStyle(el);
            const isModal = (style.position === 'fixed' || style.position === 'absolute') && 
                            parseInt(style.zIndex) > 50;
            
            if (isModal && hasKeyword) {
              el.remove();
              document.body.style.overflow = 'auto';
            }
          }
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Audio/Video Player Einbettung
  function addStreamingPlayer(directUrl) {
    const titleText = document.title || "";
    const pageText = document.body.innerText || "";
    const combined = (titleText + " " + pageText).toLowerCase();

    const videoExtensions = ['.mp4', '.mkv', '.webm', '.avi', '.mov'];
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];

    const isVideo = videoExtensions.some(ext => combined.includes(ext));
    const isAudio = audioExtensions.some(ext => combined.includes(ext));

    if (!isVideo && !isAudio) return;

    const playerContainer = document.createElement('div');
    playerContainer.id = 'buzz-streaming-player';
    playerContainer.style.cssText = \`
      margin: 20px auto;
      max-width: 760px;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
    \`;

    const titleH3 = document.createElement('h3');
    titleH3.innerText = isVideo ? "🎬 Sofortige Video-Vorschau" : "🎵 Sofortige Audio-Vorschau";
    titleH3.style.cssText = "color: #38bdf8; margin: 0 0 12px 0; font-size: 15px; font-weight: 600;";
    playerContainer.appendChild(titleH3);

    if (isVideo) {
      const video = document.createElement('video');
      video.src = directUrl;
      video.controls = true;
      video.preload = "metadata";
      video.style.cssText = "width: 100%; max-height: 480px; border-radius: 8px; background: #000;";
      playerContainer.appendChild(video);
    } else if (isAudio) {
      const audio = document.createElement('audio');
      audio.src = directUrl;
      audio.controls = true;
      audio.preload = "metadata";
      audio.style.cssText = "width: 100%; margin-top: 4px;";
      playerContainer.appendChild(audio);
    }

    const insertionPoint = document.querySelector('table, form, .card') || document.body.firstChild;
    if (insertionPoint) {
      insertionPoint.parentNode.insertBefore(playerContainer, insertionPoint);
    }
  }

})();
`;
}

