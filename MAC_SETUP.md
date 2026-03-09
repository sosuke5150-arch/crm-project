# CRMシステム Mac環境構築手順書

## 前提条件

- macOS 12以降
- インターネット接続環境

---

## Step 1: Homebrewのインストール

Homebrewは macOS 用のパッケージマネージャーです。

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

インストール確認：

```bash
brew --version
```

---

## Step 2: Node.jsのインストール

```bash
brew install node
```

インストール確認：

```bash
node --version   # v18以上推奨
npm --version
```

---

## Step 3: GitHub CLIのインストール

```bash
brew install gh
```

インストール確認：

```bash
gh --version
```

---

## Step 4: GitHubにログイン

```bash
gh auth login
```

対話形式で以下を選択します：

1. `GitHub.com` を選択
2. `HTTPS` を選択
3. `Login with a web browser` を選択
4. 表示されたワンタイムコードをコピー
5. ブラウザが開いたらコードを入力して認証

ログイン確認：

```bash
gh auth status
```

---

## Step 5: リポジトリのクローン

```bash
git clone https://github.com/sosuke5150-arch/crm-project.git
cd crm-project
```

---

## Step 6: 依存パッケージのインストール

**サーバー側：**

```bash
cd server
npm install
cd ..
```

**フロントエンド側：**

```bash
cd client
npm install
cd ..
```

---

## Step 7: アプリの起動

ターミナルを **2つ** 開いて、それぞれ実行します。

**ターミナル 1（サーバー起動）：**

```bash
cd crm-project/server
node index.js
# → Server running on http://localhost:3001 と表示されればOK
```

**ターミナル 2（フロントエンド起動）：**

```bash
cd crm-project/client
npm start
# → ブラウザが自動で http://localhost:3000 を開く
```

---

## Step 8: 動作確認

ブラウザで `http://localhost:3000` にアクセスし、以下が表示されることを確認してください：

- サイドバーに「ダッシュボード」「顧客管理」「案件管理」が表示される
- ダッシュボードに集計数値が表示される

---

## トラブルシューティング

### ポートが使用中のエラーが出る場合

```bash
# 3001番ポートを使用しているプロセスを確認・終了
lsof -i :3001
kill -9 <PID>

# 3000番ポートの場合
lsof -i :3000
kill -9 <PID>
```

### npm install でエラーが出る場合

```bash
# npmのキャッシュをクリア
npm cache clean --force
npm install
```

### better-sqlite3 のビルドエラーが出る場合

Xcodeのコマンドラインツールが必要です：

```bash
xcode-select --install
npm install
```

---

## ディレクトリ構成（参考）

```
crm-project/
├── server/
│   ├── index.js          ← APIサーバー（ポート3001）
│   ├── db.js             ← SQLite接続・テーブル定義
│   └── routes/
│       ├── customers.js  ← 顧客API
│       └── deals.js      ← 案件API
└── client/
    └── src/
        ├── App.js
        ├── App.css
        └── components/
            ├── Dashboard.js
            ├── CustomerList.js
            └── DealList.js
```

---

*CRM System v1.0.0 — 2026.03.09*
