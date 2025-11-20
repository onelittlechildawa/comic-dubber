# 漫画配音 AI

## 项目概述

这是一个全栈 Web 应用程序，允许用户上传漫画图片，并使用 Google Gemini AI 生成漫画的配音版本。

该应用程序由一个 React 前端和一个基于 Node.js 的无服务器后端函数组成。它被配置为在 vercel 上部署。

**主要技术：**

*   **前端：** React, Vite
*   **后端：** Node.js, Express
*   **识别：** Google Gemini API（用于视觉和文本转语音）
*   **部署：** Vercel

## 入门

### 部署到 vercel

Fork 本项目，然后在 vercel 上部署。

可用的环境变量：

```
GEMINI_API_KEY=
GENAI_API_BASE_URL=
```

### 本地运行

在本地运行整个应用程序的最简单方法是使用 Vercel CLI，它将同时处理前端开发服务器和无服务器后端函数的运行。

后端需要一个 Google Gemini API 密钥。在项目根目录中创建一个 `.env` 文件，并添加以下内容：

```
GEMINI_API_KEY=your_api_key_here
```

1.  **安装 Vercel CLI：**
    ```bash
    npm install -g vercel
    ```

2.  **运行开发服务器：**
    ```bash
    vercel dev
    ```

### 分别运行前端和后端（用于开发/调试）

#### 前端

1.  **导航到前端目录：**
    ```bash
    cd frontend
    ```

2.  **安装依赖项：**
    ```bash
    npm install
    ```

3.  **启动开发服务器：**
    ```bash
    npm run dev
    ```

#### 后端

后端是一个无服务器函数。要在没有 Vercel CLI 的情况下在本地进行测试，您可以取消注释底部的服务器代码，并使用 Node.js 运行它。

1.  **导航到 api 目录：**
    ```bash
    cd api
    ```

2.  **安装依赖项：**
    ```bash
    npm install
    ```

3.  **运行服务器（在 `api/dub.js` 中取消注释服务器代码后）：**
    ```bash
    node dub.js
    ```



# Comic Dubber AI

## Project Overview

This is a full-stack web application that allows users to upload a comic strip image, and it uses the Google Gemini AI to generate a dubbed audio version of the comic.

The application consists of a React frontend and a Node.js-based serverless backend function. It is configured for deployment on Netlify.

**Key Technologies:**

*   **Frontend:** React, Vite
*   **Backend:** Node.js, Express
*   **AI:** Google Gemini API (for both vision and text-to-speech)
*   **Deployment:** vercel

