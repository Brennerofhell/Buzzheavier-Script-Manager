import { useState, useEffect, FormEvent } from "react";
import { 
  Download, 
  Copy, 
  FileText, 
  Settings, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  Terminal, 
  Sliders, 
  Plus, 
  Trash2, 
  Cpu, 
  FileCode, 
  Video, 
  Music, 
  Layers, 
  Eye, 
  Info, 
  Globe, 
  Flame, 
  ArrowRight,
  Sparkles,
  Upload,
  Folder,
  FolderPlus,
  Edit,
  Move,
  FolderOpen,
  Send,
  Loader2,
  Play
} from "lucide-react";
import { ScriptConfig, BuzzLink } from "./types";
import { parseBuzzheavierUrl, generateUserscript } from "./utils";

// Standardmäßig eingelesene Links des Benutzers
const INITIAL_LINKS_TEXT = `https://buzzheavier.com/5y571e4t6ldw
https://buzzheavier.com/fgorzoh3csa9
https://buzzheavier.com/5ffaxjnwsxvu
https://buzzheavier.com/zxm42cd5ksz1
https://buzzheavier.com/t4wcu9cnwt68
https://buzzheavier.com/l5342v5fa9ib
https://buzzheavier.com/4m6r569uoswf
https://buzzheavier.com/en40lsvs0ej5
https://buzzheavier.com/nbiwzx5knmqi
https://buzzheavier.com/0dtwxq0jhu40
https://buzzheavier.com/xyj0bdznnuub
https://buzzheavier.com/g8izzlz26p4l
https://buzzheavier.com/df20u88l42pt
https://buzzheavier.com/r5cwa7sp1uop
https://buzzheavier.com/ewzobtccbkdd
https://buzzheavier.com/qsrzvod448vr
https://buzzheavier.com/jqqfwrubx3aw
https://buzzheavier.com/001pt3ew8fwx
https://buzzheavier.com/a8f4q7qd27ao`;

// Helper to map file extensions to icons
const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (!ext) return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
  if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext)) {
    return <Video className="w-4 h-4 text-indigo-400 shrink-0" />;
  }
  if (["mp3", "wav", "flac", "ogg", "m4a"].includes(ext)) {
    return <Music className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (["js", "ts", "jsx", "tsx", "html", "css", "json", "py", "sh"].includes(ext)) {
    return <FileCode className="w-4 h-4 text-sky-400 shrink-0" />;
  }
  return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
};

