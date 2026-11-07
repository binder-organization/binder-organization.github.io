// Article auto-loader.
// Responsibility: when article.html loads, fetch assets/articles/index.json,
// then fetch each article listed in the manifest and render either a list card or
// a reading view.  Fetching happens once; subsequent language switches only re-render.
//
// Article JSON contract (matches assets/articles/migration_notice.json):
//   info      : ["v1" | "v2", "2026-08-30"] — loader version and publish date
//   author / post_time / title / header / content / footer : each is a language map,
//              language code -> list of string elements (multiple elements = line breaks)
//
// View layout:
//   List card   — title top-left, grey meta line (time + author) below, preview text below that
//   Reading view — article title at page top, then a rounded rectangle containing:
//                  header top-left, content in the centre, footer bottom-right

var articleDirectory = "assets/articles";
var articleManifestFileName = "index.json";
var supportedArticleVersions = ["v1", "v2"];
var loadedArticleList = [];
var articleLoadFailed = false;
var articleLoadingStarted = false;

// Map site language codes (zh / en) to article language codes (zh-CN / en-US).
function resolveArticleLanguage(siteLanguage) {
    if (siteLanguage === "en") {
        return "en-US";
    }
    if (siteLanguage === "zh") {
        return "zh-CN";
    }
    return siteLanguage;
}

// Return all lines for a field in the current language; falls back to zh-CN, en-US, then any available language.
function pickArticleLines(field, siteLanguage) {
    if (!field) {
        return [];
    }
    if (field instanceof Array) {
        return field;
    }
    var wantedLanguage = resolveArticleLanguage(siteLanguage);
    var fallbackLanguages = ["zh-CN", "en-US"];
    var languageIndex = 0;
    if (field[wantedLanguage]) {
        return field[wantedLanguage];
    }
    for (languageIndex = 0; languageIndex < fallbackLanguages.length; languageIndex = languageIndex + 1) {
        if (field[fallbackLanguages[languageIndex]]) {
            return field[fallbackLanguages[languageIndex]];
        }
    }
    var availableLanguages = Object.keys(field);
    if (availableLanguages.length > 0) {
        return field[availableLanguages[0]];
    }
    return [];
}

// Parsed article: id is the filename minus .json; loaderVersion and postDate come from info;
// texts keeps all multilingual fields except info.
function parseArticleFile(fileName, rawJson) {
    var informationFields = rawJson.info instanceof Array ? rawJson.info : [];
    var articleFields = {};
    Object.keys(rawJson).forEach(function (fieldName) {
        if (fieldName !== "info" && fieldName !== "content_format") {
            articleFields[fieldName] = rawJson[fieldName];
        }
    });
    return {
        id: fileName.replace(/\.json$/, ""),
        loaderVersion: informationFields[0] === undefined ? "" : informationFields[0],
        postDate: informationFields[1] === undefined ? "" : informationFields[1],
        contentFormat: rawJson.content_format || "plain",
        texts: articleFields,
    };
}

// Read all display fields for an article in one call to avoid scattered field access.
function readArticleView(article, siteLanguage) {
    var joinLines = function (lines) {
        return lines.join("\n");
    };
    return {
        title: joinLines(pickArticleLines(article.texts.title, siteLanguage)),
        author: joinLines(pickArticleLines(article.texts.author, siteLanguage)),
        postTime: joinLines(pickArticleLines(article.texts.post_time, siteLanguage)),
        header: joinLines(pickArticleLines(article.texts.header, siteLanguage)),
        content: pickArticleLines(article.texts.content, siteLanguage),
        footer: pickArticleLines(article.texts.footer, siteLanguage),
    };
}

// Sort: newest first; on tie, author name earlier (case-insensitive) wins.
function compareArticles(firstArticle, secondArticle) {
    if (firstArticle.postDate !== secondArticle.postDate) {
        return firstArticle.postDate < secondArticle.postDate ? 1 : -1;
    }
    var siteLanguage = getPref("lang", "zh");
    var firstAuthor = readArticleView(firstArticle, siteLanguage).author;
    var secondAuthor = readArticleView(secondArticle, siteLanguage).author;
    return firstAuthor.localeCompare(secondAuthor, undefined, { sensitivity: "base" });
}

