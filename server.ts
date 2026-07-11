import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to resolve Buzzheavier link with token
  app.post("/api/resolve", async (req, res) => {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL ist erforderlich" });
    }

    try {
      // Extract ID
      let id = "";
      const trimmed = url.trim();
      const cleanUrl = trimmed.replace(/^(https?:\/\/)?(www\.)?(ts\.)?/, "");
      const pathParts = cleanUrl.split("/");
      const domainIndex = pathParts.findIndex(part => part.includes("buzzheavier.com") || part.includes("bzzhr.to"));
      
      if (domainIndex !== -1 && domainIndex + 1 < pathParts.length) {
        let nextPart = pathParts[domainIndex + 1];
        if ((nextPart === "f" || nextPart === "d") && domainIndex + 2 < pathParts.length) {
          id = pathParts[domainIndex + 2].split("?")[0];
        } else {
          id = nextPart.split("?")[0];
        }
      } else {
        // Raw ID
        const match = trimmed.match(/^[a-zA-Z0-9_-]{8,16}$/);
        if (match) {
          id = match[0];
        }
      }

      if (!id) {
        return res.status(400).json({ error: "Gültige Buzzheavier-ID konnte nicht extrahiert werden." });
      }

      // Attempt to fetch both /f/id and /id to get the HTML page
      const urlsToTry = [
        `https://buzzheavier.com/f/${id}`,
        `https://buzzheavier.com/${id}`
      ];

      let html = "";
      let finalFetchedUrl = "";
      
      for (const fetchUrl of urlsToTry) {
        try {
          const response = await fetch(fetchUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
            }
          });
          if (response.ok) {
            html = await response.text();
            finalFetchedUrl = response.url || fetchUrl;
            break;
          }
        } catch (err) {
          console.error(`Failed to fetch ${fetchUrl}:`, err);
        }
      }

      if (!html) {
        // Fallback, da der Server-seitige Abruf durch Cloudflare blockiert wurde
        return res.json({
          id,
          originalUrl: url,
          directUrl: `https://buzzheavier.com/d/${id}`,
          filename: `buzz_file_${id}`,
          size: "Unbekannt (Cloudflare Bypass aktiv)",
          isValid: true,
          isFallback: true
        });
      }

      let directUrl = "";
      let filename = "";
      let size = "Unbekannt";

      // Try HTMX redirect extraction first (official mechanism found by subagent)
      const hxGetMatch = html.match(/hx-get=["']([^"']+)["']/i);
      const copyMatch = html.match(/copyDownloadLink\(["']([^"']+)["']\)/i);
      let hxPath = hxGetMatch ? hxGetMatch[1] : (copyMatch ? copyMatch[1] : "");

      if (hxPath) {
        try {
          const downloadRes = await fetch(`https://buzzheavier.com${hxPath}`, {
            headers: {
              "HX-Request": "true",
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "*/*"
            },
            redirect: "manual"
          });
          const redirectedLink = downloadRes.headers.get("hx-redirect");
          if (redirectedLink) {
            directUrl = redirectedLink;
          }
        } catch (err) {
          console.error("Failed to perform HTMX download subrequest:", err);
        }
      }

      // Fallback parsers if HTMX subrequest didn't succeed or didn't yield a direct link
      if (!directUrl) {
        // 1. Look for direct links in HTML with ts.buzzheavier.com and token
        const tokenUrlRegex = /https?:\/\/(?:ts\.)?buzzheavier\.com\/d\/[a-zA-Z0-9_-]+\?v=[a-zA-Z0-9_=-]+/i;
        const matchTokenUrl = html.match(tokenUrlRegex);
        if (matchTokenUrl) {
          directUrl = matchTokenUrl[0];
        }
      }

      if (!directUrl) {
        // 2. Look for /d/ paths with token
        const relativeTokenUrlRegex = /\/d\/[a-zA-Z0-9_-]+\?v=[a-zA-Z0-9_=-]+/i;
        const matchRelative = html.match(relativeTokenUrlRegex);
        if (matchRelative) {
          directUrl = `https://ts.buzzheavier.com${matchRelative[0]}`;
        }
      }

      if (!directUrl) {
        // 3. Search for a form with name "v" input and extract action and value
        const vMatch = html.match(/name=["']v["']\s+value=["']([^"']+)["']/i) || 
                       html.match(/value=["']([^"']+)["']\s+name=["']v["']/i);
        const actionMatch = html.match(/action=["']([^"']+)["']/i);
        
        if (vMatch && vMatch[1]) {
          const token = vMatch[1];
          let action = actionMatch ? actionMatch[1] : `/d/${id}`;
          if (!action.startsWith("http")) {
            action = `https://ts.buzzheavier.com${action.startsWith("/") ? "" : "/"}${action}`;
          }
          directUrl = `${action}?v=${token}`;
        }
      }

      if (!directUrl) {
        // 4. Fallback if still nothing but we have form action
        const actionMatch = html.match(/action=["']\/d\/([^"']+)["']/i);
        if (actionMatch && actionMatch[1]) {
          directUrl = `https://buzzheavier.com/d/${actionMatch[1]}`;
        } else {
          directUrl = `https://buzzheavier.com/d/${id}`;
        }
      }

      // Extract filename
      // Let's search inside h1, h2, or title
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || 
                      html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) ||
                      html.match(/<title>([\s\S]*?)<\/title>/i);
      if (h1Match) {
        filename = h1Match[1].replace(/<[^>]*>/g, "").trim();
        // Clean title if it contains Buzzheavier text
        filename = filename.replace(/\s*-\s*Buzzheavier/i, "").trim();
      }

      if (!filename) {
        filename = `buzz_file_${id}`;
      }

      // Search for size in the HTML (e.g. "Download File 5.8MB")
      const sizeMatch = html.match(/(\d+(?:\.\d+)?\s*(?:KB|MB|GB|B))/i);
      if (sizeMatch) {
        size = sizeMatch[1];
      }

      // Normalisierung: Wenn ein v= Token vorhanden ist, erzwinge immer ts.buzzheavier.com
      if (directUrl && directUrl.includes("v=")) {
        directUrl = directUrl.replace(/https?:\/\/(?:ts\.)?buzzheavier\.com/i, "https://ts.buzzheavier.com");
      }

      return res.json({
        id,
        originalUrl: url,
        directUrl,
        filename,
        size,
        isValid: true
      });

    } catch (error: any) {
      console.error("Resolve error:", error);
      return res.status(500).json({ error: error.message || "Interner Serverfehler" });
    }
  });

  // API route to send download task to local Motrix instance via JSON-RPC
  app.post("/api/motrix/add", async (req, res) => {
    const { directUrl, filename, rpcUrl, secret } = req.body;
    
    if (!directUrl) {
      return res.status(400).json({ error: "directUrl ist erforderlich." });
    }

    const targetRpcUrl = rpcUrl || "http://localhost:16800/jsonrpc";
    
    // Construct Aria2 JSON-RPC request payload
    // Parameters: [ [uri1, uri2...], options ]
    const uris = [directUrl];
    const options: Record<string, string> = {};
    if (filename) {
      options["out"] = filename;
    }

    const params: any[] = [];
    if (secret) {
      params.push(`token:${secret}`);
    }
    params.push(uris);
    params.push(options);

    const payload = {
      jsonrpc: "2.0",
      id: `buzz-manager-${Date.now()}`,
      method: "aria2.addUri",
      params: params
    };

    try {
      const response = await fetch(targetRpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          return res.status(400).json({ error: data.error.message || "Aria2 RPC Fehler" });
        }
        return res.json({ success: true, result: data.result });
      } else {
        const errText = await response.text();
        return res.status(response.status).json({ error: `Motrix RPC antwortete mit Status ${response.status}: ${errText}` });
      }
    } catch (err: any) {
      console.error("Motrix RPC request failed:", err);
      return res.status(500).json({ error: `Verbindung zu Motrix unter ${targetRpcUrl} fehlgeschlagen. Ist Motrix geöffnet?` });
    }
  });

  // API route to get account information from Buzzheavier
  app.get("/api/buzz/account", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization-Header ist erforderlich." });
    }

    try {
      const response = await fetch("https://buzzheavier.com/api/account", {
        headers: {
          "Authorization": authHeader,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      } else {
        const text = await response.text();
        return res.status(response.status).send(text);
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API route to get file storage locations
  app.get("/api/buzz/locations", async (req, res) => {
    const authHeader = req.headers.authorization;
    try {
      const headers: any = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };
      if (authHeader) {
        headers["Authorization"] = authHeader;
      }
      const response = await fetch("https://buzzheavier.com/api/locations", {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        return res.json(data);
      } else {
        const text = await response.text();
        return res.status(response.status).send(text);
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Generic File Manager Proxy (handles GET, POST, PATCH, PUT, DELETE for /api/fs/*)
  app.all("/api/buzz/fs*", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Authorization-Header ist erforderlich." });
    }

    // Extract subpath after /api/buzz/fs
    const subpath = req.path.substring("/api/buzz/fs".length);
    // Reconstruct the full target URL
    const queryString = req.url.includes("?") ? `?${req.url.split("?")[1]}` : "";
    const targetUrl = `https://buzzheavier.com/api/fs${subpath}${queryString}`;

    console.log(`Proxying ${req.method} request to: ${targetUrl}`);

    try {
      const headers: any = {
        "Authorization": authHeader,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        headers["Content-Type"] = "application/json";
      }

      const fetchOptions: any = {
        method: req.method,
        headers,
      };

      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      const status = response.status;

      if (status === 204) {
        return res.status(204).send();
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        return res.status(status).json(data);
      } else {
        const text = await response.text();
        return res.status(status).send(text);
      }
    } catch (error: any) {
      console.error(`Proxy filesystem error for ${targetUrl}:`, error);
      return res.status(500).json({ error: error.message || "Proxy-Fehler" });
    }
  });

  // File Upload Proxy supporting streaming / buffered bodies
  app.put("/api/buzz/upload", async (req, res) => {
    const filename = req.query.name as string;
    const parentId = req.query.parentId as string;
    const locationId = req.query.locationId as string;
    const note = req.query.note as string; // Optional base64 encoded note
    const authHeader = req.headers.authorization;

    if (!filename) {
      return res.status(400).json({ error: "Dateiname (name) ist erforderlich." });
    }

    // Build target URL: https://w.buzzheavier.com/{parentId}/{name} or https://w.buzzheavier.com/{name}
    let targetUrl = "https://w.buzzheavier.com/";
    if (parentId && parentId !== "root" && parentId !== "null" && parentId !== "undefined") {
      targetUrl += `${encodeURIComponent(parentId)}/`;
    }
    targetUrl += encodeURIComponent(filename);

    const queryParams: string[] = [];
    if (locationId) {
      queryParams.push(`locationId=${encodeURIComponent(locationId)}`);
    }
    if (note) {
      queryParams.push(`note=${encodeURIComponent(note)}`);
    }
    if (queryParams.length > 0) {
      targetUrl += `?${queryParams.join("&")}`;
    }

    console.log(`Proxying upload PUT request to: ${targetUrl}`);

    try {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      
      req.on("end", async () => {
        try {
          const bodyBuffer = Buffer.concat(chunks);
          const headers: any = {
            "Content-Type": "application/octet-stream",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          };
          if (authHeader) {
            headers["Authorization"] = authHeader;
          }

          const response = await fetch(targetUrl, {
            method: "PUT",
            headers,
            body: bodyBuffer
          });

          const status = response.status;
          const text = await response.text();

          // Try to return a JSON containing status and response text (or JSON if it parsed)
          let jsonResponse: any = null;
          try {
            jsonResponse = JSON.parse(text);
          } catch (e) {
            // response was plain text
          }

          if (response.ok) {
            return res.status(status).json({
              success: true,
              status,
              data: jsonResponse || text,
              url: jsonResponse?.url || text.trim() // w.buzzheavier.com often returns the direct link in the body
            });
          } else {
            return res.status(status).json({
              success: false,
              status,
              error: text || "Fehler bei Upload-Übermittlung."
            });
          }
        } catch (err: any) {
          console.error("Upload streaming forward error:", err);
          return res.status(500).json({ error: err.message || "Fehler beim Weiterleiten des Uploads." });
        }
      });

      req.on("error", (err) => {
        console.error("Upload proxy body stream error:", err);
        res.status(500).json({ error: "Fehler beim Lesen des Upload-Streams." });
      });

    } catch (err: any) {
      console.error("Upload proxy handler error:", err);
      return res.status(500).json({ error: err.message || "Fehler beim Upload-Proxy." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
