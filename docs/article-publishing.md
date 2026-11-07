# Publishing an article

This guide explains how to prepare, convert, preview, and submit an article to the Binder website. The published site reads generated JSON files from `assets/articles/`; the Markdown files are working sources and should not be included in the article pull request.

## 1. Prepare the two language files

Create one UTF-8 Markdown file per language, for example `zh-cn.md` and `en.md`. Each file starts with flat YAML-style front matter, followed by the article body:

```markdown
---
title: Binder feature release
author: Jane Doe
date: 2026-11-01
slug: binder_feature_release
header: An optional short introduction
footer: An optional closing line
---

# A heading

Write the article body in Markdown.
```

The Chinese and English files each need their own localized `title` and `author`. Put the article-wide `date` and optional `slug` in the Chinese file only. The date must use `YYYY-MM-DD`. If no slug is provided, the converter uses the Chinese file's basename; it must contain only lowercase ASCII letters, digits, `_`, or `-`.

The converter recognizes these front matter fields: `title`, `author`, `date`, `slug`, `header`, and `footer`. Values must be single-line strings. Plain values and quoted single-line values are supported; nested YAML, lists, and multiline YAML blocks are not. `header` and `footer` are optional plain text fields, not Markdown.

## 2. Convert the files

From the repository root, run:

```bash
python3 tools/article_convertor.py --zh-cn /path/to/zh-cn.md --en /path/to/en.md
```

`--zhcn` is an alias for `--zh-cn`. If the date, either title, or either author is missing, an interactive run asks for it. The date prompt defaults to today's date when you press Enter. In a non-interactive run, missing required metadata is an error. The converter validates the date and slug and refuses to overwrite an existing output file.

The converter writes `<slug>.json` under `assets/articles/`, marks the article as version `v2` with Markdown content, then runs `tools/build_article_index.py` to update `assets/articles/index.json`. Keep the generated JSON and index together when preparing the pull request.

## 3. Markdown supported by the website

The article page renders this subset:

- Headings (`#` through `######`) and paragraphs
- Bold (`**text**`), italics (`*text*`), and inline code (`` `code` ``)
- Fenced code blocks
- Links in the form `[label](https://example.com)`; `https:`, `http:`, `mailto:`, root-relative (`/path`) and page-fragment (`#section`) targets are allowed
- Images using `![description](image.png)`
- Blockquotes, ordered and unordered lists, and horizontal rules

Raw HTML is displayed as text. Tables, task lists, strikethrough, reference-style links, and HTML formatting are not supported. Keep paragraphs separated with a blank line; Markdown line breaks inside a paragraph are treated as spaces.

### Add images

Put local image files next to the Markdown file that uses them, then reference them with a relative path:

```markdown
![A screenshot of the app](images/screenshot.png)
```

The converter resolves a relative image path from the directory containing the Markdown file. For example, `images/screenshot.png` points to a child `images` directory, while `../shared/screenshot.png` points to a sibling directory. If that file is not found, interactive conversion prompts for its actual path; an entered relative path is resolved from the directory where the converter was run, and an absolute path is accepted. In non-interactive mode, a missing file is an error.

The converter copies local images into `assets/articles/` and rewrites the Markdown URL in the generated JSON. Local images must use PNG, JPG/JPEG, GIF, WebP, or AVIF. Use a path without spaces or parentheses. HTTPS image URLs and existing `/assets/images/` or `/assets/articles/` paths are also supported. Do not use `http:`, `data:`, or `file:` image URLs. Include the copied image files in the pull request with the article JSON and index; do not include the source Markdown files. Use images you have permission to publish.

## 4. Preview locally

Start the static site server from the repository root:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000/article.html](http://localhost:8000/article.html), select the new article, and check both language settings. To preview a specific article directly, use `article.html?id=<slug>`; for example, `http://localhost:8000/article.html?id=binder_feature_release`. Stop the server with `Ctrl+C`.

Check the title, author, date, links, Markdown layout, and language switching. A local HTTP server is needed because the article page fetches JSON files and the manifest.

## 5. Submit the pull request

Fork the official repository, add the generated article JSON and copied images under `assets/articles/`, and include the updated `assets/articles/index.json`. Do not include the Markdown source files or unrelated changes. The pull request workflow rebuilds the index and fails if the committed index is out of date. After review and merge, the default-branch workflow updates the index and deploys the site.

### Editorial requirements

- Provide Chinese and English versions.
- Keep the article related to Binder and format it so it displays cleanly.
- Use an accurate publication date; do not plagiarize existing articles or impersonate another author.
- Distribute the article under the [CC BY 4.0 license](https://creativecommons.org/licenses/by/4.0/).
- Keep the article pull request limited to `assets/articles/` and follow the repository's safety and open-source guidelines.

Critical or opposing opinions are welcome and are not, on their own, a reason for rejection.

