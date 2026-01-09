# 项目部署指南

## 方式一：阿里云 OSS (对象存储) - 你提到的方式

阿里云 OSS 可以作为静态网站托管服务使用。

**费用说明**：
- **存储费**：非常便宜（几分钱/月）。
- **流量费**：按访问流量计费（00:00-08:00 闲时流量更便宜，平时约 0.5元/GB）。
- **注意**：如果不绑定自定义域名，直接使用 OSS 自带域名，在微信等某些环境中可能会被拦截或提示“下载”而不是直接预览。

**部署步骤**：

1.  **构建项目**
    在终端运行以下命令，生成 `dist` 目录：
    ```bash
    npm run build
    ```

2.  **创建 Bucket**
    - 登录阿里云控制台 -> 对象存储 OSS。
    - 创建 Bucket：
        - 区域：选择离你（或用户）近的区域（如华东1-杭州）。
        - 存储类型：标准存储。
        - **读写权限：公共读** (必须，否则无法访问)。

3.  **配置静态页面**
    - 进入刚创建的 Bucket。
    - 左侧菜单选择 **数据管理** -> **静态页面**。
    - 设置 **默认首页** 为 `index.html`。
    - 设置 **默认 404 页** 为 `index.html` (这对 React 单页应用很重要)。

4.  **上传文件**
    - 进入 **文件管理** -> **文件列表**。
    - 将项目根目录下 `dist` 文件夹里的**所有内容**（包括 `assets` 文件夹、`index.html` 等）上传到 Bucket 根目录。

5.  **访问**
    - 在 **概览** 页面找到 **Bucket 域名** (外网访问 Bucket 域名)，在手机浏览器输入该地址即可访问。

---

## 方式二：Vercel (推荐 - 永久免费)

Vercel 是目前最流行的前端托管平台，对个人开发者永久免费，速度尚可，且自带 HTTPS。

**优势**：完全免费，自动从 GitHub 部署，无需手动上传。

**部署步骤**：

1.  **将代码提交到 GitHub**
    - 如果你还没有 GitHub 仓库，请先创建一个并推送代码。

2.  **注册/登录 Vercel**
    - 访问 [vercel.com](https://vercel.com/)，使用 GitHub 账号登录。

3.  **导入项目**
    - 点击 "Add New..." -> "Project"。
    - 在列表中找到你的 GitHub 仓库 (`mini-tools`)，点击 "Import"。

4.  **配置并部署**
    - Framework Preset 选择 `Vite`。
    - 点击 "Deploy"。
    - 等待约 1 分钟，部署完成后会给你一个免费域名（如 `mini-tools-xxx.vercel.app`），手机可直接访问。

---

## 方式三：GitHub Pages (完全免费)

如果你不想用 Vercel，GitHub 自带的 Pages 服务也是完全免费的。

**部署步骤**：

1.  **安装 gh-pages 工具**
    ```bash
    npm install gh-pages --save-dev
    ```

2.  **修改 package.json**
    在 `package.json` 中添加 `homepage` 字段和 `scripts`：

    ```json
    {
      "homepage": "https://你的用户名.github.io/你的仓库名",
      "scripts": {
        // ... 其他脚本
        "predeploy": "npm run build",
        "deploy": "gh-pages -d dist"
      }
    }
    ```

3.  **部署**
    ```bash
    npm run deploy
    ```
    部署成功后，在 GitHub 仓库的 Settings -> Pages 中可以看到访问链接。
