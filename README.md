# Kano & Fuzzy AHP 計算 UI

這個專案提供一個簡單的網頁介面，用於根據上傳的 CSV 資料執行 Kano 模型分析和模糊層級分析法 (Fuzzy AHP) 計算。

## 功能

- 上傳 Kano 問卷回覆的 CSV 檔案。
- 計算每個特性的 Kano 分類 (Attractive, One-dimensional, Must-be, Indifferent, Reverse) 以及 CS (Customer Satisfaction) 和 DS (Customer Dissatisfaction) 係數。
- 上傳 Fuzzy AHP 成對比較問卷回覆的 CSV 檔案。
- 將 Saaty 量表評分轉換為三角模糊數 (TFN)。
- 使用幾何平均法聚合多位參與者的模糊判斷矩陣。
- 使用模糊幾何平均法計算模糊權重。
- 將模糊權重去模糊化為清晰權重 (Crisp Weights)。
- 計算一致性指標 (CI) 和一致性比率 (CR) 以檢驗 AHP 結果的可靠性。
- 顯示計算結果，包括 Kano 分類、CS/DS 係數、Fuzzy AHP 清晰權重、一致性檢驗結果以及基於權重的特性排序。

## 技術棧

- **前端:** HTML, CSS, JavaScript (Vanilla JS)
- **後端:** Node.js, Express
- **檔案處理:** Multer (檔案上傳), csv-parser (CSV 解析)
- **數學計算:** Math.js (矩陣運算、特徵值計算)

## 設定與執行

1.  **確保已安裝 Node.js 和 npm:**
    如果尚未安裝，請至 [Node.js 官網](https://nodejs.org/) 下載並安裝。

2.  **複製或下載此專案:**
    將所有檔案 (`index.html`, `style.css`, `script.js`, `server.js`, `package.json`) 放在同一個資料夾中。

3.  **安裝依賴套件:**
    在專案的根目錄下打開終端機或命令提示字元，執行以下指令：
    ```bash
    npm install
    ```
    這會根據 `package.json` 檔案下載所需的 Node.js 模組 (Express, Multer, csv-parser, Math.js)。

4.  **啟動伺服器:**
    在同一個終端機視窗中，執行：
    ```bash
    npm start
    ```
    或
    ```bash
    node server.js
    ```
    您應該會看到訊息 `伺服器正在監聽 http://localhost:3000`。

5.  **開啟應用程式:**
    打開您的網頁瀏覽器，並前往 `http://localhost:3000`。

## 資料格式要求

### Kano CSV 檔案

- 每一列代表一位參與者的回覆。
- 必須包含每個特性的功能性 (Functional) 和非功能性 (Dysfunctional) 問題的回覆。
- 欄位名稱應遵循模式：`CharacteristicName_func` 和 `CharacteristicName_dysfunc` (大小寫不敏感，空格會被底線取代)。例如：`Decentralization_func`, `Decentralization_dysfunc`, `Data_Ownership_func`, `Data_Ownership_dysfunc` ...
- 回覆值應為 1 到 5 的數字，對應：1:Like, 2:Must-be, 3:Neutral, 4:Live-with, 5:Dislike。
- 可以包含其他欄位 (例如 `participant_id`)，這些欄位會被忽略。

### Fuzzy AHP CSV 檔案

- 每一列代表一位參與者的回覆。
- 必須包含所有 66 個成對比較的結果 (12 個特性)。
- 欄位名稱應精確匹配 `C{i}_vs_C{j}` 的格式，其中 `i` 和 `j` 是特性的索引 (從 1 開始)，且 `i < j`。例如：`C1_vs_C2`, `C1_vs_C3`, ..., `C1_vs_C12`, `C2_vs_C3`, ..., `C11_vs_C12`。
- 回覆值應為 1 到 9 的 Saaty 量表數字。
- 可以包含其他欄位 (例如 `participant_id`)，這些欄位會被忽略。

## 注意事項

- Fuzzy AHP 計算，特別是特徵值計算，可能對輸入資料的品質敏感。不一致的判斷可能導致 CR > 0.1。
- CSV 檔案的編碼應為 UTF-8。
- 後端計算邏輯在 `server.js` 中。前端互動邏輯在 `script.js` 中。 