// Helper to format byte sizes elegantly
const formatSize = (bytes: number | string) => {
  const numBytes = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(numBytes)) return bytes;
  if (numBytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default function App() {
  // Tabs: 'converter' | 'script' | 'tutorial' | 'uploader' | 'manager'
  const [activeTab, setActiveTab] = useState<"converter" | "script" | "tutorial" | "uploader" | "manager">("converter");
  
  // Link Converter State
  const [inputText, setInputText] = useState(INITIAL_LINKS_TEXT);
  const [links, setLinks] = useState<BuzzLink[]>([]);
  const [isCopiedAll, setIsCopiedAll] = useState(false);
  const [isCopiedMotrixList, setIsCopiedMotrixList] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [scriptConfig, setScriptConfig] = useState<ScriptConfig>({
    scriptName: "Buzzheavier Direct Link & Motrix Helper",
    autoRedirect: false,
    autoClick: true,
    autoClickDelay: 1,
    copyToClipboard: true,
    embedPlayer: true,
    customDarkTheme: true,
    hideAdblockWarning: true,
    showNotification: true,
    sendToMotrix: false,
    motrixRpcUrl: "http://localhost:16800/jsonrpc",
    motrixSecret: "",
  });

  const [copiedScript, setCopiedScript] = useState(false);

  // Online Token Resolve States
  const [resolvingIds, setResolvingIds] = useState<string[]>([]);
  const [sendingMotrixIds, setSendingMotrixIds] = useState<string[]>([]);
  const [isSendingAllMotrix, setIsSendingAllMotrix] = useState(false);
  const [resolvedLinksInfo, setResolvedLinksInfo] = useState<Record<string, { directUrl: string; filename: string; size: string }>>({});
  const [isHelperActive, setIsHelperActive] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // File Uploader States
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSuccessUrl, setUploadSuccessUrl] = useState("");
  const [uploadSuccessDirectUrl, setUploadSuccessDirectUrl] = useState("");
  const [uploadSuccessFilename, setUploadSuccessFilename] = useState("");
  
  // Account token and options
  const [accountId, setAccountId] = useState(() => localStorage.getItem("buzz_account_id") || "");
  const [uploadParentId, setUploadParentId] = useState("");
  const [uploadLocationId, setUploadLocationId] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadType, setUploadType] = useState<"anonymous" | "authenticated">("anonymous");

  // File Manager States
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [folderHistory, setFolderHistory] = useState<{ id: string; name: string }[]>([
    { id: "root", name: "Root" }
  ]);
  const [dirContents, setDirContents] = useState<any[]>([]);
  const [isDirLoading, setIsDirLoading] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  
  // Dialog/Edit States
  const [newFolderName, setNewFolderName] = useState("");
  const [renameItemId, setRenameItemId] = useState<string | null>(null);
  const [renameItemName, setRenameItemName] = useState("");
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [moveTargetId, setMoveTargetId] = useState("");
  const [fileNoteId, setFileNoteId] = useState<string | null>(null);
  const [fileNoteText, setFileNoteText] = useState("");

  // Benachrichtigungs-Helper
  const triggerNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Load account info
  const fetchAccountInfo = async () => {
    if (!accountId.trim()) return;
    try {
      const response = await fetch("/api/buzz/account", {
        headers: {
          "Authorization": `Bearer ${accountId.trim()}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data);
      }
    } catch (err) {
      console.error("Failed to fetch account info:", err);
    }
  };

  // Load locations
  const fetchLocations = async () => {
    try {
      const headers: Record<string, string> = {};
      if (accountId.trim()) {
        headers["Authorization"] = `Bearer ${accountId.trim()}`;
      }
      const response = await fetch("/api/buzz/locations", { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setLocations(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  // Load directory contents
  const fetchDirectoryContents = async (folderId: string) => {
    if (!accountId.trim()) return;
    setIsDirLoading(true);
    try {
      const pathSuffix = folderId === "root" ? "" : `/${folderId}`;
      const response = await fetch(`/api/buzz/fs${pathSuffix}`, {
        headers: {
          "Authorization": `Bearer ${accountId.trim()}`
        }
      });

      if (!response.ok) {
        throw new Error("Fehler beim Abrufen der Verzeichnisliste.");
      }

      const data = await response.json();
      
      let parsedItems: any[] = [];
      if (Array.isArray(data)) {
        parsedItems = data;
      } else if (data && typeof data === "object") {
        const folders = (data.directories || data.folders || []).map((f: any) => ({
          ...f,
          isDirectory: true
        }));
        const files = (data.files || []).map((f: any) => ({
          ...f,
          isDirectory: false
        }));
        parsedItems = [...folders, ...files];
      }

      setDirContents(parsedItems);
      setCurrentFolderId(folderId);
    } catch (err: any) {
      console.error(err);
      triggerNotification(err.message || "Fehler beim Laden des Verzeichnisses.");
    } finally {
      setIsDirLoading(false);
    }
  };

  // Navigate to a subfolder
  const navigateToFolder = (folderId: string, folderName: string) => {
    const newHistory = [...folderHistory, { id: folderId, name: folderName }];
    setFolderHistory(newHistory);
    fetchDirectoryContents(folderId);
  };

  // Navigate to a breadcrumb
  const navigateToBreadcrumb = (index: number) => {
    const newHistory = folderHistory.slice(0, index + 1);
    setFolderHistory(newHistory);
    fetchDirectoryContents(newHistory[newHistory.length - 1].id);
  };

  // Create folder
  const handleCreateFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    try {
      const pathSuffix = currentFolderId === "root" ? "" : `/${currentFolderId}`;
      const response = await fetch(`/api/buzz/fs${pathSuffix}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accountId.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newFolderName.trim() })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Ordner konnte nicht erstellt werden.");
      }

      triggerNotification(`Ordner "${newFolderName}" erfolgreich erstellt!`);
      setNewFolderName("");
      fetchDirectoryContents(currentFolderId);
    } catch (err: any) {
      triggerNotification(`Fehler: ${err.message}`);
    }
  };

  // Rename folder or file
  const handleRenameItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!renameItemId || !renameItemName.trim()) return;

    try {
      const response = await fetch(`/api/buzz/fs/${renameItemId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${accountId.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: renameItemName.trim() })
      });

      if (!response.ok) {
        throw new Error("Umbenennung fehlgeschlagen.");
      }

      triggerNotification("Erfolgreich umbenannt!");
      setRenameItemId(null);
      setRenameItemName("");
      fetchDirectoryContents(currentFolderId);
    } catch (err: any) {
      triggerNotification(`Fehler: ${err.message}`);
    }
  };

  // Move folder or file
  const handleMoveItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!moveItemId || !moveTargetId.trim()) return;

    try {
      const response = await fetch(`/api/buzz/fs/${moveItemId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accountId.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ parentId: moveTargetId.trim() })
      });

      if (!response.ok) {
        throw new Error("Verschieben fehlgeschlagen.");
      }

      triggerNotification("Erfolgreich verschoben!");
      setMoveItemId(null);
      setMoveTargetId("");
      fetchDirectoryContents(currentFolderId);
    } catch (err: any) {
      triggerNotification(`Fehler: ${err.message}`);
    }
  };

  // Add/edit note
  const handleSaveFileNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!fileNoteId) return;

    try {
      const response = await fetch(`/api/buzz/fs/${fileNoteId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${accountId.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ note: fileNoteText.trim() })
      });

      if (!response.ok) {
        throw new Error("Notiz konnte nicht gespeichert werden.");
      }

      triggerNotification("Notiz erfolgreich aktualisiert!");
      setFileNoteId(null);
      setFileNoteText("");
      fetchDirectoryContents(currentFolderId);
    } catch (err: any) {
      triggerNotification(`Fehler: ${err.message}`);
    }
  };

  // Delete folder or file
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Möchtest du "${name}" wirklich unwiderruflich löschen?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/buzz/fs/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accountId.trim()}`
        }
      });

      if (!response.ok) {
        throw new Error("Löschen fehlgeschlagen.");
      }

      triggerNotification(`"${name}" wurde gelöscht.`);
      fetchDirectoryContents(currentFolderId);
    } catch (err: any) {
      triggerNotification(`Fehler: ${err.message}`);
    }
  };

  // File Uploading method
  const handleUploadFile = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      triggerNotification("Bitte wähle zuerst eine Datei aus.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    setUploadSuccessUrl("");
    setUploadSuccessDirectUrl("");

    // Simulate progress start
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 400);

    try {
      const headers: Record<string, string> = {};
      if (uploadType === "authenticated" && accountId.trim()) {
        headers["Authorization"] = `Bearer ${accountId.trim()}`;
      }

      // Convert note to base64 if provided
      let b64Note = "";
      if (uploadNote.trim()) {
        b64Note = btoa(unescape(encodeURIComponent(uploadNote.trim())));
      }

      // Construct request URL
      const queryParams: string[] = [];
      queryParams.push(`name=${encodeURIComponent(uploadFile.name)}`);
      if (uploadType === "authenticated" && uploadParentId.trim()) {
        queryParams.push(`parentId=${encodeURIComponent(uploadParentId.trim())}`);
      }
      if (uploadLocationId.trim()) {
        queryParams.push(`locationId=${encodeURIComponent(uploadLocationId.trim())}`);
      }
      if (b64Note) {
        queryParams.push(`note=${encodeURIComponent(b64Note)}`);
      }

      const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";

      const response = await fetch(`/api/buzz/upload${queryString}`, {
        method: "PUT",
        headers,
        body: uploadFile // Raw File body
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Upload fehlgeschlagen.");
      }

      const resData = await response.json();
      if (resData.success) {
        let finalUrl = resData.url || "";
        let directUrl = "";
        let id = "";
        if (finalUrl) {
          const parts = finalUrl.split("/");
          id = parts[parts.length - 1];
          directUrl = `https://buzzheavier.com/d/${id}`;
        }
        
        setUploadSuccessUrl(finalUrl || `https://buzzheavier.com/${id}`);
        setUploadSuccessDirectUrl(directUrl || `https://buzzheavier.com/d/${id}`);
        setUploadSuccessFilename(uploadFile.name);
        triggerNotification("Datei erfolgreich hochgeladen!");
        setUploadFile(null);
        
        if (accountId.trim()) {
          fetchDirectoryContents(currentFolderId);
          fetchAccountInfo();
        }
      } else {
        throw new Error(resData.error || "Unbekannter Upload-Fehler.");
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification(`Upload-Fehler: ${err.message || "Verbindung abgelehnt"}`);
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  // Sync token to storage and fetch initial data
  useEffect(() => {
    localStorage.setItem("buzz_account_id", accountId);
    if (accountId.trim()) {
      fetchAccountInfo();
      fetchLocations();
      fetchDirectoryContents("root");
    } else {
      setAccountInfo(null);
      setDirContents([]);
    }
  }, [accountId]);

  // Verarbeite die Links, wenn sich der inputText ändert
  useEffect(() => {
    const lines = inputText.split("\n");
    const parsedLinks: BuzzLink[] = [];
    const seenIds = new Set<string>();

    lines.forEach((line) => {
      const parsed = parseBuzzheavierUrl(line);
      if (parsed.isValid && !seenIds.has(parsed.id)) {
        parsedLinks.push(parsed);
        seenIds.add(parsed.id);
      }
    });

    setLinks(parsedLinks);
  }, [inputText]);

  // Einzelnen Link online auflösen (holt das echte v= Token vom Server)
  const resolveLinkOnline = async (id: string, originalUrl: string) => {
    if (resolvingIds.includes(id)) return;
    setResolvingIds(prev => [...prev, id]);

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: originalUrl || id }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Fehler beim Abrufen des Links");
      }

      const data = await response.json();
      if (data.isValid) {
        setResolvedLinksInfo(prev => ({
          ...prev,
          [id]: {
            directUrl: data.directUrl,
            filename: data.filename || `buzz_file_${id}`,
            size: data.size || "Unbekannte Größe",
            isFallback: !!data.isFallback,
          }
        }));
        if (data.isFallback) {
          triggerNotification(`Standard-Link für ${id} geladen (Sicherheitstoken via Tampermonkey holen).`);
        } else {
          triggerNotification(`Sicherheitstoken für ${data.filename || id} erfolgreich geladen!`);
        }
      } else {
        throw new Error("Gültige Daten wurden nicht vom Server zurückgegeben.");
      }
    } catch (err: any) {
      console.error(err);
      triggerNotification(`Fehler bei ID ${id}: ${err.message || "Online-Abruf fehlgeschlagen"}`);
    } finally {
      setResolvingIds(prev => prev.filter(item => item !== id));
    }
  };

  // Automatischer Online-Token-Bypass im Hintergrund
  useEffect(() => {
    if (activeTab !== "converter" || links.length === 0) return;

    const unresolved = links.filter((link) => {
      const info = resolvedLinksInfo[link.id];
      const currentUrl = info?.directUrl || link.directUrl;
      return !currentUrl.includes("v=") && !info?.isFallback && !resolvingIds.includes(link.id);
    });

    if (unresolved.length > 0) {
      const nextLink = unresolved[0];
      const timer = setTimeout(() => {
        if (isHelperActive) {
          // Hintergrund-Bypass über lokale Tampermonkey-Erweiterung
          setResolvingIds(prev => [...prev, nextLink.id]);
          window.postMessage({
            type: "REQUEST_BUZZ_RESOLVE",
            id: nextLink.id,
            url: nextLink.originalUrl
          }, "*");
          // Timeout um Resolving-Status zurückzusetzen, falls Script blockiert/fehlt
          setTimeout(() => {
            setResolvingIds(prev => prev.filter(item => item !== nextLink.id));
          }, 8000);
        } else {
          resolveLinkOnline(nextLink.id, nextLink.originalUrl);
        }
      }, 400); // Kleine Verzögerung zur Server-Schonung
      return () => clearTimeout(timer);
    }
  }, [links, resolvedLinksInfo, resolvingIds, activeTab, isHelperActive]);

  // Auf Nachrichten vom Tampermonkey-Userscript lauschen
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "BUZZ_HELPER_READY") {
        setIsHelperActive(true);
      }
      if (event.data && event.data.type === "BUZZ_LOG") {
        setDebugLogs(prev => [...prev.slice(-99), `[Tampermonkey] ${event.data.message}`]);
      }
      if (event.data && event.data.type === "BUZZ_RESOLVED") {
        const { id, directUrl, filename, size } = event.data;
        if (id) {
          setResolvedLinksInfo(prev => ({
            ...prev,
            [id]: {
              directUrl,
              filename: filename || `buzz_file_${id}`,
              size: size || "Unbekannte Größe",
              isFallback: false
            }
          }));
          setResolvingIds(prev => prev.filter(item => item !== id));
          triggerNotification(`Sicherheitstoken für ${filename || id} erhalten!`);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Alle ungelösten Links nacheinander im Browser in neuen Tabs via Tampermonkey öffnen
  const resolveAllWithTampermonkey = () => {
    const unresolved = links.filter((link) => {
      const info = resolvedLinksInfo[link.id];
      const currentUrl = info?.directUrl || link.directUrl;
      return !currentUrl.includes("v=");
    });

    if (unresolved.length === 0) {
      triggerNotification("Alle Links haben bereits ein Sicherheitstoken!");
      return;
    }

    triggerNotification(`${unresolved.length} Link(s) werden nacheinander geöffnet, um Token abzufangen...`);
    
    unresolved.forEach((link, idx) => {
      setTimeout(() => {
        const targetUrl = `https://buzzheavier.com/f/${link.id}?batch=1`;
        window.open(targetUrl, "buzz_batch_resolve_" + link.id);
      }, idx * 1200); // Etwas Delay zur Vermeidung von Popup-Blockern
    });
  };

  // Alle geladenen Links nacheinander online auflösen
  const resolveAllOnline = async () => {
    if (links.length === 0) return;
    triggerNotification("Online-Auflösung gestartet... Bitte warten.");
    
    // Nacheinander auflösen um Server-Schonung zu betreiben
    for (const link of links) {
      // Wenn der Link bereits ein Token oder ein Fallback hat, überspringen wir ihn
      const info = resolvedLinksInfo[link.id];
      const currentUrl = info?.directUrl || link.directUrl;
      if (currentUrl.includes("v=") || info?.isFallback) {
        continue;
      }
      await resolveLinkOnline(link.id, link.originalUrl);
    }
    triggerNotification("Alle Links wurden online verarbeitet!");
  };

  // Funktion zum Hinzufügen eines einzelnen Links
  const [singleLinkInput, setSingleLinkInput] = useState("");
  const handleAddSingleLink = (e: FormEvent) => {
    e.preventDefault();
    if (!singleLinkInput.trim()) return;

    const parsed = parseBuzzheavierUrl(singleLinkInput);
    if (parsed.isValid) {
      if (links.some(l => l.id === parsed.id)) {
        triggerNotification("Dieser Link existiert bereits in der Liste!");
      } else {
        setLinks([...links, parsed]);
        setInputText(prev => prev.trim() + "\n" + singleLinkInput.trim());
        setSingleLinkInput("");
        triggerNotification("Link erfolgreich hinzugefügt!");
      }
    } else {
      triggerNotification("Ungültiger Buzzheavier Link oder ID!");
    }
  };

  // Löscht einen einzelnen Link aus der Liste
  const handleDeleteLink = (id: string) => {
    const updatedLinks = links.filter(l => l.id !== id);
    setLinks(updatedLinks);
    
    // Update text area
    const newText = updatedLinks.map(l => l.originalUrl).join("\n");
    setInputText(newText);
    triggerNotification("Link aus der Liste entfernt.");
  };

  // Löscht alle Links
  const handleClearAll = () => {
    setLinks([]);
    setInputText("");
    triggerNotification("Liste geleert.");
  };

  // Kopiert alle Standard-Direktlinks
  const handleCopyAllDirect = () => {
    if (links.length === 0) return;
    const directLinksText = links.map(l => {
      const url = resolvedLinksInfo[l.id]?.directUrl || l.directUrl;
      return url.includes("v=") ? url : l.originalUrl;
    }).join("\n");
    navigator.clipboard.writeText(directLinksText);
    setIsCopiedAll(true);
    triggerNotification("Alle Direktlinks kopiert (Bypass-Links wo verfügbar, sonst Landingpage-Links)!");
    setTimeout(() => setIsCopiedAll(false), 2000);
  };

  // Kopiert eine formatierte Textliste für Motrix
  const handleCopyMotrixTextList = () => {
    if (links.length === 0) return;
    // Motrix kann standardmäßig reguläre Linklisten importieren
    const listText = links.map(l => {
      const url = resolvedLinksInfo[l.id]?.directUrl || l.directUrl;
      return url.includes("v=") ? url : l.originalUrl;
    }).join("\n");
    navigator.clipboard.writeText(listText);
    setIsCopiedMotrixList(true);
    triggerNotification("Motrix-kompatible Liste kopiert!");
    setTimeout(() => setIsCopiedMotrixList(false), 2000);
  };

  // Sendet einen einzelnen Link an die lokale Motrix Instanz über das Backend
  const sendSingleToMotrix = async (id: string, directUrl: string, filename: string) => {
    if (sendingMotrixIds.includes(id)) return;
    setSendingMotrixIds(prev => [...prev, id]);
    try {
      const response = await fetch("/api/motrix/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          directUrl,
          filename,
          rpcUrl: scriptConfig.motrixRpcUrl,
          secret: scriptConfig.motrixSecret
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        triggerNotification(`Erfolgreich an Motrix gesendet: ${filename}`);
      } else {
        triggerNotification(`Fehler: ${data.error || "Verbindung fehlgeschlagen"}`);
      }
    } catch (e) {
      triggerNotification("Fehler beim Senden an Motrix!");
    } finally {
      setSendingMotrixIds(prev => prev.filter(i => i !== id));
    }
  };

  // Sendet alle gelösten Links an Motrix
  const sendAllToMotrix = async () => {
    if (links.length === 0) return;
    setIsSendingAllMotrix(true);
    let successCount = 0;
    for (const link of links) {
      const info = resolvedLinksInfo[link.id];
      const url = info?.directUrl || link.directUrl;
      const fn = info?.filename || link.filename;
      if (url) {
        try {
          const response = await fetch("/api/motrix/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              directUrl: url,
              filename: fn,
              rpcUrl: scriptConfig.motrixRpcUrl,
              secret: scriptConfig.motrixSecret
            })
          });
          const data = await response.json();
          if (response.ok && data.success) {
            successCount++;
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    triggerNotification(`${successCount} von ${links.length} Links an Motrix gesendet!`);
    setIsSendingAllMotrix(false);
  };

  // Download einer .txt Datei für den direkten Import in Motrix
  const handleDownloadTxtList = () => {
    if (links.length === 0) return;
    const listText = links.map(l => {
      const url = resolvedLinksInfo[l.id]?.directUrl || l.directUrl;
      return url.includes("v=") ? url : l.originalUrl;
    }).join("\n");
    const element = document.createElement("a");
    const file = new Blob([listText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `buzzheavier_motrix_import_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    triggerNotification("TXT-Importdatei heruntergeladen!");
  };

  // Kopiert den erstellten Userscript Code
  const generatedCode = generateUserscript(scriptConfig);
  const handleCopyScript = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedScript(true);
    triggerNotification("Tampermonkey Userscript kopiert!");
    setTimeout(() => setCopiedScript(false), 2000);
  };

  // Download des Userscripts als .user.js zur schnellen Installation
  const handleDownloadScriptFile = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedCode], {type: 'text/javascript'});
    element.href = URL.createObjectURL(file);
    element.download = "buzzheavier_direct_helper.user.js";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    triggerNotification("Script-Datei heruntergeladen! Ziehe sie in Tampermonkey.");
  };

  // Hilfsfunktion zur Zuweisung passender Icons pro Dateiendung
  const getFileIconByExtension = (ext: string) => {
    const e = ext.toLowerCase();
    if (["mp3", "wav", "ogg", "m4a", "flac"].includes(e)) {
      return <Music className="w-5 h-5 text-emerald-400" id={`icon-music-${ext}`} />;
    }
    if (["mp4", "mkv", "webm", "avi", "mov"].includes(e)) {
      return <Video className="w-5 h-5 text-sky-400" id={`icon-video-${ext}`} />;
    }
    if (["zip", "rar", "7z", "tar", "gz"].includes(e)) {
      return <Layers className="w-5 h-5 text-amber-400" id={`icon-archive-${ext}`} />;
    }
    if (["pdf", "txt", "doc", "docx", "pptx", "sql", "env"].includes(e)) {
      return <FileText className="w-5 h-5 text-indigo-400" id={`icon-doc-${ext}`} />;
    }
    return <Cpu className="w-5 h-5 text-rose-400" id={`icon-binary-${ext}`} />;
  };

  const unresolvedCount = links.filter(l => !(resolvedLinksInfo[l.id]?.directUrl || l.directUrl).includes("v=") && !resolvedLinksInfo[l.id]?.isFallback).length;
  const fallbackCount = links.filter(l => resolvedLinksInfo[l.id]?.isFallback).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-sky-500/30 selection:text-sky-300">
      
      {/* Glow-Effekte im Hintergrund */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Globale Benachrichtigung */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border-l-4 border-sky-500 text-sky-200 px-5 py-3 rounded-r-lg shadow-2xl flex items-center gap-3 animate-slide-in">
          <Sparkles className="w-5 h-5 text-sky-400 animate-pulse" />
          <span className="font-medium text-sm">{notification}</span>
        </div>
      )}

      {/* Navigationsleiste */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-500 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-sky-500/20">
              <Flame className="w-6 h-6 text-white animate-pulse" id="header-flame-icon" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-sky-400 via-indigo-200 to-white bg-clip-text text-transparent">
                Buzzheavier Script & Motrix Direct Linker
              </h1>
              <p className="text-xs text-slate-400">
                Premium-Downloads mit Motrix beschleunigen & Tampermonkey Script generieren
              </p>
            </div>
          </div>

          {/* Tab-Wechsler */}
          <nav className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
            <button
              id="tab-btn-converter"
              onClick={() => setActiveTab("converter")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "converter"
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <FileText className="w-4 h-4" />
              Batch Link-Converter
            </button>
            <button
              id="tab-btn-script"
              onClick={() => setActiveTab("script")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "script"
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <FileCode className="w-4 h-4" />
              Tampermonkey Script
            </button>
            <button
              id="tab-btn-tutorial"
              onClick={() => setActiveTab("tutorial")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "tutorial"
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Info className="w-4 h-4" />
              Motrix Anleitung
            </button>
            <button
              id="tab-btn-uploader"
              onClick={() => setActiveTab("uploader")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "uploader"
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Upload className="w-4 h-4" />
              Datei-Upload
            </button>
            <button
              id="tab-btn-manager"
              onClick={() => setActiveTab("manager")}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === "manager"
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Folder className="w-4 h-4" />
              Dateimanager (API)
            </button>
          </nav>
        </div>
      </header>

      {/* Hauptbereich */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Info-Balken über Motrix-Kompatibilität */}
        <div className="mb-8 bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-sm">
          <div className="flex gap-3.5 items-start">
            <div className="bg-sky-500/10 p-2 rounded-xl border border-sky-500/20 text-sky-400 shrink-0 mt-0.5">
              <Cpu className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-sky-400">
                Warum kann Matrix die Links nicht verarbeiten, Motrix aber schon?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1 max-w-3xl">
                Standardmäßige Buzzheavier-Links (z. B. <code className="text-indigo-300 font-mono text-xs">/f/xyz</code>) sind HTML-Webseiten mit Buttons und Werbe-Overlays. Ein Download-Manager wie <strong>Motrix</strong> benötigt jedoch den direkten Datei-Stream (<code className="text-emerald-300 font-mono text-xs">/d/xyz</code>) oder einen authentifizierten Tokenized-CDN-Stream (<code className="text-indigo-400 font-mono text-xs">ts.buzzheavier.com/d/xyz?v=...</code>). Unsere App konvertiert deine Links automatisch und stellt dir ein passendes Userscript zur Verfügung!
              </p>
            </div>
          </div>
          <button 
            id="quick-learn-more"
            onClick={() => setActiveTab("tutorial")}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 shrink-0 border border-slate-800 hover:border-slate-700 bg-slate-950/40 px-3.5 py-2 rounded-xl transition"
          >
            Anleitung lesen
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* TAB 1: BATCH LINK-CONVERTER */}
        {activeTab === "converter" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="converter-tab-content">
            
            {/* Link-Eingabebereich (Linke Spalte / 5 Spalten breit) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Box 1: Einzelnen Link hinzufügen */}
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-5 backdrop-blur-sm">
                <h2 className="font-bold text-sm text-slate-200 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-400" />
                  Einzelnen Link hinzufügen
                </h2>
                <form onSubmit={handleAddSingleLink} className="flex gap-2">
                  <input
                    type="text"
                    id="single-link-input"
                    value={singleLinkInput}
                    onChange={(e) => setSingleLinkInput(e.target.value)}
                    placeholder="Einfügen: ID oder https://buzzheavier.com/..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-sky-500 text-slate-100 placeholder:text-slate-500 font-mono"
                  />
                  <button
                    type="submit"
                    id="single-link-add-btn"
                    className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
                  >
                    Hinzufügen
                  </button>
                </form>
              </div>

              {/* Box 2: Batch Paste Textarea */}
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-5 flex-1 flex flex-col backdrop-blur-sm min-h-[380px]">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-sm text-slate-200 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    Batch Link-Paste ({links.length} geladen)
                  </h2>
                  {inputText && (
                    <button
                      id="clear-all-links-btn"
                      onClick={handleClearAll}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Leeren
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Füge hier beliebig viele Buzzheavier-Links untereinander ein. Wir filtern automatisch die IDs heraus und generieren die passenden Direktlinks.
                </p>
                <textarea
                  id="batch-links-textarea"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Füge deine Links hier zeilenweise ein..."
                  className="flex-1 w-full bg-slate-950 border border-slate-800/80 rounded-xl p-4 text-xs font-mono focus:outline-none focus:border-indigo-500 text-slate-300 placeholder:text-slate-600 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Link-Ergebnisliste (Rechte Spalte / 7 Spalten breit) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col flex-1 backdrop-blur-sm">
                
                {/* Header Aktionen */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="font-extrabold text-base text-slate-200 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-sky-400" />
                      Konvertierte Direktlinks
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Kopiere die Direktlinks direkt in die Zwischenablage für Motrix.
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-slate-400">Tampermonkey-Bypass:</span>
                      {isHelperActive ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          AKTIV (Hintergrund-Bypass)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20" title="Installiere das Tampermonkey-Skript (Reiter 'Tampermonkey Script'), um alle Links automatisch im Hintergrund aufzulösen.">
                          INAKTIV (Kein Hintergrund-Bypass)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {links.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={resolveAllOnline}
                        disabled={resolvingIds.length > 0}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Ruft die Links über unseren Server ab. Bei Cloudflare-Fehlern wird ein Standard-Fallback erstellt."
                      >
                        <Globe className="w-3.5 h-3.5" />
                        {resolvingIds.length > 0 ? "Löse auf..." : "Online abrufen (Bypass)"}
                      </button>
                      <button
                        onClick={resolveAllWithTampermonkey}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-600/10"
                        title="Öffnet ungelöste Links kurz in neuen Tabs, um die echten Tokens via Tampermonkey abzufangen. Schließt die Tabs automatisch wieder."
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Tampermonkey-Bypass (1-Klick)
                      </button>
                      <button
                        id="copy-all-direct-btn"
                        onClick={handleCopyAllDirect}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                          isCopiedAll 
                            ? "bg-green-600 text-white" 
                            : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                        }`}
                      >
                        {isCopiedAll ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopiedAll ? "Kopiert!" : "Direktlinks kopieren"}
                      </button>
                      <button
                        id="download-txt-list-btn"
                        onClick={handleDownloadTxtList}
                        className="bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 border border-sky-500/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        TXT-Export
                      </button>
                    </div>
                  )}
                </div>

                {/* Wenn keine Links vorhanden sind */}
                {links.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
                    <div className="bg-slate-950 p-4 rounded-full border border-slate-800 text-slate-600 mb-4 animate-pulse">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-slate-400 text-sm">Keine gültigen Links geladen</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                      Gib auf der linken Seite Buzzheavier-URLs ein. Die konvertierten Direkt-Downloadlinks erscheinen dann sofort hier.
                    </p>
                  </div>
                ) : (
                  /* Liste der parsed Links */
                  <div className="flex flex-col gap-3 overflow-y-auto max-h-[500px] pr-1 stable-scrollbar">
                    {links.map((link, idx) => {
                      const resolved = resolvedLinksInfo[link.id];
                      const rawUrl = resolved?.directUrl || link.directUrl;
                      const hasRealToken = rawUrl.includes("v=");
                      const displayDirectUrl = hasRealToken ? rawUrl : link.originalUrl;
                      const displayFilename = resolved?.filename || link.filename;
                      const displaySize = resolved?.size || link.size;
                      const isResolving = resolvingIds.includes(link.id);

                      return (
                        <div 
                          key={link.id + "_" + idx}
                          className={`bg-slate-950/60 p-4 rounded-xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                            hasRealToken ? "border-emerald-500/30 hover:border-emerald-500/50" : "border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex gap-3 items-start sm:items-center min-w-0 flex-1">
                            {/* Extension Icon */}
                            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 group-hover:border-slate-700 transition shrink-0">
                              {getFileIconByExtension(link.extension)}
                            </div>
                            
                            <div className="min-w-0 flex-1">
                              {/* Dateiname */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-slate-200 truncate max-w-[200px] sm:max-w-xs block group-hover:text-sky-300 transition">
                                  {displayFilename}
                                </span>
                                <span className="bg-slate-900 text-slate-400 border border-slate-800 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0">
                                  {link.extension}
                                </span>
                                {hasRealToken && (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 animate-pulse">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    TOKEN GELADEN
                                  </span>
                                )}
                                {resolved?.isFallback && !hasRealToken && (
                                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0" title="Der Link wurde als Fallback geladen, aber das Sicherheitstoken fehlt noch. Nutze die Tampermonkey 1-Klick-Lösung!">
                                    <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                                    BYPASS AUSSTEHEND
                                  </span>
                                )}
                              </div>
                              
                              {/* Metadaten */}
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                                <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  ID: {link.id}
                                </span>
                                <span>•</span>
                                <span>{displaySize}</span>
                              </div>
                            </div>
                          </div>

                          {/* Aktionen pro Zeile */}
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-none border-slate-800/60">
                            {/* Token Online abrufen Button */}
                            {!hasRealToken && (
                              <button
                                onClick={() => resolveLinkOnline(link.id, link.originalUrl)}
                                disabled={isResolving}
                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border flex items-center gap-1 transition ${
                                  isResolving 
                                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed" 
                                    : "bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/40"
                                }`}
                              >
                                {isResolving ? (
                                  <>
                                    <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                                    Lädt...
                                  </>
                                ) : (
                                  <>
                                    <Globe className="w-3 h-3 text-indigo-400" />
                                    Token abrufen (Online)
                                  </>
                                )}
                              </button>
                            )}

                            {/* Kopier-Button */}
                            <button
                              id={`copy-single-btn-${link.id}`}
                              onClick={() => {
                                navigator.clipboard.writeText(displayDirectUrl);
                                triggerNotification(`Direktlink für ${displayFilename} kopiert!`);
                              }}
                              title="Direktlink kopieren"
                              className="bg-slate-900 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-800 hover:border-slate-700 transition flex items-center justify-center text-xs gap-1.5 w-full sm:w-auto px-3 sm:px-2"
                            >
                              <Copy className="w-3.5 h-3.5 text-sky-400" />
                              <span className="sm:hidden font-semibold">Link kopieren</span>
                            </button>
                            
                            {/* An Motrix senden Button */}
                            <button
                              onClick={() => sendSingleToMotrix(link.id, displayDirectUrl, displayFilename)}
                              disabled={sendingMotrixIds.includes(link.id)}
                              title="An Motrix Next senden"
                              className={`bg-slate-900 hover:bg-slate-800 text-slate-300 p-2 rounded-lg border border-slate-800 hover:border-slate-700 transition flex items-center justify-center text-xs gap-1.5 w-full sm:w-auto px-3 sm:px-2 ${
                                sendingMotrixIds.includes(link.id) ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                            >
                              {sendingMotrixIds.includes(link.id) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
                              ) : (
                                <Send className="w-3.5 h-3.5 text-purple-400" />
                              )}
                              <span className="sm:hidden font-semibold">An Motrix Next</span>
                            </button>
                            
                            {/* Test-Download Button */}
                            <a
                              href={displayDirectUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={hasRealToken ? "Direkt-Download starten" : "Landingpage öffnen (Sicherheitstoken via Tampermonkey holen)"}
                              className={`p-2 rounded-lg transition flex items-center justify-center text-xs gap-1.5 w-full sm:w-auto px-3 sm:px-2 ${
                                hasRealToken 
                                  ? "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/20" 
                                  : "bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/20"
                              }`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span className="sm:hidden font-semibold">
                                {hasRealToken ? "Direkt-Download" : "Landingpage"}
                              </span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Motrix Batch Paste Generator */}
                {links.length > 0 && (
                  <div className="mt-6 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-emerald-400" />
                        Schneller Import für Motrix
                      </h3>
                      {unresolvedCount > 0 ? (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold animate-pulse flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          LÖSE {unresolvedCount} LINK(S) IM HINTERGRUND AUF...
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" />
                          ALLE BEREIT (BYPASS AKTIV)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                      Kopiere diese Linkliste direkt und füge sie in Motrix über das <strong className="text-slate-200">"+" Symbol (Neue Aufgabe)</strong> ein. Motrix wird alle Dateien gleichzeitig mit maximaler Geschwindigkeit herunterladen.
                    </p>

                    {unresolvedCount > 0 && (
                      <div className="mb-3 bg-amber-500/5 border border-amber-500/25 text-amber-300 p-3 rounded-lg text-[11px] leading-relaxed flex flex-col gap-2 shadow-inner">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong>Achtung:</strong> Es werden noch {unresolvedCount} Link(s) aufgelöst. Falls Chrome oder Cloudflare die Hintergrund-Auflösung blockiert, kannst du die Links über Tab-Popups erzwingen:
                          </div>
                        </div>
                        <div className="pl-6">
                          <button
                            onClick={resolveAllWithTampermonkey}
                            className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-bold px-3 py-1 rounded text-[10px] transition flex items-center gap-1 shadow"
                          >
                            <Sparkles className="w-3 h-3" />
                            Erzwinge Auflösung via Tab-Popups ({unresolvedCount} Links)
                          </button>
                        </div>
                      </div>
                    )}

                    {fallbackCount > 0 && unresolvedCount === 0 && (
                      <div className="mb-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 p-3 rounded-lg text-[11px] leading-relaxed flex flex-col gap-2 shadow-inner">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <strong>Cloudflare-Bypass Aktiviert:</strong> Wir haben {fallbackCount} Link(s) konvertiert, aber das **Sicherheitstoken (v=)** wurde durch Cloudflare auf unserem Server blockiert.
                          </div>
                        </div>
                        <div className="pl-6">
                          <p className="text-slate-300">
                            Nutze das Tampermonkey-Skript, um alle Tokens automatisch im Hintergrund mit 1 Klick abzufangen:
                          </p>
                          <button
                            onClick={resolveAllWithTampermonkey}
                            className="mt-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold px-3 py-1 rounded text-[10px] transition flex items-center gap-1 shadow"
                          >
                            <Sparkles className="w-3 h-3" />
                            Tokens via Tampermonkey laden (1-Klick)
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <pre className="bg-slate-900 p-3 rounded-lg text-[10px] font-mono text-slate-300 overflow-x-auto max-h-32 border border-slate-800">
                        {links.map(l => {
                          const url = resolvedLinksInfo[l.id]?.directUrl || l.directUrl;
                          return url.includes("v=") ? url : l.originalUrl;
                        }).join("\n")}
                      </pre>
                      <button
                        id="send-motrix-batch-btn"
                        onClick={sendAllToMotrix}
                        disabled={unresolvedCount > 0 || isSendingAllMotrix}
                        className={`absolute right-24 top-2 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                          isSendingAllMotrix 
                            ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed" 
                            : unresolvedCount > 0
                            ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                            : "bg-purple-600 hover:bg-purple-700 text-white border border-purple-500"
                        }`}
                      >
                        {isSendingAllMotrix ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        {isSendingAllMotrix ? "Sende..." : "An Motrix Next senden"}
                      </button>
                      <button
                        id="copy-motrix-batch-btn"
                        onClick={handleCopyMotrixTextList}
                        disabled={unresolvedCount > 0}
                        className={`absolute right-2 top-2 px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                          isCopiedMotrixList 
                            ? "bg-green-600 text-white" 
                            : unresolvedCount > 0
                            ? "bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed"
                            : "bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700"
                        }`}
                      >
                        {isCopiedMotrixList ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {unresolvedCount > 0 ? "Warten..." : "Kopieren"}
                      </button>
                    </div>

                    {/* Debug Logs Panel */}
                    <div className="mt-4 border-t border-slate-850 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          Tampermonkey Debug-Konsole
                        </span>
                        {debugLogs.length > 0 && (
                          <button
                            onClick={() => setDebugLogs([])}
                            className="text-[9px] text-slate-500 hover:text-slate-300 font-bold"
                          >
                            Logs leeren
                          </button>
                        )}
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-900 max-h-32 overflow-y-auto text-[9px] font-mono text-slate-450 leading-normal space-y-1">
                        {debugLogs.length === 0 ? (
                          <span className="text-slate-600 italic">Keine Log-Ausgaben vorhanden. Warte auf Skript-Bereitschaft...</span>
                        ) : (
                          debugLogs.map((log, idx) => (
                            <div key={idx} className="border-b border-slate-900/50 pb-0.5 last:border-0 truncate">
                              {log}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: TAMPERMONKEY SCRIPT BUILDER */}
        {activeTab === "script" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="script-tab-content">
            
            {/* Konfigurator-Einstellungsleiste (Links) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sliders className="w-5 h-5 text-sky-400" />
                    <h2 className="font-extrabold text-base text-slate-200">
                      Script konfigurieren
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Passe das Verhalten des Tampermonkey-Skripts an deine persönlichen Download-Präferenzen an. Der Code aktualisiert sich sofort in Echtzeit.
                  </p>

                  <div className="flex flex-col gap-5">
                    
                    {/* Scriptname */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">
                        Skript-Name im Browser
                      </label>
                      <input
                        type="text"
                        value={scriptConfig.scriptName}
                        onChange={(e) => setScriptConfig({ ...scriptConfig, scriptName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-sky-500 text-slate-200"
                      />
                    </div>

                    {/* Checkboxen */}
                    <div className="border-t border-slate-800/80 pt-4 flex flex-col gap-4">
                      
                      {/* Auto Copy */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scriptConfig.copyToClipboard}
                          onChange={(e) => setScriptConfig({ ...scriptConfig, copyToClipboard: e.target.checked })}
                          className="mt-0.5 accent-sky-500 rounded text-sky-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition flex items-center gap-1.5">
                            Auto-Kopieren für Motrix
                            <span className="bg-emerald-950 text-emerald-400 text-[9px] px-1 rounded border border-emerald-800">Empfohlen</span>
                          </span>
                          <span className="block text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            Kopiert den direkten Token-Downloadlink beim Laden der Seite automatisch in deine Zwischenablage, damit du ihn sofort in Motrix einfügen kannst.
                          </span>
                        </div>
                      </label>

                      {/* Embed Player */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scriptConfig.embedPlayer}
                          onChange={(e) => setScriptConfig({ ...scriptConfig, embedPlayer: e.target.checked })}
                          className="mt-0.5 accent-sky-500 rounded text-sky-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">
                            Direkten Media-Streaming-Player einbetten
                          </span>
                          <span className="block text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            Bettet bei Audio- (MP3, WAV) oder Videodateien (MP4, MKV) sofort einen HTML5 Player ein, um Medien direkt ohne Download zu streamen.
                          </span>
                        </div>
                      </label>

                      {/* Custom Dark Theme */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scriptConfig.customDarkTheme}
                          onChange={(e) => setScriptConfig({ ...scriptConfig, customDarkTheme: e.target.checked })}
                          className="mt-0.5 accent-sky-500 rounded text-sky-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">
                            Premium Dark Theme für Buzzheavier
                          </span>
                          <span className="block text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            Ersetzt das helle Buzzheavier-Design durch ein augenschonendes Premium-Darkmode-Layout mit optimierten Kontrasten.
                          </span>
                        </div>
                      </label>

                      {/* Adblock warning hider */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scriptConfig.hideAdblockWarning}
                          onChange={(e) => setScriptConfig({ ...scriptConfig, hideAdblockWarning: e.target.checked })}
                          className="mt-0.5 accent-sky-500 rounded text-sky-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">
                            Anti-Adblocker Warnungen entfernen
                          </span>
                          <span className="block text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            Sucht nach störenden Warnhinweisen oder Overlays und blockiert diese im Hintergrund, um Interaktionen nicht zu behindern.
                          </span>
                        </div>
                      </label>

                      {/* Auto Click */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scriptConfig.autoClick}
                          onChange={(e) => setScriptConfig({ ...scriptConfig, autoClick: e.target.checked })}
                          className="mt-0.5 accent-sky-500 rounded text-sky-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">
                            Automatischer Download-Start (Auto-Click)
                          </span>
                          <span className="block text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            Klickt die Download-Schaltfläche auf der Seite automatisch nach einer einstellbaren Verzögerung an.
                          </span>
                        </div>
                      </label>

                      {/* Auto click delay */}
                      {scriptConfig.autoClick && (
                        <div className="pl-6 flex items-center gap-3">
                          <label className="text-xs text-slate-300 whitespace-nowrap">Verzögerung:</label>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={scriptConfig.autoClickDelay}
                            onChange={(e) => setScriptConfig({ ...scriptConfig, autoClickDelay: parseInt(e.target.value) })}
                            className="flex-1 accent-sky-500"
                          />
                          <span className="bg-slate-950 border border-slate-800 text-[11px] font-bold px-2 py-0.5 rounded text-sky-400 min-w-[40px] text-center font-mono">
                            {scriptConfig.autoClickDelay}s
                          </span>
                        </div>
                      )}

                      {/* Auto Redirect */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scriptConfig.autoRedirect}
                          onChange={(e) => setScriptConfig({ ...scriptConfig, autoRedirect: e.target.checked })}
                          className="mt-0.5 accent-sky-500 rounded text-sky-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">
                            Direkt-Umleitung sofort starten (Bypass Landingpage)
                          </span>
                          <span className="block text-[11px] text-slate-400 leading-relaxed mt-0.5 text-rose-300/90">
                            Leitet die Seite sofort beim Aufruf von <code className="text-[10px] text-white">/f/</code> direkt nach <code className="text-[10px] text-white">/d/</code> um. Nutze dies, wenn du absolut keine Interaktion mit der Webseite wünschst.
                          </span>
                        </div>
                      </label>

                      {/* Desktop Notifications */}
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={scriptConfig.showNotification}
                          onChange={(e) => setScriptConfig({ ...scriptConfig, showNotification: e.target.checked })}
                          className="mt-0.5 accent-sky-500 rounded text-sky-500"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">
                            Erfolgsmeldung im Browser einblenden (Desktop-Benachrichtigung)
                          </span>
                          <span className="block text-[11px] text-slate-400 leading-relaxed mt-0.5">
                            Zeigt eine kleine unaufdringliche Systembenachrichtigung, sobald der Direktlink kopiert oder der Download gestartet wurde.
                          </span>
                        </div>
                      </label>
                      
                      {/* Motrix Next Integration Settings */}
                      <div className="border-t border-slate-800/60 my-4 pt-4">
                        <h4 className="text-xs font-bold text-sky-400 mb-3 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5" /> Motrix Next RPC Einstellungen
                        </h4>
                        
                        <label className="flex items-start gap-3 cursor-pointer group mb-3">
                          <input
                            type="checkbox"
                            checked={scriptConfig.sendToMotrix}
                            onChange={(e) => setScriptConfig({ ...scriptConfig, sendToMotrix: e.target.checked })}
                            className="mt-0.5 accent-sky-500 rounded text-sky-500"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-200 group-hover:text-sky-300 transition">
                              Downloads automatisch an Motrix Next senden (1-Klick)
                            </span>
                            <span className="block text-[11px] text-slate-400 leading-relaxed mt-0.5">
                              Das Userscript sendet den resolved Link auf der Buzzheavier-Seite automatisch direkt an deine geöffnete Motrix Next App.
                            </span>
                          </div>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Motrix RPC-Server URL
                            </label>
                            <input
                              type="text"
                              value={scriptConfig.motrixRpcUrl}
                              onChange={(e) => setScriptConfig({ ...scriptConfig, motrixRpcUrl: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-sky-300 outline-none focus:border-sky-500 transition"
                              placeholder="http://localhost:16800/jsonrpc"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              RPC Secret (optional)
                            </label>
                            <input
                              type="password"
                              value={scriptConfig.motrixSecret}
                              onChange={(e) => setScriptConfig({ ...scriptConfig, motrixSecret: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs text-sky-300 outline-none focus:border-sky-500 transition"
                              placeholder="Geheimschlüssel"
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800 flex flex-col gap-3">
                  <div className="flex gap-2 items-start text-xs text-slate-400">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <span>Das Skript wurde speziell entwickelt, um Tokenized URLs mit hoher Geschwindigkeit abzufangen und für Motrix bereitzustellen.</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Code Vorschau & Download (Rechts) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col flex-1 backdrop-blur-sm">
                
                {/* Header mit Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="font-extrabold text-base text-slate-200 flex items-center gap-2">
                      <FileCode className="w-5 h-5 text-indigo-400" />
                      Userscript-Code ({scriptConfig.scriptName ? "Individuell" : "Standard"})
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Kopiere oder installiere den Code direkt in deine Tampermonkey Erweiterung.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      id="copy-script-code-btn"
                      onClick={handleCopyScript}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        copiedScript 
                          ? "bg-green-600 text-white" 
                          : "bg-slate-800 hover:bg-slate-700 text-slate-200"
                      }`}
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedScript ? "Kopiert!" : "Code kopieren"}
                    </button>
                    <button
                      id="install-script-btn"
                      onClick={handleDownloadScriptFile}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-indigo-600/15"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Als Datei laden (.user.js)
                    </button>
                  </div>
                </div>

                {/* Code-Editor Box */}
                <div className="flex-1 min-h-[420px] bg-slate-950 rounded-xl border border-slate-800/80 p-4 font-mono text-xs overflow-auto max-h-[550px] relative text-slate-300 leading-relaxed">
                  <div className="absolute right-4 top-4 text-[10px] text-slate-500 font-bold bg-slate-900 border border-slate-800 px-2 py-0.5 rounded select-none uppercase tracking-wider">
                    Javascript (ES6)
                  </div>
                  <pre>{generatedCode}</pre>
                </div>

                {/* Installationshilfe */}
                <div className="mt-5 bg-indigo-950/20 border border-indigo-500/10 p-4 rounded-xl flex gap-3">
                  <div className="text-indigo-400 shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Wie installiere ich das in Tampermonkey?</h4>
                    <ol className="text-[11px] text-slate-300 list-decimal list-inside space-y-1.5 mt-2 leading-relaxed">
                      <li>Klicke oben auf <strong className="text-slate-100">"Code kopieren"</strong>.</li>
                      <li>Öffne dein <strong className="text-slate-100">Tampermonkey Dashboard</strong> im Browser.</li>
                      <li>Klicke auf das <strong className="text-slate-100">"+" Symbol</strong> (Neues Skript hinzufügen).</li>
                      <li>Lösche den standardmäßigen Vorlagencode und füge diesen hier ein.</li>
                      <li>Drücke <kbd className="bg-slate-800 px-1 rounded text-slate-300 text-[10px]">Strg + S</kbd> (bzw. <kbd className="bg-slate-800 px-1 rounded text-slate-300 text-[10px]">Cmd + S</kbd> auf dem Mac) zum Speichern. Fertig!</li>
                    </ol>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 3: MOTRIX INSTRUCTIONS & HELP */}
        {activeTab === "tutorial" && (
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-8 max-w-4xl mx-auto backdrop-blur-sm animate-fade-in" id="tutorial-tab-content">
            
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
              <div className="bg-sky-500/10 p-2.5 rounded-xl text-sky-400 border border-sky-500/20">
                <Info className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-100">
                  Motrix & Buzzheavier Download-Anleitung
                </h2>
                <p className="text-xs text-slate-400">
                  Schritt-für-Schritt Einrichtung für reibungsloses Herunterladen mit Multi-Threading
                </p>
              </div>
            </div>

            <div className="space-y-8">
              
              {/* Sektion 1: Das Problem */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="bg-rose-500/10 text-rose-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border border-rose-500/20">1</span>
                  Das Problem mit standardmäßigen Links
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Buzzheavier-Links in der Form <code className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[11px] font-mono text-rose-300">https://buzzheavier.com/5y571e4t6ldw</code> sind landing pages. Download-Manager wie <strong>Motrix</strong> verstehen diese Links nicht direkt, da sie versuchen, das HTML-Dokument der Webseite herunterzuladen, anstatt den eigentlichen Datei-Stream.
                </p>
              </div>

              {/* Sektion 2: Die Lösung */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="bg-sky-500/10 text-sky-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border border-sky-500/20">2</span>
                  Die Lösung: Direkt-Download-URLs
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Um die Datei mit voller Bandbreite herunterzuladen, muss die URL in ein direktes Download-Format umgewandelt werden:
                </p>
                <div className="pl-8 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">Standard-Link (Funktioniert nicht in Motrix)</span>
                    <code className="text-xs text-slate-400 font-mono break-all">https://buzzheavier.com/5y571e4t6ldw</code>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Konvertierter Direktlink (Perfekt für Motrix)</span>
                    <code className="text-xs text-sky-300 font-mono break-all">https://buzzheavier.com/d/5y571e4t6ldw</code>
                  </div>
                </div>
              </div>

              {/* Sektion 3: Tampermonkey Script */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="bg-indigo-500/10 text-indigo-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border border-indigo-500/20">3</span>
                  Wie das Tampermonkey Script hilft
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Wenn du einen Link im Browser anklickst, fängt das installierte <strong>Tampermonkey-Skript</strong> im Hintergrund automatisch den verschlüsselten Download-Token ab. Es öffnet ein schickes schwebendes Widget auf der Buzzheavier-Seite und:
                </p>
                <ul className="text-xs text-slate-300 list-disc list-inside space-y-1.5 pl-12 leading-relaxed">
                  <li>Extrahiert den direkten CDN-Server-Stream: <code className="text-indigo-300 font-mono text-[10px]">ts.buzzheavier.com/d/6x5m50zxwssn?v=...</code></li>
                  <li>Kopiert diesen Link mit dem Sicherheits-Token <strong className="text-slate-200">sofort automatisch in deine Zwischenablage</strong>.</li>
                  <li>In Motrix brauchst du nur noch auf <strong className="text-slate-100">"+"</strong> zu drücken und der Link ist bereits eingefügt und startbereit!</li>
                </ul>
              </div>

              {/* Sektion 4: Motrix Best Practices */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <span className="bg-emerald-500/10 text-emerald-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border border-emerald-500/20">4</span>
                  Motrix Konfiguration für maximale Download-Geschwindigkeit
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed pl-8">
                  Um die volle Bandbreite aus den Buzzheavier CDN-Servern herauszuholen, nimm folgende Einstellungen in Motrix vor:
                </p>
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 ml-8 space-y-3 text-xs text-slate-300">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="font-semibold">Maximale gleichzeitige Downloads:</span>
                    <span className="text-sky-400 font-mono font-bold">5 - 10</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-900">
                    <span className="font-semibold">Maximale Verbindungen pro Server (Splits):</span>
                    <span className="text-sky-400 font-mono font-bold">16 bis 64 (Maximiert die Geschwindigkeit)</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="font-semibold">User-Agent (falls Downloads abbrechen):</span>
                    <span className="text-sky-400 font-mono font-bold">Mozilla/5.0 (Standard)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Weiterleitungs-Button zurück zum Tool */}
            <div className="mt-10 pt-6 border-t border-slate-800 flex justify-end">
              <button
                id="back-to-converter-btn"
                onClick={() => setActiveTab("converter")}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs hover:from-sky-400 hover:to-indigo-500 transition shadow-lg shadow-sky-500/10 flex items-center gap-2"
              >
                Zurück zum Link-Converter
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* TAB 4: DATEI-UPLOAD */}
        {activeTab === "uploader" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in" id="uploader-tab-content">
            {/* Left Col: Upload Settings */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-sky-400" />
                  <h2 className="font-extrabold text-base text-slate-200">Upload-Optionen</h2>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Wähle aus, ob du anonym (30 Tage Gültigkeit) oder direkt in deinen Buzzheavier Account hochladen möchtest.
                </p>

                <div className="space-y-5">
                  {/* Mode Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">Upload-Typ</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setUploadType("anonymous")}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition ${
                          uploadType === "anonymous"
                            ? "bg-sky-600/20 border-sky-500 text-sky-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        Anonym (Kein Account)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadType("authenticated");
                          if (!accountId.trim()) {
                            triggerNotification("Bitte gib zuerst ein Account ID-Token an!");
                          }
                        }}
                        className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition ${
                          uploadType === "authenticated"
                            ? "bg-sky-600/20 border-sky-500 text-sky-300"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                        }`}
                      >
                        Eigener Account
                      </button>
                    </div>
                  </div>

                  {/* Account Token (only if authenticated or expandable) */}
                  {uploadType === "authenticated" && (
                    <div className="animate-fade-in space-y-4 border-t border-slate-800/60 pt-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">
                          Account ID-Token (Bearer)
                        </label>
                        <input
                          type="password"
                          placeholder="Dein Buzzheavier API Key / Token"
                          value={accountId}
                          onChange={(e) => setAccountId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-sky-500 text-slate-200 font-mono"
                        />
                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                          Finde deinen Token in den Profileinstellungen auf Buzzheavier.com
                        </p>
                      </div>

                      {/* Parent Folder ID */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">
                          Ziel-Ordner ID (Optional)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="z.B. root oder Ordner-ID"
                            value={uploadParentId}
                            onChange={(e) => setUploadParentId(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-sky-500 text-slate-200 font-mono"
                          />
                          {dirContents.length > 0 && currentFolderId !== "root" && (
                            <button
                              type="button"
                              onClick={() => {
                                setUploadParentId(currentFolderId);
                                triggerNotification(`Ordner ID auf "${currentFolderId}" gesetzt!`);
                              }}
                              className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                              title="Aktuellen Ordner aus dem Manager verwenden"
                            >
                              Aktueller
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Storage Location Selector */}
                  {locations.length > 0 && (
                    <div className="border-t border-slate-800/60 pt-4">
                      <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">
                        Speicherort (Location)
                      </label>
                      <select
                        value={uploadLocationId}
                        onChange={(e) => setUploadLocationId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-sky-500 text-slate-200"
                      >
                        <option value="">Standard (Bester Server)</option>
                        {locations.map((loc: any) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name || loc.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Note input */}
                  <div className="border-t border-slate-800/60 pt-4">
                    <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide">
                      Datei-Notiz (Note - Optional)
                    </label>
                    <textarea
                      placeholder="Füge hier eine Beschreibung oder Tags für deine Datei hinzu..."
                      value={uploadNote}
                      onChange={(e) => setUploadNote(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-sky-500 text-slate-200 resize-none leading-relaxed"
                    />
                  </div>

                </div>
              </div>
            </div>

            {/* Right Col: Drag & Drop Zone + Status */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <form onSubmit={handleUploadFile} className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 flex flex-col flex-1 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-800">
                  <Upload className="w-5 h-5 text-indigo-400" />
                  <h2 className="font-extrabold text-base text-slate-200">Datei auswählen</h2>
                </div>

                {/* Drag & Drop Card */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setUploadFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className="flex-1 min-h-[220px] bg-slate-950/60 rounded-xl border-2 border-dashed border-slate-800 hover:border-sky-500/50 transition duration-200 flex flex-col items-center justify-center p-6 text-center cursor-pointer relative"
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                >
                  <input
                    type="file"
                    id="file-upload-input"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="bg-sky-500/10 p-4 rounded-full text-sky-400 border border-sky-500/20 mb-4">
                    <Upload className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-200">
                    {uploadFile ? uploadFile.name : "Klicke oder ziehe eine Datei hierher"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-sm">
                    {uploadFile 
                      ? `${(uploadFile.size / 1024 / 1024).toFixed(2)} MB • Bereit für Upload` 
                      : "Unterstützt alle Dateitypen und Dateigrößen. Uploads werden direkt zum schnellen CDN übertragen."}
                  </p>
                </div>

                {/* Upload Progress bar */}
                {isUploading && (
                  <div className="mt-6 bg-slate-950 border border-slate-800 p-4 rounded-xl animate-pulse">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-sky-400 animate-spin" />
                        Übertrage Datei...
                      </span>
                      <span className="text-xs font-mono font-bold text-sky-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800">
                      <div 
                        className="bg-gradient-to-r from-sky-500 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Upload Success Panel */}
                {uploadSuccessUrl && (
                  <div className="mt-6 bg-emerald-950/20 border border-emerald-500/20 p-5 rounded-xl animate-fade-in space-y-4">
                    <div className="flex gap-2 text-emerald-400">
                      <Check className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Erfolgreich hochgeladen!</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono break-all">{uploadSuccessFilename}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* Standard landing page link */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Standard-Link (Webseite)</span>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <code className="text-[11px] text-sky-400 font-mono break-all">{uploadSuccessUrl}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(uploadSuccessUrl);
                              triggerNotification("Standard-Link kopiert!");
                            }}
                            className="bg-slate-900 p-1 rounded border border-slate-800 text-slate-400 hover:text-slate-200 shrink-0"
                            title="Kopieren"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Direct link for Motrix */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Direktlink (für Motrix)</span>
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <code className="text-[11px] text-emerald-300 font-mono break-all">{uploadSuccessDirectUrl}</code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(uploadSuccessDirectUrl);
                              triggerNotification("Direkt-Downloadlink kopiert!");
                            }}
                            className="bg-slate-900 p-1 rounded border border-slate-800 text-emerald-400 hover:text-emerald-300 shrink-0"
                            title="Kopieren"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer submit button */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUploading || !uploadFile}
                    className={`font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 transition ${
                      isUploading || !uploadFile
                        ? "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed"
                        : "bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/10"
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    {isUploading ? "Wird hochgeladen..." : "Hochladen starten"}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* TAB 5: DATEIMANAGER (API) */}
        {activeTab === "manager" && (
          <div className="space-y-6 animate-fade-in" id="manager-tab-content">
            
            {/* Top Bar with Account Token Setup */}
            <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="font-extrabold text-base text-slate-200 flex items-center gap-2">
                    <Folder className="w-5 h-5 text-sky-400" />
                    Buzzheavier Dateimanager (FS API)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Verwalte, erstelle, verschiebe oder lösche deine Ordner und Dateien direkt über die offizielle API.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <div className="relative flex-1 sm:min-w-[300px]">
                    <input
                      type="password"
                      placeholder="Dein Buzzheavier Account-ID Token..."
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-sky-500 text-slate-200 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (accountId.trim()) {
                        fetchDirectoryContents("root");
                        fetchAccountInfo();
                        fetchLocations();
                        triggerNotification("Daten vom Server aktualisiert!");
                      } else {
                        triggerNotification("Bitte gib zuerst einen Token ein!");
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold px-4 py-2.5 rounded-xl text-xs transition whitespace-nowrap"
                  >
                    Verbinden / Aktualisieren
                  </button>
                </div>
              </div>

              {/* Account Information Banner if logged in */}
              {accountInfo && (
                <div className="mt-4 bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-950 text-emerald-400 border border-emerald-800/60 p-2 rounded-xl">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="block font-bold text-slate-300">Account: {accountInfo.username || "Registrierter Benutzer"}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">ID: {accountInfo.id || "Unbekannt"}</span>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold">Geparkter Speicherplatz</span>
                      <span className="block font-bold text-slate-300 mt-0.5">
                        {accountInfo.storageUsed ? formatSize(accountInfo.storageUsed) : "Unbekannt"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500 uppercase font-semibold">Dateianzahl</span>
                      <span className="block font-bold text-slate-300 mt-0.5">{accountInfo.fileCount || 0} Dateien</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main File Manager Workspace */}
            {!accountId.trim() ? (
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-12 text-center max-w-xl mx-auto">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-slate-400 mb-4">
                  <FolderOpen className="w-6 h-6 text-sky-400 animate-pulse" />
                </div>
                <h3 className="font-bold text-slate-200 text-sm">Dateimanager ist gesperrt</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Bitte gib oben dein <strong className="text-slate-300">Buzzheavier Account-ID Token</strong> ein, um auf deine Cloud-Dateien zuzugreifen und diese in Echtzeit zu strukturieren.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/40 rounded-2xl border border-slate-800/80 p-6 backdrop-blur-sm space-y-6">
                
                {/* File manager Toolbar / Actionbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  {/* Breadcrumbs Navigation */}
                  <div className="flex items-center flex-wrap gap-1.5 text-xs font-semibold text-slate-300">
                    {folderHistory.map((folder, index) => (
                      <div key={folder.id} className="flex items-center gap-1.5">
                        {index > 0 && <span className="text-slate-600">/</span>}
                        <button
                          onClick={() => navigateToBreadcrumb(index)}
                          className={`hover:text-sky-400 transition ${
                            index === folderHistory.length - 1 ? "text-sky-400 font-extrabold" : ""
                          }`}
                        >
                          {folder.name}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Folder Inline Form */}
                  <form onSubmit={handleCreateFolder} className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Neuer Ordnername..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-sky-500 text-slate-200"
                    />
                    <button
                      type="submit"
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Ordner erstellen
                    </button>
                  </form>
                </div>

                {/* Inline Dialog overlays (Rename / Move / Note) if active */}
                {(renameItemId || moveItemId || fileNoteId) && (
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl animate-fade-in space-y-4">
                    {/* Rename Dialog */}
                    {renameItemId && (
                      <form onSubmit={handleRenameItem} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="text-xs font-bold text-slate-300 shrink-0">Element umbenennen:</div>
                        <input
                          type="text"
                          value={renameItemName}
                          onChange={(e) => setRenameItemName(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                        />
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => setRenameItemId(null)}
                            className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs"
                          >
                            Abbrechen
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-sky-600 text-white hover:bg-sky-500 rounded-lg text-xs font-bold"
                          >
                            Speichern
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Move Dialog */}
                    {moveItemId && (
                      <form onSubmit={handleMoveItem} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="text-xs font-bold text-slate-300 shrink-0">In neuen Ordner verschieben (ID eingeben):</div>
                        <input
                          type="text"
                          placeholder="z.B. root oder Ordner-ID"
                          value={moveTargetId}
                          onChange={(e) => setMoveTargetId(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
                        />
                        <div className="flex gap-2 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => setMoveItemId(null)}
                            className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs"
                          >
                            Abbrechen
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-sky-600 text-white hover:bg-sky-500 rounded-lg text-xs font-bold"
                          >
                            Verschieben
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Edit Note Dialog */}
                    {fileNoteId && (
                      <form onSubmit={handleSaveFileNote} className="space-y-3">
                        <div className="text-xs font-bold text-slate-300">Datei-Notiz bearbeiten:</div>
                        <textarea
                          rows={3}
                          value={fileNoteText}
                          onChange={(e) => setFileNoteText(e.target.value)}
                          placeholder="Füge eine Beschreibung hinzu..."
                          className="w-full bg-slate-900 border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-200"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setFileNoteId(null)}
                            className="px-3 py-1.5 bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs"
                          >
                            Abbrechen
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 bg-sky-600 text-white hover:bg-sky-500 rounded-lg text-xs font-bold"
                          >
                            Notiz speichern
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* File/Folder listing Grid or Table */}
                {isDirLoading ? (
                  <div className="py-12 text-center">
                    <Cpu className="w-8 h-8 text-sky-400 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Verzeichnisliste wird geladen...</p>
                  </div>
                ) : dirContents.length === 0 ? (
                  <div className="py-12 text-center bg-slate-950/30 rounded-xl border border-slate-800/60 border-dashed">
                    <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Dieser Ordner ist leer.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-extrabold">
                          <th className="pb-3 pl-2">Name</th>
                          <th className="pb-3 hidden md:table-cell">ID / Details</th>
                          <th className="pb-3">Größe</th>
                          <th className="pb-3 text-right pr-2">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {dirContents.map((item) => {
                          const isFolder = item.isDirectory;
                          const displayDirect = `https://buzzheavier.com/d/${item.id}`;

                          return (
                            <tr key={item.id} className="hover:bg-slate-800/20 transition group">
                              {/* Name column */}
                              <td className="py-3 pl-2">
                                <div className="flex items-center gap-2.5">
                                  {isFolder ? (
                                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                                  ) : (
                                    getFileIcon(item.name || "")
                                  )}
                                  
                                  <div className="min-w-0 max-w-[200px] sm:max-w-xs md:max-w-md">
                                    {isFolder ? (
                                      <button
                                        type="button"
                                        onClick={() => navigateToFolder(item.id, item.name)}
                                        className="font-bold text-slate-200 hover:text-sky-400 hover:underline text-left truncate block w-full"
                                      >
                                        {item.name}
                                      </button>
                                    ) : (
                                      <span className="font-semibold text-slate-300 truncate block">
                                        {item.name}
                                      </span>
                                    )}

                                    {/* Note display if exists */}
                                    {item.note && (
                                      <span className="block text-[10px] text-emerald-400/80 truncate font-mono mt-0.5">
                                        Note: {item.note}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* ID column */}
                              <td className="py-3 hidden md:table-cell font-mono text-[10px] text-slate-500">
                                <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 text-[9px] mr-2">
                                  {isFolder ? "FOLDER" : "FILE"}
                                </span>
                                {item.id}
                              </td>

                              {/* Size column */}
                              <td className="py-3 text-slate-400 font-medium font-mono">
                                {isFolder ? "Ordner" : formatSize(item.size || 0)}
                              </td>

                              {/* Actions column */}
                              <td className="py-3 text-right pr-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Download file */}
                                  {!isFolder && (
                                    <>
                                      <a
                                        href={displayDirect}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Direkt-Download"
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-sky-400 text-slate-400 rounded-lg border border-slate-700/50 transition"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(displayDirect);
                                          triggerNotification("Direkt-Downloadlink kopiert!");
                                        }}
                                        title="Direktlink kopieren"
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-sky-400 text-slate-400 rounded-lg border border-slate-700/50 transition"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFileNoteId(item.id);
                                          setFileNoteText(item.note || "");
                                        }}
                                        title="Notiz bearbeiten"
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 text-slate-400 rounded-lg border border-slate-700/50 transition"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}

                                  {/* Rename item */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRenameItemId(item.id);
                                      setRenameItemName(item.name || "");
                                    }}
                                    title="Umbenennen"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-yellow-400 text-slate-400 rounded-lg border border-slate-700/50 transition"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Move item */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMoveItemId(item.id);
                                      setMoveTargetId("");
                                    }}
                                    title="Verschieben"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-blue-400 text-slate-400 rounded-lg border border-slate-700/50 transition"
                                  >
                                    <Move className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete item */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(item.id, item.name || "Element")}
                                    title="Löschen"
                                    className="p-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-lg border border-slate-700/50 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* Fußzeile */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            Entwickelt für High-Speed Downloads • Keine Registrierung oder API-Keys benötigt.
          </p>
          <div className="flex items-center gap-1">
            <span>Optimiert für</span>
            <span className="text-slate-300 font-semibold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">Motrix</span>
            <span>&</span>
            <span className="text-slate-300 font-semibold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">Tampermonkey</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