function fetchArticleJson(fileUrl) {
    return fetch(fileUrl).then(function (response) {
        if (!response.ok) {
            throw new Error("HTTP " + response.status + " -> " + fileUrl);
        }
        return response.json();
    });
}

// Fetch the manifest, then concurrently fetch every listed article file.  A single file failure is skipped.
function loadArticleCollection() {
    return fetchArticleJson(articleDirectory + "/" + articleManifestFileName)
        .then(function (manifest) {
            return manifest.files instanceof Array ? manifest.files : [];
        })
        .then(function (fileNames) {
            return Promise.all(
                fileNames.map(function (fileName) {
                    return fetchArticleJson(articleDirectory + "/" + fileName)
                        .then(function (rawJson) {
                            var article = parseArticleFile(fileName, rawJson);
                            if (supportedArticleVersions.indexOf(article.loaderVersion) === -1) {
                                console.warn(
                                    "跳过文章 " + fileName + "：加载器版本 " +
                                    article.loaderVersion + " 与当前 " +
                                    supportedArticleVersions.join("/") + " 不匹配",
                                );
                                return null;
                            }
                            return article;
                        })
                        .catch(function (error) {
                            console.warn("跳过文章 " + fileName + "：" + error.message);
                            return null;
                        });
                }),
            );
        })
        .then(function (parsedArticles) {
            return parsedArticles.filter(function (article) {
                return article !== null;
            });
        });
}

// Element builder: always uses textContent so article JSON content cannot become executable markup.
function createArticleElement(tagName, className, textContent) {
    var element = document.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (textContent !== undefined) {
        element.textContent = textContent;
    }
    return element;
}

// Notice element: hardcodes the current-language text and sets data-i18n so i18n.js can update it on language switch.
function createArticleNotice(messageKey, fallbackText) {
    var notice = createArticleElement("p", "article-notice", getTranslatedText(messageKey, fallbackText));
    notice.setAttribute("data-i18n", messageKey);
    return notice;
}

function getTranslatedText(messageKey, fallbackText) {
    var siteLanguage = getPref("lang", "zh");
    var table = i18n[siteLanguage] || {};
    return table[messageKey] === undefined ? fallbackText : table[messageKey];
}

