# 本機安裝與啟動指南

## 1. 安裝需求
你需要在電腦上安裝：
- **PHP**（建議 8.0 以上，需啟用 `pdo_sqlite` 擴充套件，通常預設就有）
- （選用）**VS Code**：寫程式與編輯用
- （選用）**Git**：版本控制用

最簡單的方式：安裝 **XAMPP** 或 **Laragon**（Windows）／**MAMP**（Mac），
裡面已內建 PHP，不需要另外裝 MySQL（本專案預設用 SQLite，開箱即用）。

檢查是否已安裝 PHP，在終端機（命令提示字元）輸入：
```bash
php -v
```
如果有顯示版本號，代表已安裝好。

## 2. 啟動網站（前後端同一個指令一起跑）
在**專案根目錄**（也就是能同時看到 `frontend/` 和 `backend/` 資料夾的那一層）下執行：
```bash
php -S localhost:8000
```
- 第一次啟動時，程式會自動用 `database/schema.sql` 建立 `database/travel.sqlite`、灌入範例資料，
  並自動建立一組預設管理員帳號（帳號 `admin`／密碼 `admin123`）。
- 打開瀏覽器輸入 `http://localhost:8000/frontend/index.html`，就能看到網站首頁。
- 管理後台網址是 `http://localhost:8000/frontend/admin.html`，
  第一次會被導去登入頁 `login.html`，用預設帳密登入即可。
  **登入後請務必先到管理後台按「修改密碼」，把預設密碼換掉。**

> 為什麼前後端要用同一個指令一起跑？因為管理後台的登入狀態是靠瀏覽器的 session cookie，
> 如果前端網頁跟後端 API 是兩個不同的網址/port（例如一個 8000、一個 5500），
> 瀏覽器會把它們當成「不同來源」，登入的 cookie 可能不會正確送出，導致登入後又被當成沒登入。
> 用同一個 `php -S localhost:8000` 從專案根目錄啟動，前端頁面跟 API 都在同一個網址下，
> 就不會有這個問題。

## 3. 驗證後端 API 是否正常
瀏覽器打開 `http://localhost:8000/backend/api/attractions.php`，
若看到一段 JSON 資料，代表後端 API 已經成功運作。

## 4. 常見問題
- **改用 MySQL 後網站整個掛掉，錯誤訊息有 `could not find driver`**：代表你的 PHP 沒有啟用
  `pdo_mysql` 擴充套件。終端機輸入 `php -m | grep pdo_mysql` 檢查，如果沒有任何輸出，
  用 Homebrew 裝的 PHP 通常要在 `php.ini` 裡把 `;extension=pdo_mysql` 前面的分號拿掉再重啟，
  或直接把 `backend/config/db.php` 最上面的 `$USE_MYSQL` 改回 `false` 先用 SQLite。
- **開啟頁面沒有資料 / Console 出現錯誤**：確認你是用 `php -S localhost:8000`
  從「專案根目錄」啟動（不是從 `backend/` 資料夾內啟動），而且是打開
  `http://localhost:8000/frontend/index.html`，不是直接雙擊 `.html` 檔案
  （直接雙擊會變成 `file://` 開頭的網址，抓不到後端 API）。
- **登入後過一下子又變成沒登入**：通常是因為前端跟後端網址不同源（例如你自己另外開了
  `http://localhost:5500` 開前端），改成用上面第 2 步「同一個指令」啟動就會正常。
- **忘記管理後台密碼**：把 `database/travel.sqlite` 刪掉，重新啟動一次，
  系統會重新建立預設帳密 `admin` / `admin123`
  （⚠️ 這樣做也會清空你手動輸入的部落景點與遊程資料，請先自行備份重要資料）。
- **想改用 MySQL**：打開 `backend/config/db.php`，把最上面的 `$USE_MYSQL = true;`
  （目前預設就是 `true`，也就是網站現在連的是 MySQL，見下方第 5.1 節）；
  想切回 SQLite（開箱即用、免裝 MySQL）就改成 `$USE_MYSQL = false;`，其餘 API 程式碼不需要更動。
- **想部署到正式主機**：把整個專案放到有 PHP 環境的主機上，
  並確認 `frontend/` 與 `backend/` 相對位置維持不變即可（`api.js` 用的是相對路徑）。

## 5. 資料庫管理工具（開發用，選用）
如果你想要像以前學資料庫時用的 phpMyAdmin 那樣，直接用網頁瀏覽/新增/修改/刪除資料庫裡任何一張表的任何一列資料
（不用寫程式、不用透過網站的管理後台），可以用專案裡已經放好的 **Adminer**（`tools/adminer.php`，單一檔案的免安裝版
phpMyAdmin 替代品）：

