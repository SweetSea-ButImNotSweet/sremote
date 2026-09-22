#!/usr/bin/env bash
set -e

blueprints_dir="docs/content/guides/vi/blueprints"

for f in "$blueprints_dir"/*.md; do
  [ -f "$f" ] || continue
  base=$(basename "$f" .md)

  # Check if callout already injected
  if grep -q "Live Demo: $base" "$f"; then
    echo "Already injected: $base"
    continue
  fi

  # Inject callout right before the first "---"
  awk -v base="$base" '
    !injected && /^---$/ {
      print "> [!TIP]";
      print "> **Trải nghiệm ngay bản demo hoạt động thực tế**: Mở [🚀 Live Demo: " base "](../../../../demo/apps/" base "/index.html) để tương tác trực tiếp trên trình duyệt.";
      print "";
      print $0;
      injected=1;
      next;
    }
    { print }
  ' "$f" > "$f.tmp" && mv "$f.tmp" "$f"

  echo "Injected Live Demo link into $f"
done
