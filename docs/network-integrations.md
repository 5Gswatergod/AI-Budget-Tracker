# 網路與外部 API 操作指南

本文件說明所有需要聯網或呼叫外部 API 的功能，協助開發者在本地與部署環境中正確設定、測試與排錯。

## 1. 帳本遠端同步 (`VITE_SYNC_ENDPOINT`)

### 功能概述
- 目的：在多裝置間備份與同步帳本紀錄。
- 觸發時機：
  - App 啟動時嘗試從遠端下載最新紀錄。
  - 使用者在新增/編輯/刪除紀錄後，會透過 `POST` 將完整紀錄集推送到遠端。
  - AppShell 上的「重新同步」按鈕會強制觸發下載/上傳。

### API 規格
| 方法 | 路徑 | 請求內容 | 回應內容 |
|------|------|----------|----------|
| `GET` | `VITE_SYNC_ENDPOINT` | 無 | `{ records: LedgerRecord[] }` |
| `POST` | `VITE_SYNC_ENDPOINT` | `{ records: LedgerRecord[] }` | `{ ok: boolean }` 或 `201` 空回應 |

> `LedgerRecord` 物件格式：`{ id: string; date: string; category: string; amount: number; note?: string; createdAt: string; updatedAt: string }`

### 操作步驟
1. 建立可接受 GET/POST 的 REST 端點（如 Cloudflare Worker、Firebase Function 或自有後端）。
2. 確保 GET 回傳的資料依照上述格式排序，避免重覆或遺失欄位。
3. 部署後於專案根目錄建立 `.env` 並設定 `VITE_SYNC_ENDPOINT=https://your-api/sync`。
4. 重新啟動開發伺服器或重新部署，確認 AppShell 右上角顯示「雲端同步」狀態。
5. 於開發者工具 Network 面板觀察成功的 GET/POST 請求，確保 HTTP 狀態碼為 2xx。

### 錯誤排查
- **401/403**：確認端點是否需要身份驗證，若有請改為在前端加入 token header 或調整 CORS。
- **500/502**：檢查伺服器 log，確保 request body 能正確解析；必要時設定 `Content-Type: application/json`。
- **資料不一致**：檢查後端是否覆蓋舊紀錄；建議以 `updatedAt` 決定取捨，或於 API 回應最新資料集。

## 2. AI 助理與 LLM 推薦 (`VITE_AI_ENDPOINT`)

### 功能概述
- 目的：提供升級方案使用者即時的 AI 財務建議。
- 觸發時機：
  - 使用者送出問題且目前方案為 Pro/Enterprise（或在本地 mock 模式啟用）。
  - 每次送出會帶入完整帳本摘要與前端建議問題。

### API 規格
- 方法：`POST`
- Body：`{ question: string; ledger: { records: LedgerRecord[]; totals: TotalsSummary } }`
- 成功回應：`{ reply: string }`
- 失敗回應：可回傳 `{ error: string }` 或 `4xx/5xx` 狀態；前端會顯示錯誤訊息並 fallback 成規則型回應。

`TotalsSummary` 範例：
```json
{
  "monthlySpend": 15234,
  "topCategory": "餐飲",
  "streak": 6,
  "average": 530
}
```

### 操作步驟
1. 準備代理後端，負責與 OpenAI、Azure OpenAI 或其他 LLM 提供者溝通，避免在前端暴露 API Key。
2. 後端實作限流、錯誤重試與記錄，以防止超量使用或敏感資料外洩。
3. 在 `.env` 加入 `VITE_AI_ENDPOINT=https://your-api/ask`，並在部署平台同步設定。
4. 於升級方案狀態下（可在 `BillingPortal` 內升級），打開瀏覽器 Network 面板觀察 `POST /ask` 請求。
5. 若要進行本地測試，可使用 `MSW` 或自製 mock server 回傳固定 JSON。

### 錯誤排查
- **429 Too Many Requests**：在後端加入排程重試或自動提示使用者稍後再試；前端會顯示錯誤訊息。
- **CORS 錯誤**：於後端允許對應網域或在開發時開啟 `Access-Control-Allow-Origin: *`。
- **模型回傳格式錯誤**：確保 `reply` 欄位存在，否則前端會回退為本地回應。

## 3. 金流與客戶入口 (`VITE_BILLING_PORTAL_ENDPOINT`)

### 功能概述
- 目的：提供使用者升級方案、取消訂閱或進入既有的客戶管理入口（如 Stripe Customer Portal）。
- 觸發時機：
  - `BillingPortal` 中點擊「立即升級」或「客戶入口」按鈕。
  - `BillingProvider` 在啟動時檢查目前方案，必要時可透過此端點同步實際方案狀態。

### API 規格
| 操作 | 方法 | Body | 成功回應 |
|------|------|------|----------|
| 建立結帳頁 | `POST` | `{ plan: 'pro' | 'enterprise', billingCadence: 'monthly' | 'yearly' }` | `{ redirectUrl: string }` |
| 取得客戶入口 | `GET` | 無 | `{ portalUrl: string }` |

### 操作步驟
1. 在金流服務（如 Stripe）建立 Checkout Session 與 Customer Portal，並實作對應的後端 webhook。
2. 後端端點在收到 `POST` 時建立結帳連結，回傳 `redirectUrl`；前端會自動 `window.open` 該網址。
3. 於 `.env` 設定 `VITE_BILLING_PORTAL_ENDPOINT=https://your-api/billing`。
4. 測試升級流程：
   - 在 `BillingPortal` 選擇方案並提交，確認瀏覽器新分頁導向金流頁面。
   - 完成結帳後，確保 webhook 更新資料庫；可新增額外 API 讓前端確認目前方案。
5. 測試客戶入口：點擊「管理訂閱」按鈕，確認回傳的 `portalUrl` 正確開啟。

### 錯誤排查
- **無法開啟新頁面**：瀏覽器可能阻擋彈出視窗；前端已使用使用者操作事件觸發，可提示使用者允許彈出視窗。
- **回傳結構錯誤**：確保 JSON 欄位名稱正確，並使用 `application/json` Content-Type。
- **訂閱狀態不一致**：實作 webhook 或額外的 `/billing/status` 端點，由前端定期查詢。

## 4. 通用建議
- 使用 `.env.local` 管理本地環境變數，避免將私密資訊提交至版本控制。
- 若需在 CI/CD 中使用上述端點，建議於 pipeline 中設定對應變數並執行 `npm run build` 與 `npm run test` 進行驗證。
- 建立 staging 與 production 兩套端點，並在部署平台（如 Vercel、Netlify）分別設定環境變數，以避免測試資料污染正式資料。
- 為所有外部請求實作重試與 timeout，並在後端加入觀測（logs/metrics）追蹤使用狀況。

依照本指南完成設定後，所有需要聯網的功能即可在本地與雲端環境中穩定運作。
