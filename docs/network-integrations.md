# Network & External API Operations

本文件說明需要連線或呼叫外部 API 的功能，以及在 React Native / Expo 環境中如何設定、測試與排錯。

## 1. 雲端同步 (`/sync`)

| 條件 | 行為 |
| ---- | ---- |
| **環境變數** | `EXPO_PUBLIC_SYNC_ENDPOINT` |
| **觸發時機** | 開啟 App、手動點擊「立即同步」或 Admin Console 的「強制同步」 |
| **請求** | `GET /sync` 取得伺服器版本 → `POST /sync` 上傳 `dirty=1` 的紀錄 |
| **備註** | 失敗時 `syncStatus` 會標記為 `error`，同步按鈕顯示錯誤提示 |

### 操作步驟

1. 將 `.env` 或 EAS Secrets 中加入 `EXPO_PUBLIC_SYNC_ENDPOINT=https://api.example.com`。
2. 啟動開發伺服器 `npx expo start`，在模擬器或實機開啟 App。
3. 於 App Shell 點擊「立即同步」檢查成功訊息，或在 Admin Console 使用「強制同步」。
4. 若回傳非 200，請於 Metro logs 查看錯誤細節並確認後端 CORS / 認證設定。

### 疑難排解

- **`Sync pull failed`**：伺服器未正確回傳 `records` 陣列，或內容 JSON 格式錯誤。
- **`Sync push failed`**：請確認 `Content-Type: application/json` 與後端接受的欄位完全一致。
- **無法連線**：確保模擬器可存取內網服務，必要時使用 ngrok 轉址。

---

## 2. AI 助理 (`/ai/query`)

| 條件 | 行為 |
| ---- | ---- |
| **環境變數** | `EXPO_PUBLIC_AI_ENDPOINT` |
| **觸發時機** | 助理頁面送出問題時 |
| **請求** | `POST /ai/query` 包含最近 500 筆帳本資料及方案資訊 |
| **備註** | 未設定端點或失敗時會顯示「使用離線分析」並扣除同等額度 |

### 操作步驟

1. 設定 `EXPO_PUBLIC_AI_ENDPOINT=https://ai.example.com`。
2. 於助理分頁輸入問題，確認後端回傳 `reply` 字串。
3. 檢視 `latencyMs` 以了解端點效能；若需節流可於後端實作用量計費。

### 疑難排解

- **`AI request failed`**：HTTP 狀態非 200。請檢查 API 金鑰、授權或 SSL 憑證。
- **頻繁 fallback**：確認後端對相同問題是否有快取，或是否被防火牆阻擋。
- **429 / RATE_LIMIT**：前端會顯示限制提示，可於後端回傳 `resetAt` 給使用者明確時間。

---

## 3. 金流節點 (`/billing`)

| 條件 | 行為 |
| ---- | ---- |
| **環境變數** | `EXPO_PUBLIC_BILLING_ENDPOINT` |
| **觸發時機** | 升級方案按鈕、客戶入口按鈕 |
| **請求** | `POST /billing/checkout` 建立結帳、`GET /billing/portal` 取得入口 URL |
| **備註** | 未設定端點時按鈕會顯示「待設定金流」，防止前端直接改變方案 |

### 操作步驟

1. 在 `.env` 填入金流服務位址，例如 `https://billing.example.com`。
2. 於 Upgrade 分頁點選 Pro / Enterprise → 系統呼叫 `/billing/checkout`，自動開啟瀏覽器結帳。
3. 完成付款後，後端需透過 Webhook 或同步 API 更新方案狀態。
4. 使用「開啟客戶入口」按鈕測試 `/billing/portal` 是否回傳可用連結。

### 疑難排解

- **`Billing endpoint not configured`**：環境變數缺失或為空字串。
- **`Checkout failed`**：檢查後端是否允許跨網域請求，並記錄詳細錯誤訊息。
- **手機無法開啟連結**：請確認 `redirectUrl` 使用 `https` 且行動裝置可連線。

---

## 4. 開發者後台 (Admin Console)

Admin Console 透過 `EXPO_PUBLIC_ENABLE_ADMIN_CONSOLE=true` 顯示，僅供開發／測試使用。常見操作：

1. **強制同步**：會先上傳 `dirty` 紀錄，再呼叫 store 既有 `sync()` 流程。
2. **清空本地資料**：呼叫 SQLite `DELETE`，請在測試前備份重要資料。
3. **端點健檢**：顯示目前載入的環境變數，協助確認部署設定。

> 上線環境請勿打開此旗標，以避免客戶端看到開發者工具。

---

## 5. 測試建議

- **整合測試**：可使用 Jest + React Native Testing Library 模擬 `fetch`，驗證成功與失敗時的提示字樣。
- **E2E 測試**：透過 Detox 撰寫場景，例如「升級方案 → 完成 checkout 回傳 302」。
- **監控**：於後端建立日誌，記錄 `userId`、`plan`、`latencyMs` 等欄位，便於追蹤異常。
