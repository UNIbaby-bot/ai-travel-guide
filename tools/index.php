<?php
// 這個檔案讓 Adminer 4.8.1 可以用「隨便填一個固定密碼」的方式登入 SQLite。
// SQLite 本身沒有帳密機制，但 Adminer 4.7.9 之後預設拒絕空密碼登入，
// 所以這裡套用官方的 login-password-less 外掛，指定一個固定密碼繞過這個檢查。
// 登入畫面：帳號留空，密碼填下面 password_hash() 裡的那組字（預設 tribewalk），資料庫填 database/travel.sqlite

function adminer_object() {
    include_once "./plugins/plugin.php";
    include_once "./plugins/login-password-less.php";
    return new AdminerPlugin(array(
        new AdminerLoginPasswordLess(password_hash("tribewalk", PASSWORD_DEFAULT)),
    ));
}

include "./adminer.php";
