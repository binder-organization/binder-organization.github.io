# 开发与本地预览

## 项目结构

| 路径 | 用途 |
| --- | --- |
| `index.html`、`article.html`、`products.html`、`docs.html`、`about.html` | 关于与联系页面 |
| `contact.html` | 跳转到关于与联系页的兼容入口 |
| `css/style.css` | 共用响应式布局和主题样式 |
| `js/script.js`、`js/i18n.js` | 导航、偏好设置和界面翻译 |
| `js/article-loader.js` | 加载文章索引、语言切换和安全的 Markdown 渲染 |
| `assets/articles/*.json` | 已发布文章数据 |
| `assets/articles/*.{png,jpg,jpeg,gif,webp,avif}` | 从投稿 Markdown 源稿复制过来的图片 |
| `assets/articles/index.json` | 文章 JSON 文件清单及显示顺序 |
| `tools/article_convertor.py` | 将双语 Markdown 源稿转换为文章 JSON |
| `tools/build_article_index.py` | 根据文章 JSON 重建文章清单 |
| `.github/workflows/articles-index.yml` | GitHub Actions 中重建并检查索引 |

## 本地运行

网站无需构建，也无需安装依赖。在仓库根目录运行：

```bash
python3 -m http.server 8000
```

浏览器访问[http://localhost:8000](http://localhost:8000)。文章列表在[http://localhost:8000/article.html](http://localhost:8000/article.html)。按 `Ctrl+C` 停止服务。请通过 HTTP 访问，而不是直接打开本地文件，这样浏览器才能通过 `fetch()` 加载文章索引和 JSON。

## 文章数据和索引

`assets/articles/index.json` 的 `files` 数组列出文章文件名。索引脚本会读取文章的 `info` 字段，按发布日期从新到旧排序，然后写出文件清单：

```bash
python3 tools/build_article_index.py --verbose
```

脚本会跳过 `index.json`，检查排序所需的基本元数据，并报告无法读取或格式错误的文章 JSON。它不会检查文章正文或完整的网站数据结构。

文章加载器兼容旧版纯文本文章 `v1` 和新版 Markdown 文章 `v2`。新文章应使用 `tools/article_convertor.py` 生成，该工具也会重建索引。手动编辑文章时，请运行索引脚本，并在 PR 中同时提交文章 JSON 和更新后的清单。PR 工作流会检查索引是否最新；合并后，默认分支工作流会提交索引更新。

## 贡献范围

只投稿文章的 PR 应仅修改 `assets/articles/`。网站、转换器、文档或工作流的改动应单独提交，并说明影响的功能。不要提交 Python 缓存、编辑器设置或操作系统生成的杂项文件。