function buildArticleCard(article) {
    var siteLanguage = getPref("lang", "zh");
    var view = readArticleView(article, siteLanguage);

    var card = createArticleElement("article", "article-card");

    var titleLink = createArticleElement("a", "article-card-title", view.title);
    titleLink.setAttribute("href", "article.html?id=" + encodeURIComponent(article.id));
    card.appendChild(titleLink);

    var metaLine = createArticleElement("p", "article-card-meta");
    metaLine.appendChild(createArticleElement("span", "article-card-time", view.postTime));
    metaLine.appendChild(createArticleElement("span", "article-card-separator", "·"));
    metaLine.appendChild(createArticleElement("span", "article-card-author", view.author));
    card.appendChild(metaLine);

    // Preview text joins paragraphs; overflow is clipped by CSS with an ellipsis.
    var previewText = view.content.join("\n");
    if (article.contentFormat === "markdown") {
        previewText = previewText
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/^\s{0,3}#{1,6}\s+/gm, "")
            .replace(/^\s*>\s?/gm, "")
            .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, "")
            .replace(/^\s*```[^\n]*$/gm, "")
            .replace(/\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g, function (_, bold, italic, code) {
                return bold || italic || code;
            });
    }
    var preview = createArticleElement(
        "div",
        "article-card-preview",
        previewText,
    );
    card.appendChild(preview);

    return card;
}

function renderArticleList(articleList) {
    var listSection = document.getElementById("article-list-section");
    var readSection = document.getElementById("article-read-section");
    var listBox = document.getElementById("article-list");

    listSection.hidden = false;
    readSection.hidden = true;

    listBox.textContent = "";
    document.title = getTranslatedText("page.title.articles", "文章 - 必达");

    if (articleLoadFailed) {
        listBox.appendChild(createArticleNotice("articles.loadFailed", "文章加载失败。"));
        return;
    }
    if (articleList.length === 0) {
        listBox.appendChild(createArticleNotice("articles.empty", "暂无文章。"));
        return;
    }
    articleList.forEach(function (article) {
        listBox.appendChild(buildArticleCard(article));
    });
}

// Reading view: the top banner stays the same as the list page (icon + "Articles" + description).
// All article content lives inside a single rounded rectangle: title, author+date, header, content, footer.
function renderArticleReading(article) {
    var listSection = document.getElementById("article-list-section");
    var readSection = document.getElementById("article-read-section");
    var listBox = document.getElementById("article-list");
    var articleBox = document.getElementById("article-box");
    var siteLanguage = getPref("lang", "zh");
    var view = readArticleView(article, siteLanguage);

    listSection.hidden = true;
    listBox.textContent = "";
    readSection.hidden = false;
    document.title = view.title;

    articleBox.textContent = "";
    articleBox.appendChild(createArticleElement("h2", "article-box-title", view.title));

    var metaLine = createArticleElement("p", "article-box-meta");
    metaLine.appendChild(createArticleElement("span", "article-box-author", view.author));
    metaLine.appendChild(createArticleElement("span", "article-box-meta-separator", "-"));
    metaLine.appendChild(createArticleElement("span", "article-box-time", view.postTime));
    articleBox.appendChild(metaLine);

    var licenseNotice = createElementLicenseNotice();
    articleBox.appendChild(licenseNotice);

    if (view.header.trim()) {
        articleBox.appendChild(createArticleElement("header", "article-box-header", view.header));
    }

    var contentBlock = createArticleElement("div", "article-box-content");
    view.content.forEach(function (paragraph) {
        if (article.contentFormat === "markdown") {
            renderMarkdownBlock(paragraph, contentBlock);
        } else {
            contentBlock.appendChild(createArticleElement("p", "", paragraph));
        }
    });
    articleBox.appendChild(contentBlock);

    var footerBlock = createArticleElement("footer", "article-box-footer");
    view.footer.forEach(function (line) {
        footerBlock.appendChild(createArticleElement("p", "", line));
    });
    articleBox.appendChild(footerBlock);

}

function createElementLicenseNotice() {
    var licenseNotice = createArticleElement("p", "article-license");
    var licenseText = createArticleElement(
        "span",
        "",
        getTranslatedText("articles.license", "本文采用"),
    );
    licenseText.setAttribute("data-i18n", "articles.license");
    licenseNotice.appendChild(licenseText);
    licenseNotice.appendChild(document.createTextNode(" "));
    var licenseLink = createArticleElement("a", "", "CC BY 4.0");
    licenseLink.href = "https://creativecommons.org/licenses/by/4.0/";
    licenseLink.target = "_blank";
    licenseLink.rel = "noopener noreferrer";
    licenseNotice.appendChild(licenseLink);
    return licenseNotice;
}

// Render a deliberately small, safe Markdown subset using DOM APIs and text nodes.
// Raw HTML is always displayed as text; links are restricted to non-script schemes.
function appendMarkdownInline(parent, text) {
    var pattern = /(!\[[^\]]*\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    var position = 0;
    var match;
    while ((match = pattern.exec(text)) !== null) {
        if (match.index > position) {
            parent.appendChild(document.createTextNode(text.slice(position, match.index)));
        }
        var token = match[0];
        var node;
        if (token.slice(0, 2) === "![") {
            var image = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
            var imageUrl = image[2].trim();
            if (/^https:\/\//i.test(imageUrl) || /^\/?assets\/(?:articles|images)\//i.test(imageUrl)) {
                node = document.createElement("img");
                node.src = imageUrl;
                node.alt = image[1];
                node.loading = "lazy";
                node.decoding = "async";
            } else {
                node = document.createTextNode(image[1]);
            }
        } else if (token.slice(0, 2) === "**") {
            node = document.createElement("strong");
            appendMarkdownInline(node, token.slice(2, -2));
        } else if (token.charAt(0) === "*") {
            node = document.createElement("em");
            appendMarkdownInline(node, token.slice(1, -1));
        } else if (token.charAt(0) === "`") {
            node = document.createElement("code");
            node.textContent = token.slice(1, -1);
        } else {
            var link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            var href = link[2].trim();
            if (/^(https?:|mailto:|\/|#)/i.test(href)) {
                node = document.createElement("a");
                node.href = href;
                node.rel = "noopener noreferrer";
                appendMarkdownInline(node, link[1]);
            } else {
                node = document.createTextNode(link[1]);
            }
        }
        parent.appendChild(node);
        position = pattern.lastIndex;
    }
    if (position < text.length) {
        parent.appendChild(document.createTextNode(text.slice(position)));
    }
}

