# I 人夜店 - 報到系統

## 📋 系統說明

這是一個使用 JSON 文件存儲的簡單後端 API 系統，**無需安裝任何資料庫**。

## 🚀 快速開始

### 1. 安裝依賴

在項目目錄下打開終端，執行：

```bash
npm install
```

這會安裝 `express` 和 `cors` 兩個依賴包。

### 2. 啟動後端服務器

```bash
npm start
```

或者：

```bash
node server.js
```

您應該會看到：

```
==================================================
🚀 I人夜店 API 服務器已啟動！
==================================================
📍 本地訪問: http://localhost:3000
📱 手機訪問: http://[您的IP地址]:3000

💡 提示：
   - 數據存儲在 data.json 文件中
   - 無需安裝任何資料庫
   - 按 Ctrl+C 停止服務器
==================================================
```

### 3. 訪問網頁

**重要：** 請使用 `http://localhost:3000` 訪問網頁，**不要使用 Live Server**！

後端服務器會自動提供 HTML、CSS、JS 文件。

## 📱 手機訪問

如果想讓手機也能訪問：

1. 確保手機和電腦在同一個 WiFi 網路
2. 查看電腦的 IP 地址：
   - Windows: 打開命令提示符，輸入 `ipconfig`，找到 IPv4 地址
   - Mac: 打開終端，輸入 `ifconfig | grep "inet "`
3. 在手機瀏覽器輸入：`http://[您的IP地址]:3000`

例如：`http://192.168.1.100:3000`

## 📁 文件說明

- `server.js` - 後端 API 服務器
- `app.js` - 前端 JavaScript（已移除 Firebase）
- `index.html` - 主頁面
- `styles.css` - 樣式文件
- `data.json` - 數據存儲文件（自動創建）
- `package.json` - 項目依賴配置

## 🔧 常見問題

### Q: 為什麼不能使用 Live Server？

A: Live Server 只提供靜態文件服務，沒有 API 路由。後端服務器（server.js）提供了 API 接口，所以必須使用後端服務器來訪問。

### Q: 出現 404 錯誤怎麼辦？

A: 確保：

1. 後端服務器已啟動（運行 `npm start`）
2. 使用 `http://localhost:3000` 訪問，而不是 Live Server 的端口

### Q: 數據存儲在哪裡？

A: 所有數據存儲在 `data.json` 文件中，無需資料庫。

### Q: 如何重置數據？

A: 在後台管理頁面點擊「重置活動」按鈕，或直接刪除 `data.json` 文件。

## 📝 API 端點

- `GET /api/users` - 獲取所有用戶
- `PUT /api/users` - 批量更新用戶
- `PUT /api/users/:userId` - 更新單個用戶
- `GET /api/seats` - 獲取所有座位
- `PUT /api/seats/:seatId` - 更新座位
- `GET /api/orders` - 獲取所有訂單
- `POST /api/orders/:userId` - 創建訂單
- `GET /api/menu_status` - 獲取菜單狀態
- `PUT /api/menu_status` - 更新菜單狀態
- `DELETE /api/reset` - 重置數據
