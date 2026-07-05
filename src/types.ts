export interface ScriptConfig {
  scriptName: string;
  autoRedirect: boolean; // Direct redirect from /f/ to /d/
  autoClick: boolean;    // Auto-click the download button if not redirected
  autoClickDelay: number; // Delay in seconds before auto-clicking
  copyToClipboard: boolean; // Auto-copy direct link on load
  embedPlayer: boolean;   // Embed media player for audio/video files
  customDarkTheme: boolean; // Apply premium dark mode to buzzheavier
  hideAdblockWarning: boolean; // Hide pesky anti-adblock modals
  showNotification: boolean;  // Show Tampermonkey notification on action
}

export interface BuzzLink {
  id: string;
  originalUrl: string;
  directUrl: string;
  filename: string;
  extension: string;
  size: string;
  isValid: boolean;
}