function renderMarkdownBlock(markdown, container) {
    var lines = markdown.replace(/\r\n?/g, "\n").split("\n");
    var index = 0;
    while (index < lines.length) {
        var line = lines[index];
        if (!line.trim()) { index += 1; continue; }
        var fence = line.match(/^\s*```/);
        if (fence) {
            var codeLines = [];
            index += 1;
            while (index < lines.length && !/^\s*```/.test(lines[index])) {
                codeLines.push(lines[index]); index += 1;
            }
            if (index < lines.length) index += 1;
            var pre = document.createElement("pre");
            var code = document.createElement("code");
            code.textContent = codeLines.join("\n");
            pre.appendChild(code); container.appendChild(pre); continue;
        }
        var heading = line.match(/^\s*(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/);
        if (heading) {
            var h = document.createElement("h" + heading[1].length);
            appendMarkdownInline(h, heading[2]); container.appendChild(h); index += 1; continue;
        }
        if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
            container.appendChild(document.createElement("hr")); index += 1; continue;
        }
        if (/^\s*>/.test(line)) {
            var quoteLines = [];
            while (index < lines.length && /^\s*>/.test(lines[index])) {
                quoteLines.push(lines[index].replace(/^\s*>\s?/, "")); index += 1;
            }
            var quote = document.createElement("blockquote");
            renderMarkdownBlock(quoteLines.join("\n"), quote); container.appendChild(quote); continue;
        }
        var listMatch = line.match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);
        if (listMatch) {
            var ordered = Boolean(listMatch[2]);
            var list = document.createElement(ordered ? "ol" : "ul");
            if (ordered) list.start = Number(listMatch[2]);
            while (index < lines.length) {
                var item = lines[index].match(/^\s*(?:([-+*])|(\d+)[.)])\s+(.+)$/);
                if (!item || Boolean(item[2]) !== ordered) break;
                var li = document.createElement("li"); appendMarkdownInline(li, item[3]); list.appendChild(li); index += 1;
            }
            container.appendChild(list); continue;
        }
        var paragraphLines = [];
        while (index < lines.length && lines[index].trim() &&
            !/^\s*(?:#{1,6}\s|```|>|([-+*]|\d+[.)])\s)/.test(lines[index]) &&
            !/^\s*(---+|___+|\*\*\*+)\s*$/.test(lines[index])) {
            paragraphLines.push(lines[index]); index += 1;
        }
        if (paragraphLines.length === 0) {
            paragraphLines.push(lines[index]);
            index += 1;
        }
        var paragraph = document.createElement("p");
        appendMarkdownInline(paragraph, paragraphLines.join(" "));
        container.appendChild(paragraph);
    }
}

// The ?id= query parameter determines whether to show the list or reading view.
function readRequestedArticleId() {
    var parameters = new URLSearchParams(window.location.search);
    var requestedId = parameters.get("id");
    return requestedId === null ? "" : requestedId;
}

function renderArticlePage() {
    var requestedId = readRequestedArticleId();
    if (requestedId === "") {
        renderArticleList(loadedArticleList);
        return;
    }
    var matchedArticle = null;
    loadedArticleList.forEach(function (article) {
        if (article.id === requestedId) {
            matchedArticle = article;
        }
    });
    if (matchedArticle === null) {
        renderArticleList(loadedArticleList);
        document.getElementById("article-list").appendChild(
            createArticleNotice("articles.notFound", "未找到该文章。"),
        );
        return;
    }
    renderArticleReading(matchedArticle);
}

function initArticleLoader() {
    if (articleLoadingStarted) {
        return;
    }
    articleLoadingStarted = true;

    // Language switch only re-renders; the data is already parsed in memory, no new request needed.
    document.addEventListener("binder:language-change", renderArticlePage);

    loadArticleCollection()
        .then(function (articleList) {
            loadedArticleList = articleList.sort(compareArticles);
        })
        .catch(function (error) {
            articleLoadFailed = true;
            console.warn("文章加载失败：" + error.message);
        })
        .then(renderArticlePage);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initArticleLoader);
} else {
    initArticleLoader();
}
