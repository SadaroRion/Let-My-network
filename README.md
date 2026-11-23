# 二次元博客网站

站点名「星屑ノート」——一个简洁的二次元风格静态博客。

- **网站本体**：[projects/](projects/)　双击 `projects/index.html` 即可查看
- **运行说明**：[projects/README.md](projects/README.md)（含本地服务器命令、改文章、改配色）
- **预览图**：[预览图/preview.png](预览图/preview.png)（浅色）/ [preview-dark.png](预览图/preview-dark.png)（深色）/ [preview-mobile.png](预览图/preview-mobile.png)（手机端）

## 目录

```
二次元博客网站/
├── README.md
├── projects/            # 网站本体（部署时传这个文件夹里的内容）
│   ├── index.html
│   ├── 404.html
│   ├── robots.txt
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── posts.js     # 文章数据
│   │   └── app.js       # 路由 / 渲染 / 主题 / 樱花
│   ├── img/             # avatar.webp / persona.webp / daily.webp
│   └── README.md
└── 预览图/              # 只给本地看，不部署
    ├── preview.png
    ├── preview-dark.png
    └── preview-mobile.png
```

## 部署（免费静态托管）

站点是纯静态 + 哈希路由（`#/post/xxx` 只在浏览器里跳转），服务器只需要返回 `/` 处的 `index.html`，**不需要任何 rewrite / Node / 数据库配置**。

### 方式一：GitHub Pages（已配好 workflow，推荐）

仓库 `SadaroRion/Let-My-network` 已有 `.github/workflows/pages.yml`，它只把 `projects/` 目录发布到 Pages。

1. 打开 <https://github.com/SadaroRion/Let-My-network/settings/pages>
2. **Build and deployment** → **Source** 选 **GitHub Actions**，保存
3. 去 **Actions** 页 → 左侧 **Deploy blog to GitHub Pages** → **Run workflow**
4. 约一分钟后访问 `https://sadarorion.github.io/Let-My-network/`

之后每次 `git push` 到 `main` 都会自动重新部署。

### 方式二：Cloudflare Pages 直接上传（0 元，免 Git）

1. 打开 <https://dash.cloudflare.com/>，用邮箱注册并登录
2. 左侧 **Workers & Pages** → **Create** → **Pages** → **Upload assets**
3. 项目名填 `fatfish-blog`，把 `projects` 文件夹里的**全部内容**（index.html、css、js、img、404.html、robots.txt）拖进上传框
4. 点 **Deploy**，几秒后得到 `https://fatfish-blog.pages.dev`
5. 以后更新：进项目 → **Create new deployment** → 再拖一次
6. 想绑自己的域名：项目 → **Custom domains** → 输入域名，按提示去域名商加 CNAME

### 方式三：GitHub Pages 传统分支发布

1. 新建仓库 `fatfish-blog`（Public）
2. 把 `projects` 里的文件推到仓库根目录（`index.html` 在最外层）
3. 仓库 **Settings** → **Pages** → Source 选 `Deploy from a branch`，分支 `main`、目录 `/ (root)`，Save
4. 约一分钟后访问 `https://<你的用户名>.github.io/fatfish-blog/`

### 上线后要改的一处

`projects/index.html` 里的 `og:image` 现在是相对路径，部署后改成绝对地址，分享卡片才会带图：

```html
<meta property="og:image" content="https://fatfish-blog.pages.dev/img/persona.webp" />
```

## 本地预览

```bash
cd "E:\大肥鱼工作区\二次元博客网站\projects"
python -m http.server 8765
# 浏览器打开 http://127.0.0.1:8765/
```
