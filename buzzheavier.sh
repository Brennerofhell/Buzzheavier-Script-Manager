#!/usr/bin/env bash

# Buzzheavier CLI Script (Bash)
# Usage:
#   Upload:   ./buzzheavier.sh upload <file_path> [parent_id] [account_token]
#   Download: ./buzzheavier.sh download <url_or_id> [output_file]

set -e

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

if ! command_exists curl; then
    echo "Error: curl is required to run this script."
    exit 1
fi

show_help() {
    echo "Buzzheavier CLI Bash Script"
    echo "Usage:"
    echo "  $0 upload <file_path> [parent_id] [account_token]"
    echo "  $0 download <url_or_id> [output_file]"
    echo ""
    echo "Examples:"
    echo "  $0 upload myfile.zip"
    echo "  $0 upload myfile.zip folder_id_123 my_bearer_token"
    echo "  $0 download https://buzzheavier.com/f/abc123xyz"
    echo "  $0 download abc123xyz downloaded_file.zip"
}

upload_file() {
    local FILE_PATH="$1"
    local PARENT_ID="$2"
    local TOKEN="$3"

    if [ ! -f "$FILE_PATH" ]; then
        echo "Error: File '$FILE_PATH' does not exist."
        exit 1
    fi

    local FILENAME=$(basename "$FILE_PATH")
    local UPLOAD_URL="https://w.buzzheavier.com"

    if [ -n "$PARENT_ID" ]; then
        UPLOAD_URL="${UPLOAD_URL}/${PARENT_ID}/${FILENAME}"
    else
        UPLOAD_URL="${UPLOAD_URL}/${FILENAME}"
    fi

    echo "Uploading '$FILENAME' to Buzzheavier..."
    echo "Target URL: $UPLOAD_URL"

    if [ -n "$TOKEN" ]; then
        curl -# -T "$FILE_PATH" -H "Authorization: Bearer $TOKEN" "$UPLOAD_URL"
    else
        curl -# -T "$FILE_PATH" "$UPLOAD_URL"
    fi
    echo ""
}

download_file() {
    local INPUT="$1"
    local OUTPUT="$2"

    # Normalize URL
    local URL="$INPUT"
    if [[ "$INPUT" != http* ]]; then
        URL="https://buzzheavier.com/$INPUT"
    fi

    echo "Resolving Buzzheavier link: $URL"

    # Fetch page to get HX endpoint
    local PAGE_HTML=$(curl -sL -A "Mozilla/5.0" "$URL")

    # Extract filename if available
    local EXTRACTED_NAME=$(echo "$PAGE_HTML" | grep -oP '<span class="text-2xl[^"]*">\K[^<]+' | head -n 1)
    if [ -z "$EXTRACTED_NAME" ]; then
        EXTRACTED_NAME=$(basename "$URL")
    fi

    local OUT_NAME="${OUTPUT:-$EXTRACTED_NAME}"

    # Extract download endpoint path
    local DL_ENDPOINT=$(echo "$PAGE_HTML" | grep -oP 'hx-get="\K[^"]+' | head -n 1)
    if [ -z "$DL_ENDPOINT" ]; then
        DL_ENDPOINT="${URL%/}/download"
    elif [[ "$DL_ENDPOINT" != http* ]]; then
        DL_ENDPOINT="https://buzzheavier.com${DL_ENDPOINT}"
    fi

    echo "Requesting direct download link..."
    # Perform HTMX request to capture hx-redirect header
    local HEADERS=$(curl -sI -A "Mozilla/5.0" -H "HX-Request: true" -H "Referer: $URL" "$DL_ENDPOINT")

    local DIRECT_LINK=$(echo "$HEADERS" | grep -i "^hx-redirect:" | awk '{print $2}' | tr -d '\r')

    if [ -z "$DIRECT_LINK" ]; then
        DIRECT_LINK=$(echo "$HEADERS" | grep -i "^location:" | awk '{print $2}' | tr -d '\r')
    fi

    if [ -z "$DIRECT_LINK" ]; then
        echo "Error: Could not retrieve direct download link."
        exit 1
    fi

    echo "Direct Link: $DIRECT_LINK"
    echo "Downloading file as '$OUT_NAME'..."

    curl -# -L -A "Mozilla/5.0" -H "Referer: https://buzzheavier.com/" -o "$OUT_NAME" "$DIRECT_LINK"

    echo "✅ Download finished: $OUT_NAME"
}

case "$1" in
    upload)
        upload_file "$2" "$3" "$4"
        ;;
    download)
        download_file "$2" "$3"
        ;;
    *)
        show_help
        ;;
esac
