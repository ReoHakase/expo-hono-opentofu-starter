# 開発環境と外部サービスの設定

2026年11月7日。GitHubは [ReoHakase/expo-hono-opentofu-starter](https://github.com/ReoHakase/expo-hono-opentofu-starter)、Expoは [@reohakase/expo-hono-opentofu-starter](https://expo.dev/accounts/reohakase/projects/expo-hono-opentofu-starter)。Expo project IDは `1f2d3048-c03b-4d7e-8220-7385b3875389`。

Google CloudのAPIキーはローカルSNS・認証開発に不要。Vercel EmulateでGoogle／Apple OAuthとメールを試せる。[認証とseed](auth.md)を参照。クラウドの初期構築にはログイン済みのGoogleアカウントと課金を有効化したプロジェクト、CIにはWorkload Identity Federationを使う。長期のサービスアカウントJSONキーは作らない。

## ホストOSの準備

Metro・API・DB・EmulateはCompose内、Expo Device Hubと仮想端末はホストで動かす。日常開発はDevelopment BuildとFast Refreshを使う。Device Hubは開発ツールのWeb画面であり、アプリをExpo Webへ移植するものではない。

| ホスト  | 仮想端末                        | ComposeとDevice Hubの実行場所    |
| ------- | ------------------------------- | -------------------------------- |
| macOS   | iOS Simulator・Android Emulator | どちらもMacのターミナル          |
| Ubuntu  | Android Emulator                | どちらもUbuntuのターミナル       |
| Windows | Android Emulator                | ComposeはWSL2、HubとADBはWindows |

共通でGit、Node.js（`.node-version` の版）、Portless 0.16.0、Docker Compose v2を用意する。ホストのBun 1.4.4は短縮コマンド用で、必須ではない。Device Hubは `npx --yes expo-device-hub@0.21.0 --host 127.0.0.1` で起動し、リポジトリやコンテナへ依存を追加しない。初回はnpmパッケージのダウンロードにインターネット接続が必要。

### macOS

1. Docker DesktopとXcodeをインストールして一度起動する。XcodeのSettingsからCommand Line ToolsとiOS Simulator runtimeを選ぶ。ライセンス・追加コンポーネントの初回設定を完了し、`xcodebuild -version` と `xcrun simctl list devices available` が成功することを確認する。
2. Android Studioの初回セットアップを完了し、SDK ManagerでAndroid SDK Platform-Tools、Android Emulator、Android SDK Command-line Toolsを入れる。
3. Device ManagerでAndroid API 36以上の専用AVDを作る。hosts編集のためroot可能なAOSP／Google APIs imageを選び、root不可のGoogle Play imageは使わない。Apple Siliconはarm64、Intel Macはx86_64のsystem imageを使う。
4. SDK Locationを確認してシェルのPATHを設定する。標準配置の場合は以下を使う。

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_USER_HOME="$HOME/.android"
export ANDROID_AVD_HOME="$ANDROID_USER_HOME/avd"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
adb version
emulator -list-avds
avdmanager list avd
```

Hubも同じ環境変数を設定したターミナルから起動する。XDG環境ではCLIが `$XDG_CONFIG_HOME/.android`、Android Studioが `$HOME/.android` を使う場合があるため、Device ManagerのAVD保存先と `ANDROID_AVD_HOME` を揃える。既存のAVDを移動・初期化する必要はない。Command-line Toolsを追加した後はHubを再起動する。

### Ubuntu

Docker公式のUbuntu向け手順でDocker EngineとCompose pluginを導入し、`docker info` と `docker compose version` を確認する。Android StudioとSDK／AVDはmacOSの手順と同じで、x86_64ホストにはx86_64のsystem imageを選ぶ。

```sh
sudo apt-get update
sudo apt-get install qemu-kvm
sudo usermod -aG kvm "$USER"
# グループ変更後はログアウトしてログインし直す
export ANDROID_HOME="$HOME/Android/Sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
emulator -accel-check
adb version
emulator -list-avds
```

SDK Locationが異なる場合はAndroid Studioの表示値を使う。`/dev/kvm` のアクセス権とBIOS／UEFIの仮想化支援を確認する。iOS SimulatorはUbuntuでは動かない。

### WindowsとWSL2

Docker DesktopのWSL2 backendと対象Ubuntuディストリビューションのintegrationを有効にする。リポジトリはWSLのLinuxファイルシステムへcloneし、Git・Node・Portless・Compose操作はWSLで行う。`/mnt/c` 上での開発はファイル変更検知とI/Oの問題を避けるため使用しない。

Android Studio、SDK、AVD、Node.jsとDevice HubはWindows側へ用意する。PowerShellで以下を実行する。SDKはAndroid Studioに表示された場所を優先する。

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator;$env:Path"
adb version
emulator -list-avds
npx --yes expo-device-hub@0.21.0 --host 127.0.0.1
```

Device HubとADBをWSL内から起動してWindowsのSDKと混在させない。後述の `dev:devices` がWSLで表示する `adb reverse` の行をWindowsのPowerShellへコピーする。WSL側のPortless公開CA（`ca.pem`）と生成した `.env.devices.hosts` もWindows側の作業フォルダへコピーする。秘密鍵の `ca-key.pem` はコピーしない。WindowsからWSLの公開ポートへはlocalhost転送を使う。AVD起動に必要なWindowsのハイパーバイザー設定はAndroid Studioの案内に従う。

## 1. cloneとworktreeの準備

コード・設定・文書の変更は、Issueの起票または既存Issueの確認と担当設定から始める。Issueに対応するブランチで実装・検証し、コミット・push・Draft PR作成まで進める。詳細は [AGENTS.md](../AGENTS.md#issue--branch--pr)、独自UIの追加は [UI開発手順](ui.md)を参照。

ローカルのAPI・Metro・PostgreSQLはすべてDocker Composeで動かす。ホストにGit、Docker Engine + Compose v2、Node.js 24以降、Portless **0.16.0** を用意する。Compose連携は0.16.0で追加されたため、0.15系では起動できない。ホストのBunは任意。WindowsではWSL2のLinuxファイルシステムを使う。

```sh
npm install --global portless@0.16.0
git worktree add -b codex/my-change ../my-change HEAD
cd ../my-change
sh scripts/worktree-init.sh
```

POSIXの初期化処理が実パス由来のID・Compose名・mount先をルートのGit管理外 `.env` へ保存する。branch変更やdetached HEADでもIDは変わらない。checkoutとGit共通ディレクトリをホストと同じ絶対パスでmountするため、linked worktreeでもGitが動く。`node_modules`、ルートの生成 `.env`、DB volumeは他worktreeからコピーしない。

### 環境変数の読み込み

アプリ内の環境変数は各 `apps/*/src/env.ts` 経由で読み込む。envalidが必須値・URL・ポート等を検証し、不正な設定では値を含めず項目名を通知する。変数を追加するときは対応する `src/env.ts`、`.env.example`、Turborepoのenv宣言を更新する。

API起動・seedはDATABASE_URL、32文字以上のBETTER_AUTH_SECRET、BETTER_AUTH_URLが必要で、本番のauth URLはHTTPSにする。DB migrationはDATABASE_URLだけで実行できる。Google／Apple等の任意項目の空値は未設定として扱う。AUTH_EMULATEはenvalidのboolean形式で読み込む（通常は `true` / `false`）。

mobileの `EXPO_PUBLIC_API_URL` と `EXPO_PUBLIC_PASSKEY_RP_ID` は任意。API URLは絶対URL、RP IDはスキームを含めないホスト名を設定する。API URLが空ならComposeのDEV_API_ORIGINをapp configで補完し、どちらもなければAPI未接続の案内を表示する。`EXPO_PUBLIC_*` はbundleへ埋め込まれるためsecretを設定しない。

### 起動・接続・停止

ホストで共有HTTPS/443 proxyを一度起動する。tablecast-poc等の既存のproxyは再利用する。初回のローカルCA登録や管理者認証はホストの対話ターミナルで行う。既存proxyがHTTPの場合は、そのホストで利用中のworktreeを止め、`portless proxy stop` の後に以下のHTTPS proxyを起動する。この切替はホスト全体で一度行う。

```sh
portless proxy start --https --port 443
# CAの信頼登録を後から行う場合
portless trust
PORTLESS_HTTPS=1 PORTLESS_PORT=443 portless compose up --build api metro
```

Composeが依存導入・未作成のアプリenv生成・PostgreSQLのhealthcheck・migrationを行う。APIはmigration後に起動し、MetroはDBを待たず起動する。APIのみなら末尾を `api`、DBなしのMetroのみなら `metro` にする。内部ポートはAPI 8080、Metro 8081、DB 5432。Google／Apple／メールのEmulateもAPIの依存として起動する。PostgreSQLはホストへ公開せず、PortlessがHTTPサービスにloopback上の空きポートを割り当てる。

| サービス    | ホストからのURL                                           |
| ----------- | --------------------------------------------------------- |
| API         | `https://api.expo-hono-opentofu-starter-<ID>.localhost`   |
| Metro / Web | `https://metro.expo-hono-opentofu-starter-<ID>.localhost` |

URL形式は `https://<service>.<repo>-<worktree ID>.localhost`。ホストのブラウザ用であり、iPhone/Android実機は後述のHTTPSトンネルを使う。API・Metroの内部通信は引き続きHTTPで、TLS終端はホストのPortlessが担当する。

実際のURLはPortlessが表示する。ホスト公開ポートは `portless compose port api 8080` / `portless compose port metro 8081` で確認できる。Portlessはprojectごとに割当を保持し、複数worktree間の衝突を避ける。開発では `.env` の空の `BETTER_AUTH_URL` をComposeのAPI originで補い、Metro originも許可originへ追加する。

```sh
# バックグラウンド起動
PORTLESS_HTTPS=1 PORTLESS_PORT=443 portless compose up -d --build api metro
# 自worktreeだけを終了。DBや認証設定のvolumeは保持する。
PORTLESS_HTTPS=1 PORTLESS_PORT=443 portless compose --profile '*' down
```

foregroundはCtrl+CでAPI・Metroとそのrouteを終了する。DB等の依存サービスも終了するには `portless compose --profile '*' down` を使う。detachedのrouteは `portless compose --profile '*' down` まで残る。同一worktreeへの `up` はCompose標準の再利用・更新となるため、既存コンテナへ接続する。別のworktreeは別projectとして起動する。

**API・Metroをplainな `docker compose up` で作り直すとPortlessのポート割当が失われるため、起動・再作成・終了は `portless compose` を使う。** `logs`、`exec`、`ps`、`restart` は通常のComposeでも使える。共有proxyの `stop` / `clean` / `--force` をworktreeの後片付けに使わない。

`setup` は既存アプリenvとsecretを保持する。ルート `.env` はCompose用の生成設定専用。トンネルURL等は `apps/api/.env` / `apps/mobile/.env` に置く。ローカルDBの `DATABASE_URL` はComposeが注入する。CI/Cloud Runでは明示した `DATABASE_URL` を使い、`bun run --cwd apps/api db:migrate` / `bun run --cwd apps/api test:integration` を直接実行する。

### Dev Containerで編集・検査する

worktreeをエディタで開いて **Reopen in Container** を実行する。`initializeCommand` がホストのPOSIX初期化を行い、Composeの `workspace` サービスとそのsetup・DB依存を起動する。API・Metroの公開ポートをエディタが再作成しないよう、`runServices` は編集用 `workspace` だけに限定する。

コンテナ内では `bun run check`、`bun run doctor`、`bun run export:mobile` 等を実行できる。Docker socketは渡していないため、Portlessの起動・停止コマンドはホストで実行する。エディタのport forwardは使わない。エディタを閉じてもサービスは停止しないので、作業終了時はホストで `portless compose --profile '*' down` を実行する。

自動依存導入は `--ignore-scripts` で共有Git hookを変更しない。Dev Containerの初回作成、またはホストの `bun install` / `bun run hooks:install` は同じGitリポジトリで順に行う。Lefthookが共有 `.git/hooks` を更新するためで、準備後のサーバーは並列起動できる。

### ホストのBunで短縮コマンドを使う

ホストにBun 1.4.4があれば以下のaliasを使える。サーバー本体は引き続きCompose内で動く。共通の `bun run compose <args>` がHTTPS/443設定をまとめ、BunとComposeのdotenv解釈の違いによるパスの変形を避けるため、生成したパス変数をCompose自身に読み直させる。

```sh
bun install --frozen-lockfile
bun run setup
bun run dev          # API・Metro（依存DBとmigrationを含む）
bun run dev:devices  # 仮想端末向けのHTTPS設定でAPI・Metroを起動
bun run devices      # ホストでDevice Hubを起動
bun run dev:api      # APIとDB
bun run dev:mobile   # Metroのみ。DB不要
bun run dev:go       # API・DBとExpo Go用トンネル付きMetro
bun run services:up  # API・DB・Metroをバックグラウンド起動
bun run db:migrate
bun run db:seed      # 4ユーザーの画像・8投稿・いいね。既存の利用者データは保持
bun run test:integration
bun run services:down
```

旧来のホスト実行モードと `compose.host.yaml`、独自のポート解決・プロセス監視スクリプトは廃止した。同じcheckoutのCompose project名・DB volume名は維持する。旧ホストプロセスが残っている場合は、そのターミナルでCtrl+Cしてから切り替える。

## 2. iPhone / Android から開く

### SimulatorとEmulatorで日常開発する

最初にDevelopment Buildを作り、仮想端末へインストールする。クラウドビルドは次のCLIまたはExpo dashboardから手動実行する。push・PRからは起動しない。

```sh
cd apps/mobile
bunx eas build --platform ios --profile development-simulator
bunx eas build --platform android --profile development
```

iOSのdevelopment-simulatorはApple Developer Program不要。成果物を展開した `.app` を起動中のSimulatorへドラッグするか、`xcrun simctl install booted /absolute/path/App.app` でインストールする。Androidは `adb devices -l` で対象を選び、`adb -s SERIAL install /absolute/path/app.apk` を実行する。`SERIAL` は実際の端末IDへ置き換える。共有用previewはMetroへ接続する開発クライアントではないため、この用途には使用しない。

Android StudioのSDKとJDKがあるホストでは、[Expo CLIでローカルビルド](https://docs.expo.dev/guides/local-app-development/)もできる。`apps/mobile` で `bunx expo run:android --no-bundler --device SERIAL` を実行する。MetroはCompose内のものを使い、インストール後は後述のHTTPS URLを開く。初回はGradle・NDK・Build-Toolsなどを取得する。SDKライセンスが未承諾ならAndroid Studioで確認・承諾する。生成された `android/` とAPKはGitへ追加しない。

worktreeルートへ戻り、ホストで次を実行する。

```sh
bun run dev:devices
bun run db:seed
# 別のホストターミナル
bun run devices
```

Bunをホストへ入れない場合、起動は `node scripts/devices.ts`、seedは `portless compose exec api bun run --cwd apps/api db:seed`、Hubは前述の固定版npxコマンドを使う。

`dev:devices` は既存のPortless Composeでサービスを起動し、Portlessの名前付きHTTPS URLを読み取る。Git管理外の `.env.devices` を生成し、`compose.devices.yaml` でアプリのAPI URLと認証の公開URLを揃える。アプリの `.env` は上書きしない。このモードの環境変数はアプリenvの保存値より優先される。内部のtoken／JWKS取得とDB・メール送信は引き続きComposeの内部アドレスを使う。

**HTTPのPortlessでは起動を完了できない。** Better AuthのExpo認可proxyはHTTPSの認可URLを要求する。HTTPへ書き換えるだけではGoogle／Apple Emulateのログインに失敗するため、先にホストのHTTPS proxyを準備する。既存のHTTP proxyを使っている別プロジェクトがあれば勝手に停止せず、その管理者と切替を調整する。helperはHTTPの選択を検出するとコンテナの再作成前に停止する。

別のstate directoryで起動済みのHTTPS proxyを使う場合は、その実際のパスをシェルへ明示する。起動・停止・CA取得を含む全コマンドに同じ値を引き継ぐ。Node／Portlessのコマンドへ渡す設定なので、rootの `.env.local` へ書くだけではなく `export` する。

```sh
export PORTLESS_STATE_DIR=/absolute/path/to/existing-https-state
bun run dev:devices
```

| 接続                                      | URL                                     |
| ----------------------------------------- | --------------------------------------- |
| ホスト・Simulator・Emulator               | `https://<service>.<project>.localhost` |
| APIからOAuthのtoken／JWKS取得・メール送信 | Compose内部のgoogle・apple・mail        |
| Device Hubのブラウザ画面                  | Hubが表示するホストのループバックURL    |

### iOS SimulatorのCAと名前解決

Portlessの公開CAを、使うSimulatorごとに一度登録する。ホストの信頼設定とは別で、新規Simulator作成・初期化後は再登録する。

```sh
xcrun simctl list devices available
xcrun simctl keychain SIMULATOR_UDID add-root-cert "${PORTLESS_STATE_DIR:-$HOME/.portless}/ca.pem"
portless hosts sync
```

`SIMULATOR_UDID` は対象IDへ置き換える。Portlessのhosts同期はmacOSの名前解決を揃えるための公式機能。SimulatorはホストのHTTPS proxyへ直接接続する。CA秘密鍵の持ち出しや証明書検証の無効化は不要。補助的にiOSのExpo Goで試す場合は `exps://<Metroのホスト>` を開く。端末用overrideはそのworktreeの `exps://` 復帰URLだけも許可し、通常のDevelopment Buildでは既存のアプリschemeを使う。

### Android EmulatorのCAと名前解決

AndroidではユーザーCAの追加だけで全アプリが信頼するわけではない。本リポジトリのconfig pluginはAndroidの **debug source setだけ** にNetwork Security Configurationを生成し、`.localhost` とそのサブドメインへの通信だけでユーザーCAを認める。通常のsystem CAは維持する。preview／productionはreleaseビルドなのでこの設定を含まない。変更後のDevelopment Buildを一度作り直す。AndroidのExpo Goにはこのアプリ設定を追加できないため、確認には使わない。

ホストで公開CAをコピーし、対象AVDへ送る。WindowsではWSLからコピーした `ca.pem` を送る。

```sh
adb devices -l
adb -s SERIAL push "${PORTLESS_STATE_DIR:-$HOME/.portless}/ca.pem" /sdcard/Download/portless-ca.crt
```

端末の設定で「セキュリティとプライバシー」→証明書のインストール→CA証明書を開き、Downloadの `portless-ca.crt` を登録する。Androidの版により項目名は異なる。アプリは登録されたCAで通常のTLS検証を行う。

Emulatorはホストのhostsファイルを引き継がないため、専用AVDのhostsにも生成した名前を登録する。これは実機やGoogle Play imageをroot化する手順ではない。対象の開発用AVDだけを一旦終了し、ホスト側で起動する。

```sh
emulator -avd AVD_NAME -writable-system -no-snapshot
# 別ターミナル
adb -s SERIAL root
adb -s SERIAL remount
adb -s SERIAL pull /system/etc/hosts .env.devices.android-hosts
```

`remount` がverity解除と再起動を要求した場合は、その専用AVDだけで `adb -s SERIAL disable-verity`、`adb -s SERIAL reboot` を行い、起動後にroot／remountをやり直す。root不可のimageならAOSP／Google APIsのAVDへ切り替える。

取得した `.env.devices.android-hosts` をエディタで開き、生成された `.env.devices.hosts` のコメントと1行を追記する。同じprojectの既存行があれば置き換え、元のlocalhost・IPv6・他worktreeの行は残す。Windowsでは同じファイルをWindows側で編集し、UTF-8・BOMなしで保存する。

```sh
adb -s SERIAL push .env.devices.android-hosts /system/etc/hosts
# dev:devicesが表示したproxyポートを使う。標準は443
adb -s SERIAL reverse tcp:443 tcp:443
```

すべてのサービス名が端末の127.0.0.1へ解決され、ADBがホストのPortlessへ転送する。Compose各サービスの動的ポートを端末へ転送する必要はない。Windowsでは上記のADB操作をPowerShellで行う。`-writable-system` のsystem変更はEmulator終了時に失われるため、次回起動時にもhostsを確認・再設定する。CAはAVDのユーザーデータを初期化しない限り保持される。

公式仕様は [EmulatorのDNS](https://developer.android.com/studio/run/emulator-networking-dns)、[書込み可能なsystem](https://developer.android.com/studio/run/emulator-commandline)、[AndroidのCA設定](https://developer.android.com/privacy-and-security/security-config) を参照する。

### 起動とFast Refresh

Hubが表示するURLをホストのブラウザで開き、準備したSimulator／Emulatorを選ぶ。Development BuildのEnter URLへ `dev:devices` が表示したMetroの **HTTPS URL** を入力する。ブラウザや端末に証明書エラーが出る場合は先にCA・名前解決を直す。

ソースを保存するとCompose内のMetroが変更を検知し、端末にFast Refreshで反映する。ネイティブ依存・config plugin・権限・URL scheme等を変更したときは手動でDevelopment Buildを作り直す。Device Hubは表示・操作を担当し、Fast Refreshの通信は端末とMetroが直接行う。

Google／Apple Emulateの公開URL、issuer、API callbackも同じHTTPS経路になる。メールの確認先は表示されたmail URLを使う。実Google／Appleの認証情報は不要。ネイティブPasskeyには実ドメインのOS関連付けが別途必要で、ローカルCAの登録だけでは保証しない。iPhone実機のHub画面転送も現行版では対象外。

### 再接続と停止

端末を再起動した場合は対象serialへ `adb reverse` を再設定する。新しいworktreeでは `dev:devices` を実行し、その名前をAndroidのhostsへ追加する。`.env.devices` とhosts生成ファイルを他worktreeの設定として流用しない。同じSimulator／Emulatorには同じアプリIDが入るため、worktree切替時はAPIのログイン状態も確認する。

HubはCtrl+C、Composeは `bun run services:down` で自worktreeだけを停止する。DB volumeは保持する。**HTTPS proxyの転送は同じ端末の全worktreeで共有する**ため、他worktreeがその端末を使っている間は解除しない。最後に `adb -s SERIAL reverse --remove tcp:443`（カスタムproxyなら表示されたポート）でその転送だけを解除する。`--remove-all` は使わない。hostsも不要になった自projectの行だけを削除する。共有proxyやCAをworktreeごとに停止・削除しない。

通常構成へ戻るときは `bun run dev` を使う。`.env.devices` は明示した端末用overrideだけが読み込む。`bun run test:integration` は起動済みDBを使い、依存サービスを通常構成で作り直さない。

### 接続のトラブルシュート

| 状態                       | 確認すること                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hubに端末が出ない          | ホストの `xcrun simctl list devices available` または `adb devices -l`／`emulator -list-avds` が成功するか。SDK LocationとHubの起動OSを確認する                       |
| StudioとHubでAVD一覧が違う | `avdmanager list avd` のPathとDevice Managerの保存先を比べ、同じ `ANDROID_USER_HOME`／`ANDROID_AVD_HOME` を使う。SDK Command-line ToolsとJDKも確認する                |
| Emulatorの描画が失敗する   | 専用AVDを停止し、`-no-window -gpu swiftshader` を付けて起動してHubで表示する。再起動時も `-writable-system -no-snapshot` を維持し、hostsとADB転送を再確認する         |
| ADBがunauthorized／offline | 端末のデバッグ承認と再接続を確認する。複数端末では必ず `-s SERIAL` を付ける                                                                                           |
| 名前を解決できない         | iOSは `portless hosts sync`、Androidは端末の `/system/etc/hosts` を確認する。ホストのhostsだけではAndroidに反映されない                                               |
| 証明書エラー               | 接続中のPortlessとCAが同じか、対象Simulator／AVDに登録したか確認する。Androidは変更後のdebug buildを使う。検証を無効化しない                                          |
| Metroに接続できない        | HTTPS URLの `/status` と、対象serialの `adb reverse --list` を確認する。古い転送先や端末選択を見直す                                                                  |
| APIやOAuthに接続できない   | APIの `/ready`、google／appleのhostsとHTTPS経路、issuerとcallbackを確認する。HTTP認可URLはBetter Authが拒否する                                                       |
| ログイン後に戻らない       | Development BuildとURL scheme、APIとEmulateが同じ起動設定か確認する。古い認証画面を閉じて再試行する                                                                   |
| 保存しても反映されない     | 端末のFast Refresh設定、Composeのmount先と編集worktreeを確認する。WSLではLinux側のファイルを編集する。単なる再読込と区別する                                          |
| Windowsだけ接続できない    | PowerShellの `Test-NetConnection 127.0.0.1 -Port 443` でWSLのproxyへ到達できるか確認する。Docker Desktopのintegration、WSLのlocalhost転送、ファイアウォールを確認する |

### まずExpo Goでショーケース

同じworktreeで起動中のMetroがあればCtrl+Cで止め、ホストのworktreeルートから実行する。

```sh
PORTLESS_HTTPS=1 PORTLESS_PORT=443 portless compose \
  -f compose.yaml -f compose.go.yaml up --build api metro
```

`compose.go.yaml` はMetroのコマンドだけを `expo start --go --tunnel ngrok --port 8081` へ変更する。表示されたQRコードをSDK 58対応のExpo Goで開く。iPhone・AndroidともPCと同じLANでなくても接続できる。SDK 58の既定ExpoトンネルはExpoログインを要求するため、ここでは導入済みの `@expo/ngrok` を明示して使う。URLは実行中だけ有効。

標準構成のMetroは `--lan`、`apps/mobile` には `tunnel` / `go` コマンドも残す。コンテナのLANアドレスは実機から直接到達できないため、実機はトンネル構成を使う。ホストブラウザではPortlessのMetro URLを開く。端末に `.localhost` を設定しない。

Composeでは空の `EXPO_PUBLIC_API_URL` を `app.config.ts` が開発API originで補う。Compose外でAPI未設定の場合、ホームには接続案内を表示する。タイムライン・投稿・いいねにはAPIが必要で、外観・触覚だけが端末内設定。

### ローカルAPIも実機から使う

Expo GoトンネルはMetro専用なので、APIには別のworktree別HTTPSトンネルを使う。起動中のAPIに対してホストで実行する。

```sh
PORTLESS_HTTPS=1 PORTLESS_PORT=443 portless compose --profile tunnel up -d api-tunnel
portless compose logs api-tunnel
```

ログの `https://....trycloudflare.com` を使い、次の2ファイルを編集する。

| ファイル           | 値                                                  |
| ------------------ | --------------------------------------------------- |
| `apps/api/.env`    | `BETTER_AUTH_URL=https://....trycloudflare.com`     |
| `apps/mobile/.env` | `EXPO_PUBLIC_API_URL=https://....trycloudflare.com` |

`portless compose restart api metro` で環境ファイルを読み直す。APIの `.env.example` には開発専用の `exp://**` originが含まれている。共有の本番APIにこのワイルドカードを入れない。実機の `localhost` は端末自身を指すため、localhost URLをモバイルへ設定しない。

Cloudflareトンネルは外向きTCP 7844が必要。`curl https://....trycloudflare.com/ready` が `{"status":"ready"}` になれば、タイムラインの閲覧・投稿を確認できる。Google／AppleのローカルEmulateは `.localhost` のため、APIトンネルだけでは実機OAuthを完了できない。実機認証には到達可能な検証APIと実プロバイダ設定を用意する。トンネルを作り直すとURLが変わる。普段は安定したstaging Cloud Run URLも使える。実機・公開トンネルの確認範囲は [docs/testing.md](testing.md) に記録する。

### Development BuildとPRプレビュー

Expo Goは初期確認に使う。PRのExpo Updateをインストールして試すにはDevelopment Buildを使う。

```sh
cd apps/mobile
bunx eas login
bunx eas project:info
bunx eas build --profile development --platform ios
bunx eas build --profile development --platform android
```

iPhone実機への内部配布にはApple Developer Program、端末登録、署名情報が必要。初回は対話形式で `bunx eas device:create` / `bunx eas credentials` を実行して登録する。Apple側の契約・端末承認はIaCで代替できない。クラウドビルドはEASの利用枠を消費する。

このプロジェクトではApple Developer Programは未契約のため、iPhoneではExpo Goを使う。Apple契約なしで作れるiOS SimulatorビルドはiPhoneへインストールできない。Androidのpreview APKは署名済みの単体アプリとして配布できる。

このリポジトリはEASに接続済みで、`build:configure` / `update:configure`も実行済み。設定はfingerprint runtime policy、development/preview/production channel。フォーク時は `eas init`、`eas build:configure`、`eas update:configure` で自分のプロジェクトへ再接続する。

### 共有用previewビルド

`preview` は `developmentClient: false` の単体アプリで、Androidは `.apk`、iOSはSimulator用 `.app` を生成する。MetroやExpo Goなしで起動できる。以前の `simulator` プロファイルは `preview` に統合した。

```sh
cd apps/mobile
bunx eas build --platform all --profile preview
```

このコマンドは手動で両OSのEAS Buildを起動し、ビルド利用枠を消費する。片方だけなら `--platform android` または `--platform ios` を指定する。ビルド結果ページのダウンロードリンクを共有し、AndroidはAPKを端末へインストールする。iOSはアーカイブを展開した `.app` をMacのXcode Simulatorへドラッグしてインストールする。Simulator版にApple Developer Programは不要だが、iPhone実機へはインストールできない。

SNS機能には到達可能なAPIが必要。ビルド前にEASの `preview` 環境の `EXPO_PUBLIC_API_URL` を共有staging APIのHTTPS URLへ設定する。ローカルの `.localhost` や開発用Emulateは共有相手の端末から利用できない。実プロバイダの認証・Passkeyには別途API側の設定が必要。API未設定のビルドでは接続案内が表示される。

## 3. GitHubとExpoの手動設定

### GitHub Actions

通常のCIはsecretなしで動く。GitHub Actionsは有効で、mainはPR経由の変更と `quality`、`infrastructure`、`container` の成功を必須に設定済み。最新mainへの追従、会話の解決も必要で、管理者にも適用する。承認人数は0、force pushとブランチ削除は禁止。フォーク時は初回CI成功後に同じ保護を設定する。

**Settings → Environments → production** は作成済みで、利用できるブランチをmainだけに制限している。フォーク時は作成し、必要に応じてrequired reviewerを指定する。デプロイ先の変数を設定する。

| 種別                 | 名前                             | 値・取得元                                                      |
| -------------------- | -------------------------------- | --------------------------------------------------------------- |
| Repository Variable  | `GCP_DEPLOY_ENABLED`             | 現在 `false`。GCP構築・secret投入・初期サービス作成後に `true`  |
| Environment Variable | `GCP_PROJECT_ID`                 | 対象GCP project ID                                              |
| Environment Variable | `GCP_REGION`                     | 例: `asia-northeast1`                                           |
| Environment Variable | `CLOUD_RUN_SERVICE`              | OpenTofuの `name`                                               |
| Environment Variable | `ARTIFACT_REPOSITORY`            | OpenTofuの `name`                                               |
| Environment Variable | `CLOUD_RUN_MIGRATION_JOB`        | `<name>-migrate`                                                |
| Environment Variable | `GCP_WORKLOAD_IDENTITY_PROVIDER` | `tofu output -raw workload_identity_provider`                   |
| Environment Variable | `GCP_SERVICE_ACCOUNT`            | `tofu output -raw deploy_service_account`                       |
| Repository Variable  | `EXPO_UPDATE_ENABLED`            | 現在 `false`。本番API、EAS環境、署名済みビルドの準備後に `true` |
| Environment Secret   | `EXPO_TOKEN`                     | 登録済み。ExpoのCI用access token                                |

例（値を確認してから実行）:

```sh
gh variable set GCP_PROJECT_ID --env production --body YOUR_PROJECT_ID
gh variable set GCP_REGION --env production --body asia-northeast1
# tokenは引数やGit管理ファイルへ書かず、対話入力する
gh secret set EXPO_TOKEN --env production
```

Google CloudのAPIキーやサービスアカウントJSONをGitHub Secretに登録する必要はない。`EXPO_TOKEN`はExpo account settingsのAccess Tokensから発行する。リポジトリ内、`EXPO_PUBLIC_*`、Issue本文へ貼らない。

登録したtokenの名称は `GitHub Actions: ReoHakase/expo-hono-opentofu-starter production`。対象を `reohakase` アカウントに限定し、権限は `VIEW` / `RUN` / `PUBLISH`。アカウント管理権限は含めない。更新時は同じ制限のtokenを発行してEnvironment Secretを差し替え、旧tokenを失効させる。

### 手動preview配信（GitHub Actions）

PRを作成・更新すると、`expo-hono-opentofu-starter preview` コメントだけを作成・更新する。**pushではExpoへ配信しない**。コメントの **🚀 previewを配信** チェックボックスを押すと、そのコメントに記載したSHAを両OSへ配信する。実行中・成功・失敗、配信SHA、OS別リンクとQRは同じコメントへ戻る。

Actionsの **Publish preview → Run workflow** から、branchを `main`、`pr` を公開中PRの番号として指定してもよい。

```sh
gh workflow run preview.yml --ref main -f pr=PR_NUMBER
```

- リポジトリのwrite権限を持つ利用者だけ実行できる。同一リポジトリからmainへ向けた公開中PRに限り、fork・bot操作・古いSHAのコメントは拒否する。
- `pull_request_target` はコメント更新だけに使い、信頼済みworkflowのコードのみ実行する。配信側も認可後に固定SHAをcheckoutし、依存インストール時にはExpo tokenを渡さない。
- GitHub Environment **preview** はmainからのworkflowだけを許可し、専用 `EXPO_TOKEN` を登録済み。token名は `GitHub Actions: ReoHakase/expo-hono-opentofu-starter preview`、対象は `reohakase`、権限は `VIEW` / `RUN` / `PUBLISH`。productionのtokenとは分ける。
- Expo公式 `expo/expo-github-action/preview` がGitHub runner上でbundle生成と `eas update` を実行する。**Expo Workflowsの60分枠は使わない**。GitHub Actionsの実行時間と、EAS UpdateのMAU・転送量・保存容量の枠は使う。
- 配信先はEAS environment `preview`、branch `pr-<番号>`。共通preview channelやproductionは上書きしない。対応するfingerprintのDevelopment Buildからリンク・QRを開く。Expo Goは従来どおりローカル開発サーバーを使う。

フォーク先ではGitHub Environment `preview` を同様に作り、Expo tokenを登録する。

```sh
# tokenは対話入力する。引数・リポジトリへ書かない。
gh secret set EXPO_TOKEN --env preview
```

この仕組みは `issue_comment` / `pull_request_target` を使うため、workflowをdefault branchへ取り込んだ後に有効になる。既に公開中のPRには、次のpushまたは手動実行でコメントを作成する。

### Expo GitHub連携・環境変数

Expoのログイン、EAS project、GitHubリポジトリの接続は完了済み。[プロジェクトのGitHub設定](https://expo.dev/accounts/reohakase/projects/expo-hono-opentofu-starter/github)のBase directoryは `/apps/mobile`。Expo側にあった自動PR preview・手動preview workflowは削除し、GitHub Actionsへ統一した。

フォーク・再設定時は以下を行う。

1. Expo dashboardでGitHub Appを対象リポジトリへ接続し、Base directoryを `apps/mobile` にする。
2. ExpoのEnvironment Variablesで `EXPO_PUBLIC_API_URL` をdevelopment/preview/productionそれぞれに設定する。公開URLなのでvisibilityはplain text。previewは共有staging API、productionは本番API。ローカル `.env` はクラウドへアップロードしない。未設定なら接続案内が表示され、SNS機能は利用できない。
3. GitHubのpreview Environmentへtokenを登録し、PRコメントまたはActionsから配信する。

`apps/mobile/.eas/workflows/native-builds.yml` は `workflow_dispatch` のみで、既定の `ios_profile=preview` / `android_profile=preview` によりiOS SimulatorとAndroid APKを作る。Expo dashboardから手動実行するか、`apps/mobile` で次を実行する。

```sh
bunx eas workflow:run .eas/workflows/native-builds.yml
```

Development Buildが必要なら、iOS Simulatorは `ios_profile=development-simulator`、Androidは `android_profile=development` を選ぶ。iOS実機用の `ios_profile=development` にはApple署名が必要。リポジトリにはpush・PR・定期実行からEAS Buildを起動する経路を設けない。Expo GitHub連携の自動buildトリガーも追加しない。PRコメントのpreview配信は既存ビルド向けのOTAであり、ネイティブビルドを作らない。

本番は従来どおり、APIデプロイ成功後だけ `production-update.yml` を呼び出す。このOTAと手動native build workflowはExpo Workflows側で実行する。ビルドだけなら前述の `eas build --platform all --profile preview` から直接起動でき、workflowを経由する必要はない。

Apple/Googleストアの契約・署名は別途必要で、TestFlight/ストア提出は自動実行しない。初期設定のビルド・端末確認記録は [検証](testing.md) を参照する。

## 4. Google Cloudの準備（認証情報が用意できてから）

### プロジェクト・課金・ローカル認証

Google Cloud Consoleでプロジェクトを作成して課金アカウントを接続する。初期構築担当には、API有効化、IAM/サービスアカウント、Cloud SQL、Run、Secret Manager、Storage、Artifact Registryを作成できる権限が必要。組織ポリシーでpublic Cloud RunやWIFが禁止されている場合は管理者側の設定が必要。

```sh
gcloud auth login --no-launch-browser
gcloud auth application-default login --no-launch-browser
gcloud config set project YOUR_PROJECT_ID
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com storage.googleapis.com
```

認証済みGCPプロジェクトへの変更はこの手順以降で発生し、Cloud SQL等に料金がかかる。今回はここ以降の実リソース作成は実行していない。

### State bucketのbootstrap

```sh
tofu -chdir=infra/bootstrap init
tofu -chdir=infra/bootstrap plan -var='project_id=YOUR_PROJECT_ID'
tofu -chdir=infra/bootstrap apply -var='project_id=YOUR_PROJECT_ID'
```

bootstrapのstateもbucketへ移す。`backend.tf` は生成ファイルとしてGit対象外。

```sh
cp infra/bootstrap/backend.tf.example infra/bootstrap/backend.tf
tofu -chdir=infra/bootstrap init -migrate-state \
  -backend-config='bucket=YOUR_PROJECT_ID-tofu-state' \
  -backend-config='prefix=bootstrap'
```

### アプリ用リソースの作成

```sh
cp infra/backend.hcl.example infra/backend.hcl
cp infra/terraform.tfvars.example infra/terraform.tfvars
# bucket/project_id/region/nameを編集
# github_repository_id はこのリポジトリでは 1446638863
# フォークでは gh api repos/OWNER/REPO --jq .id で取得
```

stagingとproductionは別のstate prefix、resource name、認証secret、DBを使う。最初は例の `expo-hono-opentofu-starter-staging` / `expo-hono-opentofu-starter/staging` を作成する。productionを用意するときは別の作業コピーで `name=expo-hono-opentofu-starter-production`、prefix `expo-hono-opentofu-starter/production` を設定し、stagingのstateを上書きしない。

```sh
tofu -chdir=infra init -backend-config=backend.hcl
# 一度生成した値はpassword managerへ保存し、以後のplan/applyでも同じ値を使用する
export TF_VAR_database_password="$(openssl rand -hex 32)"
tofu -chdir=infra plan
tofu -chdir=infra apply
```

初回は `deploy_application=false`。Cloud SQL、DBユーザー、Artifact Registry、Secret Managerの器、WIF/IAMまで作成し、未準備のイメージをCloud Runへ起動しない。

DBパスワードはephemeral/write-onlyのためstateに保存しない。次回は保存したパスワードを `TF_VAR_database_password` に設定する。ローテーション時は `database_password_version` も増やし、対応するSecret Manager値とアプリのrevisionも更新する。

### IaCで管理しないsecretの値

以下は自分のproject/nameへ置き換える。DB URLにはCloud SQLのUnix socketを使い、一般公開のDB接続許可は作らない。

```sh
export GCP_PROJECT=YOUR_PROJECT_ID
export RESOURCE_NAME=expo-hono-opentofu-starter-staging
SQL_CONNECTION=$(tofu -chdir=infra output -raw sql_connection_name)
printf 'postgresql://expo-hono-opentofu-starter:%s@localhost/expo-hono-opentofu-starter?host=/cloudsql/%s' \
  "$TF_VAR_database_password" "$SQL_CONNECTION" | \
  gcloud secrets versions add "$RESOURCE_NAME-database-url" --project="$GCP_PROJECT" --data-file=-
openssl rand -hex 32 | tr -d '\n' | \
  gcloud secrets versions add "$RESOURCE_NAME-auth-secret" --project="$GCP_PROJECT" --data-file=-
```

値はstdoutへ出さずstdinで渡す。`.tfvars`、GitHub、ExpoへDBパスワードを転記しない。

### 初回イメージ・サービス・migration

Docker操作はDockerを使えるホストで行う。Dev Container内にはホストのDocker socketを渡していない。

```sh
REGISTRY=$(tofu -chdir=infra output -raw registry)
gcloud auth configure-docker asia-northeast1-docker.pkg.dev
# Cloud Run向けはホストCPUにかかわらずlinux/amd64を生成する
docker buildx build --platform linux/amd64 -f apps/api/Dockerfile \
  -t "$REGISTRY/api:bootstrap" --push .
gcloud artifacts docker images describe "$REGISTRY/api:bootstrap" \
  --format='value(image_summary.digest)'
```

表示されたdigestを使い、`terraform.tfvars` の `image` を `<registry>/api@sha256:...`、`deploy_application=true` に設定してplan/applyする。

```sh
tofu -chdir=infra plan
tofu -chdir=infra apply
gcloud run jobs execute expo-hono-opentofu-starter-staging-migrate --region=asia-northeast1 --wait
API_ORIGIN=$(tofu -chdir=infra output -raw service_uri)
curl --fail "$API_ORIGIN/ready"
```

`api_origin`出力と`service_uri`が一致することを確認する。custom domainを使う場合はDNS/ドメインマッピングを別途設定し、`api_origin`にそのHTTPS URLを渡す。

準備ができたらGitHubの変数を埋め、`GCP_DEPLOY_ENABLED=true`を設定する。Expo側にproduction API URLとビルドを用意してから `EXPO_UPDATE_ENABLED=true` を設定する。以後、mainの成功したCIからmigration → candidate検証 → traffic切替 → Expo Updateの順に動く。

## 5. ハーネスと検証

```sh
codex mcp login expo
bun run check
bun run test:integration
bun run doctor
bun run export:mobile
```

Codexはrootの `AGENTS.md` と `.agents/skills` を使う。Expo MCPは `.codex/config.toml` に設定済み。このホストでは `codex mcp login expo` のOAuthも完了済み。MCPのOAuth、Expo CLIのログイン、GitHubの接続はそれぞれ認証する。別のホストやDev Containerでは各自ログインし、認証データはリポジトリへコピーしない。

詳細な実機手順とMaestroの有料プラン条件は [testing.md](testing.md)。インフラだけの `fmt` / `init -backend=false` / `validate` / TFLintはGCP認証なしで実行できる。
