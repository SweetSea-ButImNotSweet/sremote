#!/usr/bin/env bash
set -e

blueprints_dir="docs/content/guides/vi/blueprints"
apps_dir="demo/apps"

mkdir -p "$apps_dir"

for f in "$blueprints_dir"/*.md; do
  [ -f "$f" ] || continue
  base=$(basename "$f" .md)
  target="$apps_dir/$base"
  mkdir -p "$target"

  # Extract HTML (first ```html block)
  awk '/^```html/{flag=1; next} /^```/{flag=0} flag' "$f" > "$target/index.html.raw"
  
  if [ -s "$target/index.html.raw" ]; then
    # Inject Top Navigation Bar
    awk -v base="$base" '
      /<body>/ {
        print $0;
        print "  <!-- Top Navigation Header -->";
        print "  <nav style=\"display:flex; justify-content:space-between; align-items:center; padding:12px 20px; background:#0f172a; border-bottom:1px solid rgba(255,255,255,0.08); font-size:13px; font-family:-apple-system,BlinkMacSystemFont,sans-serif;\">";
        print "    <a href=\"../../index.html\" style=\"color:#38bdf8; text-decoration:none; font-weight:600;\">⬅️ Về Demo Hub</a>";
        print "    <span style=\"color:#94a3b8; font-weight:500;\">Live Demo: " base "</span>";
        print "    <a href=\"../../../docs/index.html?path=content/guides/vi/blueprints/" base ".md\" target=\"_blank\" style=\"color:#38bdf8; text-decoration:none; font-weight:600;\">📖 Xem Tutorial</a>";
        print "  </nav>";
        next;
      }
      { print }
    ' "$target/index.html.raw" > "$target/index.html"
    rm -f "$target/index.html.raw"
  fi

  # Extract CSS (first ```css block)
  awk '/^```css/{flag=1; next} /^```/{flag=0} flag' "$f" > "$target/style.css"

  # Extract and concatenate ALL javascript blocks into app.js
  awk '
    /^```javascript/{flag=1; next}
    /^```/{flag=0; if (cur != "") { print cur "\n"; cur="" }}
    flag{cur = cur $0 "\n"}
  ' "$f" > "$target/app.js"

  echo "✅ Hoàn tất trích xuất: $base"
done

echo "🎉 Toàn bộ 11 ứng dụng demo đã được khởi tạo thành công!"
