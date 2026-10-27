#!/usr/bin/env bash
# Đẩy toàn bộ thư mục dự án lên GitHub (macOS / Linux)
set -e
cd "$(dirname "$0")/.."
command -v git >/dev/null || { echo "Chưa cài Git"; exit 1; }
[ -d .git ] || git init
git branch -M main
read -rp "Dán link repo GitHub (vd https://github.com/ten-ban/dai-doan-ket.git): " URL
git remote remove origin 2>/dev/null || true
git remote add origin "$URL"
git add -A
git commit -m "Cập nhật game Đại Đoàn Kết" || true
git push -u origin main
