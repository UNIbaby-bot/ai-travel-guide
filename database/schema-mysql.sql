-- ============================================================
-- 走部落 TribeWalk — MySQL 版資料庫結構
--
-- 這是網站目前實際連線使用的資料庫版本！`backend/config/db.php` 裡的
-- `$USE_MYSQL = true` 預設連的就是這份結構建出來的 MySQL 資料庫（`tribewalk_1`）。
-- 如果想切回 SQLite（開箱即用免裝 MySQL），把 `$USE_MYSQL` 改成 `false` 即可，
-- 那個模式對應的是 database/schema.sql，兩份檔案的資料表結構完全對應。
--
-- 使用方式（第一次建立資料庫、或想重灌乾淨資料時）：
-- 1. 打開 phpMyAdmin，建立一個新的資料庫，取名 tribewalk_1，
--    字元集選 utf8mb4_unicode_ci（中文才不會變亂碼）
-- 2. 點選這個新資料庫 → 上方「匯入」分頁 → 選擇這個檔案 → 執行
-- 3. 匯入完成後，左側就會看到 categories、attractions、itineraries 等表格，
--    可以直接點資料列編輯、新增、刪除
-- ============================================================

-- 分類資料表（此專題以「族群」作為分類邏輯）
CREATE TABLE IF NOT EXISTS categories (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 景點資料表（category_id 為外鍵，關聯 categories，對應 B2 要求）
CREATE TABLE IF NOT EXISTS attractions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,   -- 部落／景點名稱
    city        VARCHAR(100) NOT NULL,   -- 縣市或鄉鎮
    category_id INT NOT NULL,            -- 族群分類（外鍵）
    image_url   TEXT,                    -- 圖片網址（AI 生成素材或其他來源）
    description TEXT,                    -- 介紹文字
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 完整遊程資料表（一個遊程包含多天、多個部落的路線規劃）
CREATE TABLE IF NOT EXISTS itineraries (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,  -- 遊程名稱
    region     VARCHAR(50) NOT NULL,   -- 區域（北部／中部／南部／東部）
    route_text TEXT NOT NULL,          -- 完整遊程路線（含天數與各部落順序）
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 管理員帳號資料表（保護管理後台，不開放公開註冊）
CREATE TABLE IF NOT EXISTS admins (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 會員資料表（一般訪客註冊用，跟 admins 後台管理員帳號是分開的系統）
CREATE TABLE IF NOT EXISTS members (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    username       VARCHAR(100) NOT NULL UNIQUE,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    avatar_url     TEXT,
    bio            TEXT,
    email_verified TINYINT(1) NOT NULL DEFAULT 0,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 景點評論（多面向星級評分 1~5）
CREATE TABLE IF NOT EXISTS reviews (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    member_id      INT NOT NULL,
    attraction_id  INT NOT NULL,
    rating_scenery INT NOT NULL,  -- 景觀環境
    rating_culture INT NOT NULL,  -- 文化真實性／導覽品質
    rating_access  INT NOT NULL,  -- 交通與可及性
    rating_value   INT NOT NULL,  -- 性價比
    rating_overall INT NOT NULL,  -- 整體推薦度
    title          VARCHAR(150),
    content        TEXT NOT NULL,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (attraction_id) REFERENCES attractions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 評論附加的照片／影片（先用網址形式儲存，尚未接真正的檔案上傳服務）
CREATE TABLE IF NOT EXISTS review_media (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    review_id  INT NOT NULL,
    media_type VARCHAR(20) NOT NULL, -- image / video
    url        TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 揪團
CREATE TABLE IF NOT EXISTS trip_groups (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    organizer_id    INT NOT NULL,
    attraction_id   INT,
    itinerary_id    INT,
    title           VARCHAR(150) NOT NULL,
    description     TEXT,
    contact_info    TEXT,          -- 聯繫方式（例如 Discord/Line ID），只顯示給已核准成員與發起人
    departure_date  DATE NOT NULL,
    review_deadline DATE,          -- 團主預計審核完成的截止日，讓申請者知道大概什麼時候會有結果
    max_members     INT NOT NULL DEFAULT 4,
    status          VARCHAR(20) NOT NULL DEFAULT 'open', -- open/full/closed/completed/cancelled
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES members(id),
    FOREIGN KEY (attraction_id) REFERENCES attractions(id),
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 揪團留言板（只有該團已核准成員與發起人可以留言/查看）
CREATE TABLE IF NOT EXISTS trip_group_messages (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    trip_group_id INT NOT NULL,
    member_id     INT NOT NULL,
    content       TEXT NOT NULL,
    reply_to_id   INT,          -- 回覆哪一則留言（NULL 代表是新的一則留言，不是回覆）
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_group_id) REFERENCES trip_groups(id),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (reply_to_id) REFERENCES trip_group_messages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 揪團成員（發起人建立團的時候會自動變成一名 approved 成員）
CREATE TABLE IF NOT EXISTS trip_group_members (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    trip_group_id        INT NOT NULL,
    member_id            INT NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending/approved/rejected
    application_message  TEXT,          -- 申請時的自我介紹／加入原因／對這趟旅行的想法
    joined_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_group_id) REFERENCES trip_groups(id),
    FOREIGN KEY (member_id) REFERENCES members(id),
    UNIQUE(trip_group_id, member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 旅伴互評（只有同團、都已核准的成員，且出發日期已過，才能互評）
CREATE TABLE IF NOT EXISTS companion_ratings (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    trip_group_id        INT NOT NULL,
    rater_id             INT NOT NULL,
    ratee_id             INT NOT NULL,
    rating_punctual      INT NOT NULL, -- 準時可靠
    rating_communication INT NOT NULL, -- 溝通互動
    rating_respect       INT NOT NULL, -- 尊重與禮貌
    rating_overall       INT NOT NULL, -- 整體體驗
    comment              TEXT,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_group_id) REFERENCES trip_groups(id),
    FOREIGN KEY (rater_id) REFERENCES members(id),
    FOREIGN KEY (ratee_id) REFERENCES members(id),
    UNIQUE(trip_group_id, rater_id, ratee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 種子資料：分類（族群）
INSERT INTO categories (name) VALUES
    ('泰雅族'), ('布農族'), ('排灣族'), ('鄒族'), ('阿美族'), ('賽德克族'), ('太魯閣族'), ('噶瑪蘭族'), ('魯凱族');

-- 種子資料：部落／景點
INSERT INTO attractions (name, city, category_id, image_url, description) VALUES
    ('寒溪部落', '宜蘭縣大同鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '部落內保留寒溪神社與吊橋等歷史遺跡，是宜蘭泰雅族群的重要聚落之一。'),
    ('樂水部落', '宜蘭縣大同鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '鄰近太平山與翠峰湖，是深入太平山區前認識泰雅族生活文化的入口部落。'),
    ('南澳部落', '宜蘭縣南澳鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '南澳鄉泰雅族主要聚落之一，鄰近莎韻之路等歷史步道。'),
    ('金岳部落', '宜蘭縣南澳鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '南澳地區泰雅族部落，鄰近武塔部落與莎韻之路歷史路線。'),
    ('武塔部落', '宜蘭縣南澳鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '南澳地區泰雅族部落，與莎韻之路的歷史故事相關。'),
    ('庫志部落', '桃園市復興區', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '位於角板山周邊山區的泰雅族部落，鄰近爺亨梯田與嘎拉賀溫泉一帶。'),
    ('嘎色鬧部落', '桃園市復興區', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '復興區泰雅族部落，可安排傳統生活體驗行程。'),
    ('東河部落', '苗栗縣南庄鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '南庄鄉山區部落，鄰近向天湖與鹿場部落，可安排部落生態體驗。'),
    ('鹿場部落', '苗栗縣南庄鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '南庄鄉山區部落，鄰近神仙谷、向天湖等景點。'),
    ('中興部落', '苗栗縣泰安鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '雪見地區周邊的泰雅族部落，鄰近雪見國家公園步道系統。'),
    ('梅園部落', '苗栗縣泰安鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '泰安鄉山區的泰雅族部落，鄰近天狗部落與雪見地區。'),
    ('天狗部落', '苗栗縣泰安鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '泰安鄉山區的泰雅族部落，鄰近梅園、象鼻等部落。'),
    ('象鼻部落', '苗栗縣泰安鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://placehold.co/1024x576?text=Tribe', '以泰雅染織工坊聞名，可體驗傳統織布工藝。'),
    ('清流部落', '南投縣仁愛鄉', (SELECT id FROM categories WHERE name = '賽德克族'), 'https://placehold.co/1024x576?text=Tribe', '又稱「川中島」，是霧社事件後遷居於此的賽德克族部落，設有餘生紀念館。'),
    ('眉溪部落', '南投縣仁愛鄉', (SELECT id FROM categories WHERE name = '賽德克族'), 'https://placehold.co/1024x576?text=Tribe', '仁愛鄉山區部落，鄰近夢谷瀑布，秋季為賞楓景點之一。'),
    ('萬大部落', '南投縣仁愛鄉', (SELECT id FROM categories WHERE name = '賽德克族'), 'https://placehold.co/1024x576?text=Tribe', '鄰近奧萬大森林遊樂區的賽德克族部落，周邊亦有泰雅族聚落分布，適合安排森林賞楓步道行程。'),
    ('親愛部落', '南投縣仁愛鄉', (SELECT id FROM categories WHERE name = '賽德克族'), 'https://placehold.co/1024x576?text=Tribe', '以親愛國小小提琴工藝班聞名，可體驗部落織布與木工工藝；仁愛鄉親愛村是泰雅族與賽德克族的混居地區。'),
    ('松林部落', '南投縣仁愛鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://placehold.co/1024x576?text=Tribe', '鄰近武界部落的布農族聚落。'),
    ('武界部落', '南投縣仁愛鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/%E6%AD%A6%E7%95%8C%E6%B0%B4%E7%94%9F%E8%95%A8.jpg/1920px-%E6%AD%A6%E7%95%8C%E6%B0%B4%E7%94%9F%E8%95%A8.jpg', '位於濁水溪源頭、四面環山的布農族部落，鄰近雲海與瀑布景觀，適合安排溪谷生態導覽行程。'),
    ('曲冰部落', '南投縣仁愛鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://placehold.co/1024x576?text=Tribe', '鄰近曲冰遺址，是認識濁水溪上游布農族生活史的重要據點。'),
    ('地利部落', '南投縣信義鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://placehold.co/1024x576?text=Tribe', '又稱達瑪巒，信義鄉布農族部落之一。'),
    ('雙龍部落', '南投縣信義鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://placehold.co/1024x576?text=Tribe', '信義鄉布農族部落，鄰近地利部落。'),
    ('巴庫拉斯部落', '南投縣信義鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://placehold.co/1024x576?text=Tribe', '位於濁水溪上游，地處偏遠的布農族部落。'),
    ('望鄉部落', '南投縣信義鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://placehold.co/1024x576?text=Tribe', '可眺望東谷沙飛（玉山）山景，並可安排獵人古道生態體驗。'),
    ('東埔部落', '南投縣信義鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://placehold.co/1024x576?text=Tribe', '鄰近八通關古道與東埔溫泉，是信義鄉重要的布農族聚落。'),
    ('羅娜部落', '南投縣信義鄉', (SELECT id FROM categories WHERE name = '布農族'), 'https://placehold.co/1024x576?text=Tribe', '信義鄉布農族部落，鄰近東埔溫泉區。'),
    ('吾拉魯滋部落', '屏東縣泰武鄉', (SELECT id FROM categories WHERE name = '排灣族'), 'https://placehold.co/1024x576?text=Tribe', '排灣語意為擁有多個小社區的大部落，部落入口有太陽、陶壺、百步蛇等排灣族傳統意象地標。'),
    ('高士部落', '屏東縣牡丹鄉', (SELECT id FROM categories WHERE name = '排灣族'), 'https://placehold.co/1024x576?text=Tribe', '牡丹鄉排灣族部落，鄰近旭海大草原，可安排生態導覽與工藝體驗。'),
    ('長治百合部落', '屏東縣長治鄉', (SELECT id FROM categories WHERE name = '排灣族'), 'https://placehold.co/1024x576?text=Tribe', '莫拉克風災後的永久屋聚落，居民主要來自排灣族與魯凱族部落，保留多元原鄉文化特色。'),
    ('水璉部落', '花蓮縣壽豐鄉', (SELECT id FROM categories WHERE name = '阿美族'), 'https://placehold.co/1024x576?text=Tribe', '花蓮壽豐鄉阿美族部落，鄰近陶甕百合春天等在地據點。'),
    ('池南部落', '花蓮縣壽豐鄉', (SELECT id FROM categories WHERE name = '阿美族'), 'https://placehold.co/1024x576?text=Tribe', '鄰近鯉魚潭風景區的阿美族部落。'),
    ('奇美部落', '花蓮縣瑞穗鄉', (SELECT id FROM categories WHERE name = '阿美族'), 'https://placehold.co/1024x576?text=Tribe', '瑞穗鄉阿美族部落，鄰近慕谷慕魚一帶山林景觀。'),
    ('馬太鞍部落', '花蓮縣光復鄉', (SELECT id FROM categories WHERE name = '阿美族'), 'https://placehold.co/1024x576?text=Tribe', '以馬太鞍濕地生態與阿美族傳統捕魚文化聞名。'),
    ('太巴塱部落', '花蓮縣光復鄉', (SELECT id FROM categories WHERE name = '阿美族'), 'https://placehold.co/1024x576?text=Tribe', '花蓮光復鄉重要的阿美族部落，以傳統祖屋與圖騰文化聞名。'),
    ('港口部落', '花蓮縣豐濱鄉', (SELECT id FROM categories WHERE name = '阿美族'), 'https://placehold.co/1024x576?text=Tribe', '鄰近石梯坪風景區的阿美族部落，以海稻田景觀聞名。'),
    ('靜浦部落', '花蓮縣豐濱鄉', (SELECT id FROM categories WHERE name = '阿美族'), 'https://placehold.co/1024x576?text=Tribe', '花蓮豐濱鄉阿美族部落，鄰近秀姑巒溪出海口。'),
    ('新社部落', '花蓮縣豐濱鄉', (SELECT id FROM categories WHERE name = '噶瑪蘭族'), 'https://placehold.co/1024x576?text=Tribe', '台灣少數保留噶瑪蘭族文化與語言的部落，鄰近海岸線梯田景觀，是體驗噶瑪蘭族生活文化的重要據點。'),
    ('撒固兒部落', '花蓮縣吉安鄉', (SELECT id FROM categories WHERE name = '太魯閣族'), 'https://placehold.co/1024x576?text=Tribe', '花蓮吉安鄉的太魯閣族部落，鄰近太魯閣風景區。'),
    ('森榮部落', '花蓮縣鳳林鎮', (SELECT id FROM categories WHERE name = '阿美族'), 'https://placehold.co/1024x576?text=Tribe', '鄰近林田山林業文化園區的阿美族部落，適合結合林業歷史與部落文化的輕旅行路線。'),
    ('紅香部落', '南投縣仁愛鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'images/attractions/honghsiang.jpg', '泰雅族部落，鄰近沙里仙溪峽谷地形，可安排峽谷生態與部落文化體驗行程。'),
    ('神山部落', '屏東縣霧台鄉', (SELECT id FROM categories WHERE name = '魯凱族'), 'images/attractions/shenshan.jpg', '魯凱族部落，鄰近舊好茶部落與霧台古道，保留石板屋建築與傳統工藝文化。'),
    ('來吉部落', '嘉義縣阿里山鄉', (SELECT id FROM categories WHERE name = '鄒族'), 'images/attractions/laiji.jpg', '位於塔山下的鄒族部落，部落內可見石雕與石板建築文化，鄰近得恩亞納等山區景點。'),
    ('樂野部落', '嘉義縣阿里山鄉', (SELECT id FROM categories WHERE name = '鄒族'), 'images/attractions/leye.jpg', '阿里山地區的鄒族部落，鄰近特富野古道，保留鄒族傳統家屋與生活文化。'),
    ('茶山部落', '嘉義縣阿里山鄉', (SELECT id FROM categories WHERE name = '鄒族'), 'images/attractions/chashan.jpg', '鄒族部落，鄰近溪流與瀑布景觀，部落積極發展生態與文化體驗遊程。'),
    ('司馬庫斯', '新竹縣尖石鄉', (SELECT id FROM categories WHERE name = '泰雅族'), 'https://upload.wikimedia.org/wikipedia/commons/5/52/Smangus.jpg', '海拔約1500公尺的山中部落，早期因對外道路不便而有「上帝的部落」之稱，部落內保留巨木群步道與泰雅族共食共作的生活方式。');
-- 種子資料：完整遊程（來自「部落觀光遊程」政府開放資料，交通部觀光署）
INSERT INTO itineraries (name, region, route_text) VALUES
    ('2日遊【台灣山脊～遺世獨立部落行】', '北部', '第一天：泰雅特色部落之旅：
崙埤泰雅生活館 →寒溪部落、寒溪神社、吊橋→樂水部落→太平山→遊翠峰湖→鳩之澤泡溫泉；
第二天：南澳不一樣的月光：
南澳部落→敏嘟奴泰雅工藝坊、納來麻谷工作坊→南澳社區發展鞋會泰雅創意製鞋工坊→金岳部落→武塔部落→莎韻之路'),
    ('2日遊【溫泉香楓部落行】', '北部', '第一天：桃園縣原住民文化會館→三民天主堂→基國派教堂→泰雅風味餐→爺亨梯田→嘎拉賀神木→嘎拉賀溫泉
第二天：庫志部落→嘎色鬧部落傳統生活體驗→泰雅風味餐→羅浮橋→巴陵橋→樂信瓦旦紀念公園'),
    ('2日遊【部落藝術生活探索】', '北部', '第一天：南庄石壁染織→瓦錄文化產業館→神仙谷→向天湖→午餐→東河及鹿場部落體驗→晚餐
第二天：雪見國家公園→中興部落→梅園部落→天狗部落→象鼻部落泰雅染織工坊'),
    ('3日遊【台灣山脊～部落賞楓之旅】', '中部', '第一天：清流部落巡禮（川中島）→眉溪部落夢谷賞楓→餘生紀念館→巴蘭社狩獵生活→人止關→莫那魯道紀念公園
第二天：萬大部落→上口台電宿舍觀景點→親愛國小萬大分校→奧萬大發電廠→奧萬大萬大部落→上口台電宿舍觀景點→親愛國小萬大分校→奧萬大發電廠→奧萬大
第三天：親愛部落織布工藝→親愛國小→部落工藝教室小提琴製作→松林部落之旅'),
    ('3日遊【台灣山脊～玉山部落探索】', '中部', '第一天：武界部落人文生態巡禮→武界吊橋→舊武界壩→曲冰隧道→松林舊部落→親愛部落
第二天：曲冰部落巡禮→曲冰遺址
第三天：地利村達瑪巒部落→雙龍部落巡禮→黑黑王國→巴庫拉斯部落探索'),
    ('2日遊【台灣山脊～玉山部落探索】', '中部', '第一天：望鄉部落巡禮→乜寇豆類媽媽的故事→眺望東谷飛沙→獵人古道生態體驗
第二天：東埔部落巡禮→羅娜部落巡禮→八通關古道生態體驗→東埔溫泉'),
    ('2日遊【屏東原鄉綜合旅程推薦】', '南部', '屏東→谷川大橋(全國最高橋)→三地門琉璃 (蜻蜓的眼淚DIY、景觀餐廳午餐) →原住民文化園區(原住民16族群)→禮納里(傳統美食DIY、家屋說故事、營火晚會)→接待家庭(體驗原鄉家庭接待文化、部落浪漫市集)→泰武有香(鼻笛爺爺的家、傳統石板屋、吉貝木棉林、吾拉魯滋部落音樂咖啡尋香) →順遊泗林平地森林園區或萬巒豬腳街→賦歸'),
    ('2日遊【屏北─琉璃禮讚】', '南部', '行程一：屏東→三地門(工藝步道)谷川大橋(全國最高橋墩座)→霧台(岩板巷、夜間生態觀察、觀星宿) →原住民文化園區(16族文化饗宴)→禮納里(臺灣普羅旺斯)→長治百合部落(88重建部落)→回程
行程二：屏東→谷川大橋(全國最高橋)→霧台(岩板文化巷、部落建築好特色、神山愛玉凍) →禮納里(家屋說故事、營火晚會)→接待家庭(體驗原鄉家庭接待文化、部落浪漫市集)→禮納里(產業中心)→原住民文化園區→三地門琉璃(蜻蜓的眼淚)→長治百合部落(產業館)'),
    ('1日遊【屏中─有藝機香】', '南部', '屏東→來義有藝(永不枯竭二峰圳→原裳月桃編藝術→五年祭刺福球→訪工藝坊) →春日有機(農家樂有機蔬菜園健康用餐、新鮮蔬果入荷)→泰武有香(鼻笛爺爺的家、傳統石板屋、吉貝木棉林、吾拉魯滋部落音樂咖啡)'),
    ('1日遊【屏南─山海全有味】', '南部', '行程一：屏東→南迴公路有景賞→獅子雙流森林遊樂區→滿州沙漠綠寶石→旭海大草原→原住民海味餐→石門古戰場→回程途經四重溪→回程
行程二：屏東→南迴公路有景賞→石門古戰場→高士部落心體驗(人文生態穀道巡禮、鑫文創DIY、採香菇、野牡丹花季、神社眺望太平洋美景)→旭海大草原→東源水上草原(哭泣湖、水上飛、野薑花田) →牡丹水庫→順遊四重溪→回程'),
    ('2日遊【Sibilian水璉部落認識老獵人的生活智慧】', '東部', '第一天：台北車站→花蓮火車站→水璉部落→陶甕百合春天→千禧山莊；
第二天：千禧山莊→奇美部落→鯉魚潭→尚攸農園→慕谷慕魚→花蓮火車站返程'),
    ('2日遊【來去花蓮當獵人】', '東部', '第一天：台北車站→花蓮火車站→撒固兒部落→太魯閣風景區→市區飯店
第二天：飯店→吉籟獵人學校→七星潭→花蓮火車站返程'),
    ('3日遊【山與海的浪漫】', '東部', '第一天：台北車站→花蓮火車站→奇萊亞酒莊→花蓮市區半日遊→市區飯店
第二天：飯店→池南部落→鯉魚潭→林田山→馬太鞍部落→飯店
第三天：飯店→太巴塱部落→新社部落→磯崎海濱→芭崎瞭望台→花蓮火車站返程'),
    ('3日遊【縱遊山海花蓮部落精緻之旅】', '東部', '第一天：台北車站→池南部落→鯉魚潭→林田山→馬太鞍部落→飯店
第二天：飯店→石梯坪風景區→港口部落→靜浦部落→住宿
第三天：飯店→磯崎海濱→芭崎瞭望台→水璉部落→七星潭→花蓮火車站'),
    ('2日遊【太魯閣之旅】', '東部', '第一天：台北車站→花蓮火車站→太魯閣族達基力→太魯閣半日遊→七星潭風景區→飯店
第二天：飯店→雲山水自然生態農場→森榮部落→馬太鞍部落→返程');