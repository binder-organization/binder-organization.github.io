# 投稿文章

本文说明如何准备、转换、预览并投稿文章。网站读取 `assets/articles/` 中生成的 JSON；Markdown 文件是编写和校对用的源稿，不应加入投稿 PR。

## 1. 准备中英文稿

为每种语言创建一个 UTF-8 Markdown 文件，例如 `zh-cn.md` 和 `en.md`。每个文件以简单的 YAML 风格 Front Matter 开头，后面写正文：

```markdown
---
title: 必达功能发布
author: 张三
date: 2026-11-01
slug: binder_feature_release
header: 可选的简短导语
footer: 可选的结尾文字
---

# 文章标题

从这里开始用 Markdown 写正文。
```

中英文文件分别填写对应语言的 `title` 和 `author`。文章级字段 `date` 和可选的 `slug` 只写在中文文件中。日期格式必须是 `YYYY-MM-DD`。不填写 slug 时，转换器使用中文文件名；slug 只能包含小写英文字母、数字、下划线和连字符。

转换器识别 `title`、`author`、`date`、`slug`、`header`、`footer` 这些字段。值必须是单行字符串，支持普通值或单引号、双引号包裹的单行值；不支持嵌套 YAML、列表和多行 YAML 块。`header`、`footer` 是普通文本，不会按 Markdown 渲染。

## 2. 转换文章

在仓库根目录运行：

```bash
python3 tools/article_convertor.py --zh-cn /path/to/zh-cn.md --en /path/to/en.md
```

`--zhcn` 是 `--zh-cn` 的别名。缺少日期、任一语言的标题或作者时，交互运行会询问；日期提示默认值为当天，按回车即可使用。非交互运行若缺少必填元数据会报错。转换器会校验日期和 slug，并拒绝覆盖已有输出文件。

转换器会在 `assets/articles/` 下生成 `<slug>.json`，将版本标为 `v2` 并注明正文使用 Markdown，然后运行 `tools/build_article_index.py` 更新 `assets/articles/index.json`。准备 PR 时要同时包含文章 JSON 和更新后的索引。

## 3. 网站支持的 Markdown

文章页面支持以下语法：

- 标题（`#` 至 `######`）和段落
- 粗体（`**文字**`）、斜体（`*文字*`）和行内代码（`` `代码` ``）
- 围栏代码块
- `[链接文字](https://example.com)` 格式的链接；允许 `http:`、`https:`、`mailto:`、根路径（`/path`）和页面锚点（`#section`）
- `![说明文字](image.png)` 格式的图片
- 引用、有序列表、无序列表和分隔线

原始 HTML 会显示成普通文本。暂不支持表格、任务列表、删除线、引用式链接和 HTML 排版。段落之间请留空行；同一段中的换行会按空格处理。

### 添加图片

把本地图片放在使用它的 Markdown 文件旁边，再用相对路径引用：

```markdown
![应用截图](images/screenshot.png)
```

转换器会从 Markdown 文件所在目录解析相对图片路径。例如 `images/screenshot.png` 指向同目录下的 `images` 子目录；`../shared/screenshot.png` 指向上一级目录中的 `shared` 子目录。如果相对路径找不到图片，交互运行时会询问图片的实际路径；手动输入的相对路径按运行转换器时的当前目录解析，也可以输入绝对路径。非交互运行时，找不到图片会报错。

转换器会把本地图片复制到 `assets/articles/`，并改写生成 JSON 中的 Markdown 图片路径。本地图片格式限 PNG、JPG/JPEG、GIF、WebP、AVIF；路径不能包含空格或括号。也支持 HTTPS 图片链接和已有的 `/assets/images/`、`/assets/articles/` 站内路径；不支持 `http:`、`data:`、`file:` 图片地址。PR 中要同时提交复制后的图片、文章 JSON 和索引，不要提交 Markdown 源稿。请确认拥有发布图片的权利。

## 4. 本地预览

在仓库根目录启动静态网站服务器：

```bash
python3 -m http.server 8000
```

浏览器打开[http://localhost:8000/article.html](http://localhost:8000/article.html)，选择新文章并检查两种语言。也可以直接打开指定文章，例如 `http://localhost:8000/article.html?id=binder_feature_release`。按 `Ctrl+C` 停止服务器。

检查标题、作者、日期、链接、Markdown 排版和语言切换。文章页需要读取 JSON 和索引文件，因此请通过本地 HTTP 服务器预览，不要直接双击 HTML 文件。

## 5. 提交 PR

Fork 官网仓库，把生成的文章 JSON 和复制后的图片放入 `assets/articles/`，并提交更新后的 `assets/articles/index.json`。不要提交 Markdown 源稿或无关改动。PR 工作流会重新生成索引，并在提交的索引过期时失败。审核合并后，默认分支上的工作流会更新索引并部署网站。

### 内容要求

- 文章必须有中英文版本。
- 内容应与 Binder 有关，排版应清楚易读。
- 发布日期应准确；不得抄袭现有文章或冒用他人身份。
- 文章统一按 [CC BY 4.0 许可](https://creativecommons.org/licenses/by/4.0/) 分发。
- 投稿 PR 只修改 `assets/articles/`，并遵循仓库的安全、开放原则。

欢迎提出批评或不同意见；不会仅因观点批评而拒绝合并。

