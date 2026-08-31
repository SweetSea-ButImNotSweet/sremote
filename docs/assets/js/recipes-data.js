/**
 * SRemote Recipes Data & Snippet Loader
 * Asynchronously loads platforms metadata and platform snippets (raw HTML and JS) with in-memory caching.
 */

const snippetCache = new Map();
let commentsDict = null;

async function loadCommentsDict() {
  if (commentsDict) return commentsDict;
  try {
    const res = await fetch('recipes/comments-i18n.json');
    if (res.ok) {
      commentsDict = await res.json();
    }
  } catch (e) {
    console.warn('Could not load comments i18n dict:', e);
  }
  return commentsDict || {};
}

function translateComments(codeText, lang = 'vi') {
  if (!codeText || typeof codeText !== 'string' || !commentsDict) return codeText;
  return codeText.replace(/\/\/\s*\[(cmt_[a-zA-Z0-9_]+)\]/g, (match, tag) => {
    const entry = commentsDict[tag];
    if (entry && entry[lang]) {
      return entry[lang];
    }
    return match;
  });
}

async function fetchSnippet(platformId, filename, lang = 'vi') {
  const cacheKey = `${platformId}/${filename}`;
  let text = '';
  if (snippetCache.has(cacheKey)) {
    text = snippetCache.get(cacheKey);
  } else {
    try {
      const res = await fetch(`recipes/${platformId}/${filename}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} when fetching ${filename}`);
      text = await res.text();
      snippetCache.set(cacheKey, text);
    } catch (err) {
      console.warn(`Failed to fetch snippet for ${platformId}/${filename}:`, err);
      return `// Snippet not available for ${platformId}/${filename}`;
    }
  }

  await loadCommentsDict();
  let result = translateComments(text, lang);
  result = result.replace(/import\s*\{\s*sremote\s*\}\s*from\s*["']\/packages\/wrapper\/src\/index\.js["'];?/g, 'import { sremote } from "@sremote/wrapper";');
  return result;
}

async function loadRecipesMetadata() {
  if (window.RECIPES_DATA?.platforms?.length) {
    return window.RECIPES_DATA;
  }

  await loadCommentsDict();

  try {
    const res = await fetch('recipes/platforms.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    window.RECIPES_DATA = { categories: data.categories || [], platforms: data.platforms || [], dict: data.dict || {}, commentsDict, fetchSnippet, translateComments };
    return window.RECIPES_DATA;
  } catch (err) {
    console.error('Failed to load recipes metadata:', err);
    return null;
  }
}

// Global Export
window.RECIPES_LOADER = { loadRecipesMetadata, fetchSnippet, loadCommentsDict, translateComments };
