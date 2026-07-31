#!/usr/bin/env python3
"""
Buzzheavier CLI Tool
--------------------
A Python script to upload and download files to/from Buzzheavier (buzzheavier.com).

Features:
  - Upload files (anonymous or authenticated with Bearer token/Account ID)
  - Download files directly from Buzzheavier URLs or File IDs
  - Progress bar for uploads and downloads

Requirements:
  - python3
  - requests (install with `pip install requests`)
"""

import sys
import os
import argparse
import urllib.parse
import re

try:
    import requests
except ImportError:
    print("Error: The 'requests' library is required. Please install it using:")
    print("  pip install requests")
    sys.exit(1)


UPLOAD_BASE_URL = "https://w.buzzheavier.com"
WEB_BASE_URL = "https://buzzheavier.com"
HEADERS_BASE = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


class ProgressFileWriter:
    """Wrapper around file object to print progress during HTTP PUT upload."""
    def __init__(self, file_path):
        self.file_path = file_path
        self.file_size = os.path.getsize(file_path)
        self._file = open(file_path, "rb")
        self.bytes_read = 0

    def read(self, chunk_size=-1):
        chunk = self._file.read(chunk_size)
        if chunk:
            self.bytes_read += len(chunk)
            self._print_progress()
        return chunk

    def _print_progress(self):
        if self.file_size == 0:
            pct = 100
        else:
            pct = int((self.bytes_read / self.file_size) * 100)
        bar_len = 30
        filled = int(bar_len * self.bytes_read // self.file_size) if self.file_size > 0 else bar_len
        bar = '=' * filled + '-' * (bar_len - filled)
        sys.stdout.write(f"\rUploading [{bar}] {pct}% ({self.bytes_read}/{self.file_size} bytes)")
        sys.stdout.flush()

    def close(self):
        self._file.close()
        print()  # New line after upload done


def upload_file(file_path, token=None, parent_id=None):
    """Uploads a file to Buzzheavier."""
    if not os.path.exists(file_path):
        print(f"Error: File '{file_path}' does not exist.")
        sys.exit(1)

    filename = os.path.basename(file_path)
    encoded_filename = urllib.parse.quote(filename)

    if parent_id:
        url = f"{UPLOAD_BASE_URL}/{parent_id}/{encoded_filename}"
    else:
        url = f"{UPLOAD_BASE_URL}/{encoded_filename}"

    headers = dict(HEADERS_BASE)
    headers["Content-Length"] = str(os.path.getsize(file_path))
    if token:
        headers["Authorization"] = f"Bearer {token}"

    print(f"Target URL: {url}")
    print(f"File: {filename} ({os.path.getsize(file_path)} bytes)")

    progress_reader = ProgressFileWriter(file_path)
    try:
        response = requests.put(url, data=progress_reader, headers=headers)
        progress_reader.close()

        if response.status_code in (200, 201):
            print("\n✅ Upload successful!")
            print(f"Response: {response.text.strip()}")
        else:
            print(f"\n❌ Upload failed! Status Code: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        progress_reader.close()
        print(f"\n❌ Error during upload: {e}")
        sys.exit(1)


def get_direct_download_info(url_or_id):
    """
    Extracts the direct download link and filename from a Buzzheavier URL or file ID.
    """
    # Clean ID or URL input
    clean_id = url_or_id.strip()
    if clean_id.startswith("http"):
        parsed = urllib.parse.urlparse(clean_id)
        clean_id = parsed.path.strip("/")

    clean_url = f"{WEB_BASE_URL}/{clean_id}"
    dl_endpoint = f"{clean_url}/download"

    headers = dict(HEADERS_BASE)
    headers["HX-Request"] = "true"
    headers["HX-Current-URL"] = clean_url
    headers["Referer"] = clean_url

    print(f"Resolving download link for ID/URL: {clean_id}...")
    res_dl = requests.get(dl_endpoint, headers=headers, allow_redirects=False)

    direct_link = res_dl.headers.get("hx-redirect") or res_dl.headers.get("Location")

    if not direct_link and res_dl.status_code in (200, 204):
        # Fallback to standard URL if hx-redirect is same page
        direct_link = clean_url

    filename = f"{clean_id}.bin"
    return filename, direct_link or clean_url


def download_file(url_or_id, output_path=None):
    """Downloads a file from Buzzheavier."""
    try:
        filename, direct_link = get_direct_download_info(url_or_id)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

    target_name = output_path if output_path else filename
    print(f"Direct Link: {direct_link}")
    print(f"Saving as: {target_name}")

    try:
        with requests.get(direct_link, headers=HEADERS_BASE, stream=True) as r:
            r.raise_for_status()
            total_size = int(r.headers.get('content-length', 0))
            downloaded = 0

            with open(target_name, "wb") as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            pct = int((downloaded / total_size) * 100)
                            bar_len = 30
                            filled = int(bar_len * downloaded // total_size)
                            bar = '=' * filled + '-' * (bar_len - filled)
                            sys.stdout.write(f"\rDownloading [{bar}] {pct}% ({downloaded}/{total_size} bytes)")
                        else:
                            sys.stdout.write(f"\rDownloaded {downloaded} bytes")
                        sys.stdout.flush()

        print(f"\n\n✅ File saved to '{target_name}' successfully!")
    except Exception as e:
        print(f"\n❌ Error downloading file: {e}")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Buzzheavier CLI tool for uploading and downloading files."
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Upload command
    upload_parser = subparsers.add_parser("upload", help="Upload a file to Buzzheavier")
    upload_parser.add_argument("file", help="Path to the file to upload")
    upload_parser.add_argument("-t", "--token", help="Account Token/ID (Bearer token) for authenticated upload")
    upload_parser.add_argument("-p", "--parent", help="Parent Folder ID to upload into")

    # Download command
    download_parser = subparsers.add_parser("download", help="Download a file from Buzzheavier")
    download_parser.add_argument("url_or_id", help="Buzzheavier File URL or ID")
    download_parser.add_argument("-o", "--output", help="Output file path (optional)")

    # Link extraction command
    link_parser = subparsers.add_parser("get-link", help="Get direct download link without downloading")
    link_parser.add_argument("url_or_id", help="Buzzheavier File URL or ID")

    args = parser.parse_args()

    if args.command == "upload":
        upload_file(args.file, token=args.token, parent_id=args.parent)
    elif args.command == "download":
        download_file(args.url_or_id, output_path=args.output)
    elif args.command == "get-link":
        try:
            fname, link = get_direct_download_info(args.url_or_id)
            print(f"\nFilename: {fname}")
            print(f"Direct Link: {link}")
        except Exception as e:
            print(f"❌ Error: {e}")
            sys.exit(1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
