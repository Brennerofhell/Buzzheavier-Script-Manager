#!/usr/bin/env python3
"""
Buzzheavier Batch Link Scraper for JDownloader 2
------------------------------------------------
Extracts direct download links & mirrors from multiple Buzzheavier URLs/IDs
and formats them for JDownloader 2 clipboard import or .txt file export.
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

def extract_file_id(url_or_id):
    clean = url_or_id.strip()
    if clean.startswith("http"):
        parsed = urllib.parse.urlparse(clean)
        clean = parsed.path.strip("/").split("/")[-1]
    return clean

def get_jdownloader_links(url_or_id):
    file_id = extract_file_id(url_or_id)
    if not file_id:
        return []

    # JDownloader 2 compatible link formats for Buzzheavier
    links = [
        f"https://buzzheavier.com/{file_id}",
        f"https://dd.buzzheavier.com/f/{file_id}",
        f"https://buzzheavier.com/f/{file_id}"
    ]
    return links

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
        file_id = extract_file_id(item)
        links = get_jdownloader_links(item)
        print(f"📦 ID: {file_id}")
        for link in links:
            print(f"   ➜ {link}")
            jdownloader_list.append(link)

    result_text = "\n".join(jdownloader_list)

    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(result_text)
        print(f"\n✅ JDownloader 2 Link-Liste gespeichert in: '{output_file}'")

    if copy_clipboard:
        if HAS_PYPERCLIP:
            pyperclip.copy(result_text)
            print("\n📋 Alle Links wurden in die Zwischenablage kopiert! (In JDownloader 2 mit Strg+V einfügen)")
        else:
            print("\n⚠️ 'pyperclip' ist nicht installiert. Installiere es mit `pip install pyperclip` für Auto-Copy.")

    return jdownloader_list

def main():
    parser = argparse.ArgumentParser(description="Buzzheavier Batch Scraper für JDownloader 2")
    parser.add_argument("urls", nargs="+", help="Buzzheavier URLs, IDs oder Pfad zu einer Textdatei mit Links")
    parser.add_argument("-o", "--output", help="Ausgabedatei für JDownloader 2 (.txt oder .crawljob)")
    parser.add_argument("-c", "--copy", action="store_true", help="Automatisch in die Zwischenablage kopieren")

    args = parser.parse_args()
    process_batch(args.urls, output_file=args.output, copy_clipboard=args.copy)

if __name__ == "__main__":
    main()
