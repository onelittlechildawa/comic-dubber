# 漫画配音 AI

## 项目概述

这是一个全栈 Web 应用程序，允许用户上传漫画图片，并使用 Google Gemini AI 生成漫画的配音版本。

该应用程序由一个 React 前端和一个基于 Node.js 的无服务器后端函数组成。它被配置为在 Netlify 上部署。

**主要技术：**

*   **前端：** React, Vite
*   **后端：** Node.js, Express
*   **识别：** Google Gemini API（用于视觉和文本转语音）
*   **部署：** Netlify

## 入门

### 环境变量

后端需要一个 Google Gemini API 密钥。在项目根目录中创建一个 `.env` 文件，并添加以下内容：

```
GEMINI_API_KEY=your_api_key_here
```

### 本地运行

在本地运行整个应用程序的最简单方法是使用 Netlify CLI，它将同时处理前端开发服务器和无服务器后端函数的运行。

1.  **安装 Netlify CLI：**
    ```bash
    npm install -g netlify-cli
    ```

2.  **运行开发服务器：**
    ```bash
    netlify dev
    ```

这将在本地端口上启动前端，并使后端 API 在 `/.netlify/functions/` 下可用。`netlify dev` 命令读取 `netlify.toml` 文件以了解如何运行项目。

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

后端是一个无服务器函数。要在没有 Netlify CLI 的情况下在本地进行测试，您可以取消注释 `api/dub.js` 底部的服务器代码，并使用 Node.js 运行它。

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

## 部署

该项目被配置为在 Netlify 上部署。`netlify.toml` 文件指定了构建命令、发布目录和函数目录。只需将您的 Git 存储库连接到 Netlify，它将自动构建和部署您的应用程序。

## 贡献

欢迎 Fork 存储库并提交拉取请求。对于重大更改，请先打开一个问题来讨论您想要更改的内容。


# Comic Dubber AI

## Project Overview

This is a full-stack web application that allows users to upload a comic strip image, and it uses the Google Gemini AI to generate a dubbed audio version of the comic.

The application consists of a React frontend and a Node.js-based serverless backend function. It is configured for deployment on Netlify.

**Key Technologies:**

*   **Frontend:** React, Vite
*   **Backend:** Node.js, Express
*   **AI:** Google Gemini API (for both vision and text-to-speech)
*   **Deployment:** Netlify

## Getting Started

### Environment Variables

The backend requires a Google Gemini API key. Create a `.env` file in the root of the project and add the following:

```
GEMINI_API_KEY=your_api_key_here
```

### Running Locally

The easiest way to run the entire application locally is to use the Netlify CLI, which will handle running the frontend development server and the serverless backend function simultaneously.

1.  **Install Netlify CLI:**
    ```bash
    npm install -g netlify-cli
    ```

2.  **Run the development server:**
    ```bash
    netlify dev
    ```

This will start the frontend on a local port and make the backend API available under `/.netlify/functions/`. The `netlify dev` command reads the `netlify.toml` file to understand how to run the project.

### Running Frontend and Backend Separately (for development/debugging)

#### Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

#### Backend

The backend is a serverless function. To test it locally without the Netlify CLI, you can uncomment the server code at the bottom of `api/dub.js` and run it with Node.js.

1.  **Navigate to the api directory:**
    ```bash
    cd api
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the server (after uncommenting the server code in `api/dub.js`):**
    ```bash
    node dub.js
    ```

## Deployment

This project is configured for deployment on Netlify. The `netlify.toml` file specifies the build command, publish directory, and functions directory. Simply connect your Git repository to Netlify, and it will automatically build and deploy your application.

## Contributing

Feel free to fork the repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.
