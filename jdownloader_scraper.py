#!/usr/bin/env python3
"""
Buzzheavier Batch Link Scraper & JDownloader 2 Generator
---------------------------------------------------------
Extracts and generates all 5 link variants for JDownloader 2:
1. Standard Landing URL:   https://buzzheavier.com/{file_id}
2. Direct Storage CDN:     https://dd.buzzheavier.com/f/{file_id}
3. Short CDN URL:          https://buzzheavier.com/f/{file_id}
4. Download Token URL:     https://buzzheavier.com/{file_id}/download?t={token}
5. Alternative Mirror 2:   https://buzzheavier.com/{file_id}/download?t={token}&alt=true
"""

import sys
import os
import argparse
import urllib.parse
import re

try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False

def extract_info(url_or_id):
    clean = url_or_id.strip()
    token = None

    if "t=" in clean:
        match = re.search(r't=([^&]+)', clean)
        if match:
            token = match.group(1)

    if clean.startswith("http"):
        parsed = urllib.parse.urlparse(clean)
        path = parsed.path.strip("/")
        # Extract ID from path like /f/dr7u0u1a7edw or /dr7u0u1a7edw or /dr7u0u1a7edw/download
        parts = [p for p in path.split("/") if p not in ("f", "download")]
        file_id = parts[-1] if parts else clean
    else:
        file_id = clean

    return file_id, token

def get_jdownloader_all_variants(url_or_id):
    file_id, token = extract_info(url_or_id)
    if not file_id:
        return []

    variants = [
        f"https://buzzheavier.com/{file_id}",
        f"https://dd.buzzheavier.com/f/{file_id}",
        f"https://buzzheavier.com/f/{file_id}"
    ]

    if token:
        variants.append(f"https://buzzheavier.com/{file_id}/download?t={token}")
        variants.append(f"https://buzzheavier.com/{file_id}/download?t={token}&alt=true")

    return variants

def process_batch(input_sources, output_file=None, copy_clipboard=False):
    urls = []
    for src in input_sources:
        if os.path.exists(src):
            with open(src, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        urls.append(line)
        else:
            urls.append(src)

    print(f"🔍 Scrapen von {len(urls)} Buzzheavier-Links für JDownloader 2...\n")

    jdownloader_list = []
    for item in urls:
        file_id, token = extract_info(item)
        variants = get_jdownloader_all_variants(item)
        print(f"📦 ID: {file_id} (Token: {token if token else 'Kein Token in URL'})")
        for v in variants:
            print(f"   ➜ {v}")
            if v not in jdownloader_list:
                jdownloader_list.append(v)
        print()

    result_text = "\n".join(jdownloader_list)

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(result_text)
        print(f"✅ JDownloader 2 Link-Liste ({len(jdownloader_list)} Links) gespeichert in: '{output_file}'")

    if copy_clipboard:
        if HAS_PYPERCLIP:
            pyperclip.copy(result_text)
            print("\n📋 Alle 5 Link-Varianten wurden in die Zwischenablage kopiert! (In JDownloader 2 einfügen)")
        else:
            print("\n⚠️ 'pyperclip' ist nicht installiert. Installiere es mit `pip install pyperclip` für Auto-Copy.")

    return jdownloader_list

def main():
    parser = argparse.ArgumentParser(description="Buzzheavier Batch Scraper & 5-Variant Link Generator für JDownloader 2")
    parser.add_argument("urls", nargs="+", help="Buzzheavier URLs, IDs oder Pfad zu einer Textdatei mit Links")
    parser.add_argument("-o", "--output", help="Ausgabedatei für JDownloader 2 (.txt oder .crawljob)")
    parser.add_argument("-c", "--copy", action="store_true", help="Automatisch in die Zwischenablage kopieren")

    args = parser.parse_args()
    process_batch(args.urls, output_file=args.output, copy_clipboard=args.copy)

if __name__ == "__main__":
    main()
