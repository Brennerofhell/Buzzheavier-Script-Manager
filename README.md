# Buzzheavier Scripts (Python & Bash)

CLI tools to upload and download files to/from [Buzzheavier](https://buzzheavier.com).

## 🚀 Features
- **Upload Files**: Anonymous uploads or authenticated uploads using your Buzzheavier account token / ID.
- **Download Files**: Bypass browser-only HTMX restrictions and fetch direct download links directly from the CLI.
- **Progress Tracking**: Real-time progress bar display during uploads and downloads.

---

## 🐍 Python Script (`buzzheavier.py`)

### Requirements
- Python 3.6+
- `requests` library (`pip install requests`)

### Usage

#### 1. Upload a File
```bash
# Anonymous upload
python3 buzzheavier.py upload myfile.zip

# Upload with Account Token / ID
python3 buzzheavier.py upload myfile.zip --token YOUR_ACCOUNT_TOKEN

# Upload into a specific parent folder
python3 buzzheavier.py upload myfile.zip --parent FOLDER_ID --token YOUR_ACCOUNT_TOKEN
```

#### 2. Download a File
```bash
# Download by full URL
python3 buzzheavier.py download https://buzzheavier.com/f/abc123xyz

# Download by File ID
python3 buzzheavier.py download abc123xyz

# Specify custom output path
python3 buzzheavier.py download abc123xyz -o custom_name.zip
```

#### 3. Extract Direct Link Only
```bash
python3 buzzheavier.py get-link https://buzzheavier.com/f/abc123xyz
```

---

## 🐚 Bash Script (`buzzheavier.sh`)

### Requirements
- `curl`

### Usage

```bash
chmod +x buzzheavier.sh

# Upload file (Anonymous)
./buzzheavier.sh upload myfile.zip

# Upload file with Parent Folder ID & Bearer Token
./buzzheavier.sh upload myfile.zip folder_id_123 account_token_456

# Download file
./buzzheavier.sh download https://buzzheavier.com/f/abc123xyz

# Download file with custom output name
./buzzheavier.sh download abc123xyz output_file.zip
```

---

## 📡 cURL One-Liners (Quick Terminal Commands)

### Uploading:
```bash
# Anonymous upload:
curl -#o - -T "file.zip" "https://w.buzzheavier.com/file.zip"

# Authenticated upload:
curl -#o - -T "file.zip" -H "Authorization: Bearer YOUR_ACCOUNT_ID" "https://w.buzzheavier.com/file.zip"
```

### Direct Link Retrieval:
```bash
curl -sI -A "Mozilla/5.0" -H "HX-Request: true" -H "Referer: https://buzzheavier.com/f/FILE_ID" "https://buzzheavier.com/FILE_ID/download" | grep -i "^hx-redirect:"
```