1. 照第 2 步一樣，在專案根目錄執行 `php -S localhost:8000`
2. 瀏覽器打開 `http://localhost:8000/tools/index.php`（不是 `adminer.php`，`index.php` 幫 Adminer 加了一個小外掛，
   讓它可以用固定密碼登入沒有帳密機制的 SQLite——Adminer 4.7.9 之後預設會擋掉空密碼登入，直接開 `adminer.php`
   會卡在登入畫面出不去）
3. 登入畫面選擇系統：**SQLite 3**；帳號留空；**密碼填 `tribewalk`**（這是寫在 `tools/index.php` 裡的固定密碼，
   跟你資料庫本身無關，純粹是用來通過 Adminer 的登入檢查）；「資料庫」欄位填 **`../database/travel.sqlite`**
   （注意前面要加 `../`，因為 Adminer 是從 `tools/` 這個資料夾本身去找路徑，不是從專案根目錄）
4. 登入後就能看到 `categories`、`attractions`、`members`、`reviews`、`trip_groups` 等全部資料表，
   可以直接點選、編輯、新增、刪除任何一列，也能執行任意 SQL 查詢

> ⚠️ **這個工具只能在本機開發時使用，正式部署或上傳到公開伺服器前請務必刪除 `tools/` 這個資料夾**，
> 否則任何人都能透過這個網址直接看到、修改、刪除你資料庫裡的全部資料（包含會員密碼雜湊等敏感欄位），
> 沒有任何登入保護。它跟第 2 步提到的「管理後台」（`admin.html`）不一樣：管理後台是網站自己寫的頁面，
> 只能管理景點資料、且有登入保護；Adminer 是通用工具，能碰到全部的表，沒有額外的安全防護，單純方便你開發時檢查資料。

### 5.1 讓網站直接連到 MySQL（在 phpMyAdmin 改資料，網站會跟著變）
phpMyAdmin 只能連 MySQL/MariaDB，不能連 SQLite。如果你想要「在 phpMyAdmin 裡新增/修改/刪除的資料，
網站畫面會直接反映出來」，就要讓網站本身也連到同一個 MySQL 資料庫，而不是另外開一份練習用的拷貝。

**第一次設定（只要做一次）：**
1. 打開 phpMyAdmin → 新增一個資料庫，取名例如 `tribewalk_1`，字元集選 `utf8mb4_unicode_ci`
2. 點進這個資料庫 → 上方「匯入」分頁 → 選擇專案裡的 `database/schema-mysql.sql` → 執行
3. 匯入完成後左側會看到 `categories`、`attractions`、`itineraries` 等 11 張表格（種子資料也會一起灌進去）

**讓網站連過去：**
打開 `backend/config/db.php`，最上面已經有 `$USE_MYSQL = true;`（這就是現在的狀態），
下面 `getMysqlPDO()` 裡的連線設定要跟你的 MySQL 一致：
```php
$host   = '127.0.0.1';
$port   = '3306';
$dbName = 'tribewalk_1';   // 要跟你在 phpMyAdmin 建立的資料庫名稱一樣
$user   = 'root';
$pass   = '';                     // XAMPP 預設密碼是空的，如果你的 MySQL 有設密碼，填在這裡
```
如果你的 phpMyAdmin 左上角顯示的伺服器、帳號跟這裡不一樣（例如 MAMP 預設帳密常常是
`root` / `root`，連接埠是 `8889`），照著改成一樣的就好。改完存檔、重新整理網站，
之後在 phpMyAdmin 改的資料就會直接反映在網站上，管理後台新增/修改/刪除的資料也會直接寫回 MySQL。

> ⚠️ **重要取捨提醒**：
> 如果要馬上就能打開(不用MYSQL)要把 `$USE_MYSQL` 改回 `false`（就會自動切回本機的
> `database/travel.sqlite`，不需要任何額外設定），或至少在交專題前這樣切一次確認整個網站還能正常動。

## 6. Git / GitHub
```bash
cd ai-travel-guide
git init
git add .
git commit -m "init: AI 輔助旅遊景點推薦平台初始版本"
# 到 GitHub 建立一個新 Repository 後：
git remote add origin <你的 repository 網址>
git branch -M main
git push -u origin main
```
之後每完成一個功能，建議都個別 commit，例如：
```bash
git add .
git commit -m "feat: 新增景點搜尋與分頁功能"
git push
```
