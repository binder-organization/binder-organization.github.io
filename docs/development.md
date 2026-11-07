# Develop and preview the website

## Project structure

| Path | Purpose |
| --- | --- |
| `index.html`, `article.html`, `products.html`, `docs.html`, `about.html` | About and contact page |
| `contact.html` | Compatibility redirect to the about and contact page |
| `css/style.css` | Shared responsive layout and theme styles |
| `js/script.js`, `js/i18n.js` | Navigation, preferences, and interface translations |
| `js/article-loader.js` | Article manifest loading, language selection, and safe Markdown rendering |
| `assets/articles/*.json` | Published article data |
| `assets/articles/*.{png,jpg,jpeg,gif,webp,avif}` | Images copied from article Markdown sources |
| `assets/articles/index.json` | Manifest listing article JSON files in display order |
| `tools/article_convertor.py` | Converts bilingual Markdown sources to article JSON |
| `tools/build_article_index.py` | Rebuilds the article manifest from article JSON files |
| `.github/workflows/articles-index.yml` | Rebuilds and checks the manifest in GitHub Actions |

## Run the site locally

The site has no build step or package installation. From the repository root, run:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). The article list is at [http://localhost:8000/article.html](http://localhost:8000/article.html). Use `Ctrl+C` to stop the server. Serve it over HTTP instead of opening files directly so browser `fetch()` requests can load the article manifest and JSON.

## Article data and index

`assets/articles/index.json` contains a `files` array of article filenames. The index builder reads each article's `info` field, sorts by publication date (newest first), and writes the corresponding filenames:

```bash
python3 tools/build_article_index.py --verbose
```

The builder skips `index.json`, checks the basic article metadata required for sorting, and reports invalid article JSON. It does not validate article content or the full website schema.

The article loader supports `v1` legacy plain-text articles and `v2` Markdown articles. New articles should be generated with `tools/article_convertor.py`, which also rebuilds the index. When editing an article manually, run the index builder and include both the article JSON and updated manifest in the pull request. The pull request workflow verifies that the manifest is current; the default-branch workflow commits manifest updates after changes are merged.

## Contribution boundaries

For an article-only pull request, change only files under `assets/articles/`. Website, converter, documentation, or workflow changes should be submitted separately with a description of the affected behavior. Do not commit generated Python caches, editor settings, or operating-system metadata.

