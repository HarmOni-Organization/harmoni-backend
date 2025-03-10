# HarmOni Backend

## Overview

The **HarmOni Backend** is a **NestJS-powered API** that provides core functionality for the HarmOni platform. It handles **authentication, real-time media synchronization, user management, and more**.

This repository is part of the **HarmOni project**, an all-in-one entertainment hub that enables users to **watch together, track media, manage downloads, and interact with AI-powered features**.

---

## 📌 Features

✅ **Authentication & Authorization** (JWT-based authentication with access & refresh tokens)  
✅ **User Management** (Profile retrieval and updates)  
✅ **Real-time Media Sync** (WebSocket-based media synchronization)  
✅ **Chat & Room Management** (Manage synchronized viewing sessions)  
✅ **AI & Movie Search** (Integration with AI and external APIs for media search)  

---

## 📂 Project Structure

```
apps/backend
├── src
│   ├── auth                 # Authentication module (Login, Register, Token Management)
│   ├── user                 # User management module
│   ├── sync                 # Real-time media synchronization
│   ├── schemas              # MongoDB database schemas
│   ├── middlewares          # Custom middlewares (e.g., authentication)
│   ├── interceptors         # Global interceptors (e.g., logging, rate-limiting)
│   ├── dto                  # Data Transfer Objects for API validation
│   ├── constants            # App-wide constants
│   ├── filters              # Global error handling filters
│   ├── main.ts              # App entry point
│   ├── app.module.ts        # Root module
│   ├── app.service.ts       # Core service logic
│   ├── config               # Environment variable handling
│   ├── common               # Shared utilities & types
├── test                     # End-to-end testing
├── dist                     # Compiled output (for production)
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
└── yarn.lock                # Dependency lock file
```

---

## 🚀 Getting Started

### **1️⃣ Installation**

Ensure you have the following installed:

- **Node.js** (v16+ recommended)
- **Yarn** (preferred over npm)
- **MongoDB** (used as the primary database)

Clone the repository:

```sh
git clone https://github.com/HarmOni-Organization/harmoni-backend.git
```

Install dependencies:

```sh
yarn install
```

### **2️⃣ Configuration**

Copy the environment template and configure it:

```sh
cp .env.example .env
```

Modify the `.env` file to match your database and API configurations.

### **3️⃣ Running the Project**

#### **Development Mode**
```sh
yarn start:dev
```

#### **Production Mode**
```sh
yarn build
yarn start
```

---

## 🔗 API Endpoints

### **🔑 Authentication**
| Method | Endpoint               | Description                   |
|--------|------------------------|-------------------------------|
| `POST` | `/auth/register`       | Register a new user           |
| `POST` | `/auth/login`          | Authenticate user             |
| `GET`  | `/auth/verify-token`   | Validate access token         |
| `POST` | `/auth/refresh-token`  | Get a new access token        |
| `GET`  | `/auth/logout`         | Logout user                   |

### **👤 User Management**
| Method | Endpoint           | Description                |
|--------|-------------------|----------------------------|
| `GET`  | `/user/profile`   | Get user profile details  |
| `PATCH`| `/user/update`    | Update user information   |

### **📡 Real-Time Sync**
| Method | Endpoint               | Description                  |
|--------|------------------------|------------------------------|
| `POST` | `/sync/join-room`      | Join a synchronized session  |
| `POST` | `/sync/leave-room`     | Leave a session              |
| `GET`  | `/sync/get-room/:id`   | Retrieve room details        |

### **🎬 AI & Movie Search**
| Method | Endpoint                 | Description                        |
|--------|--------------------------|------------------------------------|
| `POST` | `/movies/search`         | Search for movies via AI          |
| `POST` | `/ai/extract-names`      | Extract movie names from metadata |

📌 **A complete Postman collection is available [here](https://alashthevoid.postman.co/workspace/HarmOni-workspace~438d8c99-8ccb-4544-97c2-75b10e23c8ff/collection/13990013-eba5dd01-8e75-4234-9d07-478bbbb85c15?action=share&source=collection_link&creator=13990013).**

---

## 🛠️ Development & Testing

### **Run Unit Tests**
```sh
yarn test
```

### **Run End-to-End Tests**
```sh
yarn test:e2e
```

### **Run Linter & Formatter**
```sh
yarn lint
yarn format
```

---

## 📝 License

HarmOni is **open-source** and distributed under the **MIT License**.

---

### 🎉 **Join the Development!**
Contributions are welcome! Feel free to fork the repo, submit issues, or send pull requests.

🚀 **Happy coding!** 🚀

---

### **What’s Improved?**
- **Better readability** with clear sectioning ✅
- **More developer-friendly formatting** ✅
- **Improved descriptions and explanations** ✅
- **Easier onboarding with clear steps** ✅
- **Added useful development/testing commands** ✅

Let me know if you need **further refinements** or **additional sections**! 🚀🔥
