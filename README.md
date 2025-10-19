# AI Budget Tracker

全端就緒的 AI 智能記帳應用程式樣板，整合了記帳 CRUD、分析儀表板、挑戰機制、升級付費體驗與可選的雲端同步／AI 推薦服務。此專案以 React、Vite、TypeScript 與 Tailwind CSS 建置，可直接部署或作為企業級產品的起點。

## 🌟 主要功能

### 記帳核心
- 完整的新增、編輯、刪除與排序流程，並即時更新關鍵指標（累計、本月支出、平均、分類 Top）。
- 離線優先儲存：預設寫入瀏覽器 `localStorage`，同時支援設定遠端同步端點（GET/POST）以便在多裝置間備份資料。
- 同步狀態指示與手動重試按鈕，失敗時會顯示錯誤訊息供偵錯。
- CSV 匯出功能（在儀表板頁面）方便備份或匯入其他工具。

### 數據分析儀表板
- 月度支出折線圖、分類佔比圓餅圖與分類排行榜長條圖。
- 自動計算月度增減幅度、連續記帳天數與平均單筆金額。
- 重要洞察摘要（最大分類、最新紀錄、趨勢描述、累計紀錄數）。
- 一鍵匯出當前帳本為 CSV 報表。

### AI 助理
- 以聊天形式提供支出概覽、分類建議、月度趨勢等洞察。
- 免費方案每日限問 5 次；升級方案可解鎖無限制提問並串接自訂的 LLM API (`VITE_AI_ENDPOINT`)。
- 當遠端 AI 不可用時自動 fallback 成本地規則引擎，並回報錯誤。
- 顯示思考中狀態與剩餘提問次數，避免重複送出。

### 挑戰與節流
- 內建「連續記帳 7 天」、「本月 20 筆」、「支出控制在 NT$15,000 內」等挑戰卡片。
- 支援自訂節流挑戰：輸入月支出上限即可追蹤達成率，並以色彩區分安全/超標。
- 即時小結列出連續記帳天數、本月支出與最新紀錄。
- 自訂挑戰儲存在 `localStorage`，重新整理後仍保留。

### 方案與付費體驗
- `BillingPortal` 介面列出 Free / Pro / Enterprise 方案，支援月繳/年繳切換。
- `BillingProvider` 維護方案狀態與 14 天試用邏輯，並會在升級時強制呼叫金流端點 (`VITE_BILLING_PORTAL_ENDPOINT`) 建立結帳流程；若未設定端點，前台將無法選擇方案。
- 升級／取消／開啟客戶入口等操作具備錯誤提示與 loading 狀態。
- AI 助理會依方案自動調整提問限制與提示文案。

### 後台管理中心
- 開發者可在啟用 `VITE_ENABLE_ADMIN_CONSOLE` 後進入 `/admin` 控制台，集中顯示帳本筆數、累計支出、本月消費與分類覆蓋率等營運指標（預設在正式環境關閉）。
- 一鍵匯出 CSV、觸發遠端同步或清除本地資料，並提供狀態訊息協助排錯。
- 內建方案治理區塊，可直接切換 Free / Pro / Enterprise、取消訂閱或開啟客戶入口。
- 具備端點設定檢查與同步錯誤提示，方便掌握整體系統健康度。

### 測試與開發體驗
- 已安裝 Vitest 與 Testing Library（`npm run test`）用於單元測試；範例測試覆蓋金額格式、統計函式與 CSV 匯出。
- Tailwind 配色與 UI 元件（Card、AppShell）提供一致的霓虹風格主題。
- React Router 覆蓋主要頁面（記帳、分析、挑戰、付費），AppShell 內含同步狀態與方案徽章。

## 🔌 可設定環境變數
在 `.env` 或部署平台環境變數中設定以下鍵值，即可啟用進階整合：

| 變數 | 用途 |
|------|------|
| `VITE_SYNC_ENDPOINT` | 遠端同步 API。`GET` 需回傳 `{ records: LedgerRecord[] }`；`POST` 接收 `{ records }` 更新資料。 |
| `VITE_AI_ENDPOINT` | 進階 AI 推薦服務。會以 `POST` 傳入 `{ question, ledger }`，期待回傳 `{ reply: string }`。 |
| `VITE_BILLING_PORTAL_ENDPOINT` | 金流／客戶入口端點。`POST` 期望回傳 `{ redirectUrl }`，`GET` 回傳 `{ portalUrl }`。 |
| `VITE_ENABLE_ADMIN_CONSOLE` | 設為 `true` 以在開發或內部測試時顯示後台管理介面。 |

若未設定上述端點，系統將自動退化為離線模式（本地儲存與規則型 AI 回應）。

## 🧪 Scripts
- `npm install` – 安裝依賴。
- `npm run dev` – 啟動 Vite 開發伺服器。
- `npm run build` – 產生 Production Bundle。
- `npm run preview` – 預覽建置後的靜態檔案。
- `npm run test` – 以 Vitest 執行單元測試（此環境若無法安裝依賴，建議改於本機執行）。

## 📦 資料夾結構
- `src/modules/ledger` – 記帳頁面、Context、工具函式與單元測試。
- `src/modules/analytics` – 儀表板圖表與 CSV 匯出邏輯。
- `src/modules/ai` – AI 助理元件，串接計費與同步資訊。
- `src/modules/challenge` – 挑戰中心與自訂節流邏輯。
- `src/modules/billing` – 方案 Context 與升級頁面。
- `src/modules/admin` – 後台管理介面與營運工具。
- `src/components/layout` – AppShell 導覽與同步顯示。

## 🚀 部署提示
1. 若需雲端同步或金流，請先實作對應的 API 端點並填入 `.env`。
2. 在 CI 或本機執行 `npm run build` 驗證建置流程，必要時再跑 `npm run test` 確保邏輯穩定。
3. 以 Vercel、Netlify 或任何支援靜態檔案的主機部署 `dist/` 內容，並將環境變數同步至平台設定。

完成上述步驟後，即可提供具備 AI 助理、數據分析、挑戰與升級體驗的智慧記帳服務。

## 🚧 仍待補齊的能力
- **帳號與雲端同步後端**：目前所有資料與方案狀態僅儲存在瀏覽器 `localStorage`，只有設定 `VITE_SYNC_ENDPOINT` 時才會呼叫遠端 API，而且缺乏使用者帳號或權限控管；需要另外建置登入、身份驗證與多裝置同步服務，才能確保資料安全與一致。
- **真正的 AI/LLM 串接**：AI 助理預設透過前端規則產生回覆。若要提供高品質建議，需準備具備限流、錯誤處理與多輪對話記錄的後端 API，並實作金鑰管理或用量計費策略。
- **實際金流與方案管理**：前台升級流程現已強制呼叫 `VITE_BILLING_PORTAL_ENDPOINT` 建立結帳，但仍需要整合 Stripe 或其他金流供應商、驗證 webhook、同步權限，才能確保訂閱狀態與後端資料一致。
- **更全面的測試與 CI/CD**：現階段僅針對帳本工具函式提供 Vitest 範例測試。建議補齊 UI 行為、同步流程、挑戰與計費邏輯的測試，並設定 CI/CD 管線（如 GitHub Actions）確保每次部署前都會執行建置與測試。
- **擴充分析與報表**：儀表板主要針對即時紀錄做聚合。若要進一步支援月報、年度報表、PDF/CSV 匯出、提醒通知等功能，需要額外的資料模型與產出流程設計。
