# 検証

## 2026-11-07のworktree標準命名の検証

- Issue #29で独自ハッシュとComposeの明示nameを削除し、`expo-hono-opentofu-starter-29-portless-defaults` と一時的な `expo-hono-opentofu-starter-29-parallel-check` の2 worktreeを起動した。既存の旧ハッシュ名projectとHTTPS proxyは維持した。
- `bun run check` が成功。初期化・端末スクリプトのBunテスト14件でmount用パスだけの生成、旧project設定の除去、symlink、アプリenvの保持、解決済みproject名での端末設定生成と1回のbuild・起動を確認した。認証統合テストも3件／58 assertionsが成功した。
- 通常・Expo Go・端末・editor／tunnel profileのCompose設定を検証した。Compose標準のproject名指定が開発originにも反映されることを確認した。親パスに単引用符・空白・ドル記号を含む別の一時ディレクトリでは、実コンテナからcheckoutとGit共通ディレクトリを参照できた。
- 2 worktreeのAPI・Metro・Google／Apple／メールのHTTPS URLと、全10個のloopback公開ポートが独立した。PostgreSQLはホスト非公開。各projectの8個のvolumeとDB system identifierが異なり、同じメールアドレスで認証してもDB内のユーザーIDが異なった。
- 実HTTPS経由のGoogle／Apple Emulate認証で、新しいAPI callbackから同じworktreeのMetroへ復帰し、`/api/me` が認証済みとなった。session CookieはSecure・HttpOnlyでDomain未指定。同じCookie jarで他worktreeのAPIを呼ぶと401となり、CORSは対応するMetro originだけを許可した。Cookie・tokenは記録していない。
- 一時projectだけを `portless compose --profile '*' down` で停止し、残る新projectと既存projectのAPI応答を確認した。8個のvolumeが保持され、再起動後のユーザーIDとDB system identifierも維持された。旧volumeの移行・削除や共有proxyの停止は行っていない。

今回の変更後のiOS／Androidネイティブ接続・再ログイン、実機、Ubuntu／Windows、Dev Containerのエディタ操作は未確認。CLI・Compose・実HTTPS APIの確認であり、端末操作の保証には代えない。製品UI・ネイティブ依存・DBスキーマは変更せず、EAS Build・OTA・本番配信も起動していない。

## 自動検査

```sh
bun run check
bun run db:migrate
bun run test:integration
bun run doctor
bun run export:mobile
```

integration testは専用の一意なメールアドレスを使い、終了時にそのユーザーだけを削除する。開発/CI用DBに対して実行する。

```sh
tofu fmt -check -recursive infra
tofu -chdir=infra init -backend=false -lockfile=readonly
tofu -chdir=infra validate
tofu -chdir=infra/bootstrap init -backend=false -lockfile=readonly
tofu -chdir=infra/bootstrap validate
tflint --init
tflint --chdir=infra --config="$PWD/.tflint.hcl"
tflint --chdir=infra/bootstrap --config="$PWD/.tflint.hcl"
```

## iOS / Android 共通の実機チェック

1. `bun run db:seed` 後、ホームで複数ユーザーの画像と投稿を確認する。再実行して件数が増えず、利用者の投稿が残ることも確認する。
2. 投稿者のアイコン→プロフィール→戻る。ユーザー情報・編集と、そのユーザーの投稿一覧が明確に分かれていることを確認する。
3. 未ログインのいいね／投稿はログインへ進む。Google／AppleのEmulate同意から復帰し、セッションが保持されることを確認する。
4. 投稿シートで入力、失敗時の本文保持、再試行、閉じる・スワイプ・Android Backを確認する。キーボード表示中も操作に届くことを確認する。
5. いいねを切り替えてもスクロール位置・行高が変わらないこと、他の投稿がpendingにならないことを確認する。共有シートと自分の投稿だけの削除も確認する。
6. プロフィール編集とログアウト。表示情報と操作行が区別され、再起動後のセッション・設定が維持されることを確認する。
7. 外観をsystem／light／darkへ切り替え、文字を最大へ拡大する。全タブ、loading／error／empty、ログイン、シートで見切れ・操作不能がないことを確認する。
8. メールの単回リンク、失効・他端末の拒否、パスキー登録・ログイン・削除を確認する。Expo Goではnative passkeyが利用不可であることを表示する。
9. API停止時のエラーと再試行。OS関連付け・実プロバイダでの認証はローカルEmulate／仮想WebAuthnの検証と別に記録する。

## 投稿一覧の状態を端末で確認する

iOS SimulatorとAndroid Emulatorで、`dev:devices` が表示する同じ検証worktreeのMetroへ接続する。空のDBで始め、Emulateのテストアカウントだけを使う。空状態を確認してからseedする。他の環境のDBを初期化しない。

| 状態         | 再現と確認                                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 空           | seed前にホームとログイン後のマイページを開く。見出し、説明、アイコンが中央にあり、カードやタブから離れている。最初の投稿から編集画面へ進み、戻れる。                                     |
| 初回読み込み | このworktreeの `docker compose pause api` を実行してアプリを開き直す。投稿カードのスケルトンを確認し、すぐに `docker compose unpause api` で復旧する。空状態へ切り替わることを確認する。 |
| エラーと復旧 | このworktreeの `docker compose stop api` 後、アプリを開き直してエラーを待つ。`docker compose start api` で復旧して「もう一度試す」を押す。取得済みの概要や投稿は再取得中に消えない。     |
| データあり   | `bun run db:seed` 後にホームを手動更新し、投稿が並ぶことを確認する。投稿者の画像からプロフィールを開き、投稿一覧と戻る操作を確認する。                                                   |

Maestroで開いているアプリの状態を待ち、スクリーンショットを保存できる。開発ビルドの `APP_ID` は `dev.reohakase.expohonopentofustarter`。iOS Expo Goは `host.exp.Exponent` を使う。

```sh
maestro --device "$serial" test --test-output-dir .artifacts/feed-states \
  -e APP_ID=dev.reohakase.expohonopentofustarter -e TAB=ホーム \
  -e STATE='まだ投稿がありません' -e CAPTURE=home-empty \
  apps/mobile/.maestro/capture-feed-state.yaml
```

`TAB`・`STATE`・`CAPTURE` を確認する画面に合わせる。初回読み込みには `STATE=loading` を指定する。スケルトンを待ち、空表示がないことを検査する。エラーの見出しは「投稿を読み込めませんでした」。保存した画像を開き、上下左右の余白、中央揃え、セーフエリア、文字拡大時の折り返しと操作への到達、ライト／ダークの見え方を確認する。PRには対象状態と実施環境が分かる画像を添付する。

## Maestro

`apps/mobile/.maestro/showcase.yaml` が未ログイン時のホーム・プロフィール・設定フローを検証する。開発サーバーを必要としないpreviewビルドで実行する。

```sh
maestro test apps/mobile/.maestro/showcase.yaml
```

クラウド実行例は `docs/examples/native-e2e.yml`。2026-11-05の実アカウントでの検証では、EASのMaestroジョブに有料プランが必要だったため、未使用のサンプルとして置いている。契約後に `apps/mobile/.eas/workflows/native-e2e.yml` へコピーし、`eas workflow:validate`を通してから実行する。iOS E2Eのために各開発者のMacを必須にしない。

JestはExpo UIのネイティブ境界をmockするため、SwiftUI/Composeの実描画を保証しない。bundle生成、型検査、mock付きテストと、実機での確認は区別して記録する。

## 2026-11-07のDevice Hub開発環境の検証

- `bun run check`、Expo Doctor 20/20、iOS／Android bundle生成が成功。新規テストはHTTPS originの検証と、AndroidのCA設定がdebugだけに適用されることを確認する。既存のworktree identityテストでは別checkout・branch変更・symlinkの分離を検証する。
- Androidの `expo prebuild --platform android --no-install` が成功。生成されたdebug manifestとXMLを確認し、main manifestへユーザーCA設定が入らないことを確認した。Node 24でのExpo config読込も成功した。
- 実Composeの5サービスが127.0.0.1だけへ公開され、PortlessのHTTPSルートと各サービスの公開originが一致することを確認した。API `/ready` とMetro `/status` が成功。アプリenvの上書き、DB削除、業務API・スキーマ変更は行っていない。
- HTTP proxyを選んだ場合は既存コンテナを再作成する前に拒否し、HTTPS proxyのstate directoryをシェルから渡すと再起動できた。main checkoutと一時的なlinked worktreeで、生成URLがCompose project名と一致し、余分なbranch接頭辞が付かないことも確認した。
- 起動済みPostgreSQLで認証統合テスト3 tests／58 assertionsが成功。`test:integration` に `--no-deps` を付け、通常Compose設定でEmulateを再作成して端末用URLやポートを戻してしまう副作用を防いだ。
- EASの `development-simulator` で `developmentClient: true` と `simulator: true` を確認。手動のnative-builds workflowのサーバー検証が成功した。EAS BuildやOTA公開は起動していない。
- macOSのiPhone 17 Pro Simulator／iOS 26.5／Expo Go 58.0.7で、Hub 0.21.0の画面転送・タップ・キーボード入力・スクロールを確認。Portless CAをSimulatorへ登録し、HTTPSで実APIとseed画像・タイムラインを表示した。いいねの2→1→2、投稿入力と送信、入力状態を保つFast Refreshを確認した。一時的な文言変更は復元済み。Google／Apple Emulateのアカウント選択からアプリへ復帰し、同じユーザーのセッションが再作成されることも確認した。メールリンクはアプリから送信し、Emulate APIで取得したリンクを同じSimulatorで開いて、送信先のテストアカウントでログインできることを確認した。
- Android Studio Rabbit 2 2026.2.2を導入したmacOSで、SDK Command-line Tools 23.0とGoogle APIs API 36 arm64を用意し、専用AVD `Starter_Pixel_8_API_36` を作成した。既存のGoogle Play AVDは保持した。Studio・SDK CLI・Hubの `ANDROID_USER_HOME`／`ANDROID_AVD_HOME` を揃え、Hub 0.21.0で画面転送・タップ・キーボード入力・スクロールを確認した。
- commit `758aa5e` からAndroidをprebuildし、Android Studio付属JDKとGradleの `:app:assembleDebug -PreactNativeArchitectures=arm64-v8a` でDevelopment Buildを作成した。初回ビルドは7分19秒で成功し、APKを上記AVDへインストールした。生成されたnative projectとAPKはGit管理外のまま保持した。EAS Buildは使用していない。
- Androidの専用AVDを `-writable-system -no-snapshot` で起動し、生成したhostsの統合、serial指定の `adb reverse tcp:443 tcp:443`、Settingsからの公開CA登録を実施した。証明書検証を有効にしたままHTTPS Metro／APIへ接続し、実DBのseed画像・タイムラインを表示した。
- AndroidのDevelopment Buildで、Google／Apple Emulateのアカウント選択からアプリへ復帰し、設定に `hanako@example.com` のセッションが表示されることを確認した。Chromeの初回同意は利用者の承認後に行い、利用状況の送信をオフにしてアカウントを追加せず続行した。メールリンクはアプリから送信し、Emulate APIで取得したリンクを同じAVDで開いて `android@example.com` でログインできた。いいねの3→4→3で投稿の位置を保ち、`Android HTTPS test` の投稿・表示、メール欄の入力を保持したFast Refreshを確認した。一時的な文言変更は復元済み。
- AndroidでOS外観をダークへ切り替えると、文字が白くなる一方で投稿背景が明るいまま残る不具合を確認した。[Issue #24](https://github.com/ReoHakase/expo-hono-opentofu-starter/issues/24) に再現条件と画像を記録した。この接続環境の変更では修正せず、検証後はライトへ戻した。
- 当初のHTTP構成ではBetter AuthのExpo認可proxyが `Invalid authorizationURL` を返した。利用者の選択によりHTTPSの.localhostへ統一し、認証や証明書の検証を無効化する回避策は追加していない。

iOSのDevelopment BuildとUbuntu・Windows／WSL2では未実行である。iOSのExpo Goでの確認はDevelopment Buildの保証に代えない。Androidも上記の操作を確認した範囲であり、全画面の文字拡大・エラー回復・再起動後の保持やMaestroは未確認。iPhone実機のHub転送、実Google／Apple、実メール配送、OS関連付けを使うPasskeyは対象外。

## 2026-11-07のAndroid外観とアバターの修正検証

- Issue #24の修正で、OSカラーを外観に応じて取得する `useColors` と `useStackOptions` へ移行した。Androidの起動時の色を保持する問題と、React Compilerによるネイティブgetterの固定化を実画面で再現した。除外はカラーHookだけとし、schemeに依存する `useMemo` で通常の再描画時の再計算を避ける。
- `bun run check` が成功。Jestは6 suites／22 testsで、追加のAppearance変更テストがmemo化した要素・Stackの背景、本文・placeholderの色、入力状態の保持を確認する。既存のいいね行だけの更新、全件再取得なし、外観設定の保存・復元・失敗後の再試行も成功した。Jestではネイティブカラーの取得境界をmockするため、Compilerを含む実描画は次の端末操作で確認した。
- Expo Doctor 20/20とiOS／Androidのbundle生成が成功した。JS変更のみで、ネイティブ再ビルド・DB変更・EAS Build・OTA公開は行っていない。
- macOS／Pixel 8 API 36 arm64のDevelopment BuildをHub 0.21.0で操作し、実APIとseedデータでOSのライト↔ダーク、設定のsystem／light／dark、OSと異なる固定外観を確認した。アプリの再起動後も保存済みライト設定が復元された。タイムライン・プロフィール・設定・投稿シートの背景と文字・アイコンを確認した。
- 投稿シートに `Theme draft` を入力してOS外観を変更し、本文と11文字のカウントを保持したまま、本文・背景・送信アイコンがダークへ切り替わることを確認した。テスト下書きは送信せず閉じた。いいね3→4→3で投稿位置が変わらないことも確認した。
- Androidの未設定アバターが上寄りになる問題は、上下のExpo UI Spacerへ `flexible` を指定して修正した。タイムラインの40dp、プロフィールの80dpで中央配置を確認し、画像付きseedアバターも維持した。
- iPhone 17 Pro／iOS 26.5のExpo Goで、ライト↔ダークの背景切替とプロフィールの人物アイコンの中央配置を確認した。iOS Development Build、実機、最大文字サイズ、Maestroは今回未確認である。

## 2026-11-07の共有用ビルド設定の検証

- `bun run check` が成功。`eas config --profile preview --platform ios` / `android` で、両OSの `developmentClient: false`、iOSの `simulator: true`、Androidの `buildType: apk` を確認した。
- `eas workflow:validate .eas/workflows/native-builds.yml --non-interactive` が成功。ネイティブbuild workflowは `workflow_dispatch` のみで、GitHub Actionsから自動起動する参照はない。
- 未使用の `docs/examples/native-e2e.yml` もpreview参照に更新した。EAS CLI 27.5.0でのサーバー検証は、従来どおりMaestroジョブに有料プランが必要として拒否された。契約後の再検証が必要である。
- EASのpreview環境にPlain text／Sensitive変数は未登録。共有ビルドのSNS機能には `EXPO_PUBLIC_API_URL` と到達可能なAPIの準備が必要。

この変更ではクラウドビルド・OTA公開・ストア提出を起動していない。変更後のAPK／Simulatorアプリの生成とインストール・起動は未確認である。

## 2026-11-06の認証付きSNSの検証

- `bun run check` が成功。Jestは5 suites／21 testsで、いいねの対象行だけの更新・全件再取得なし・並行更新の失敗復元・プロフィールキャッシュ、日時の粒度、文字サイズと色クラスの併用を含む。import境界の許可／禁止パターンはBunで確認した。
- 実PostgreSQLとVercel Emulateの統合テストは3 tests／58 assertions成功。Google／AppleのOAuth、アカウント連携、magic linkの単回性・native callback、WebAuthn署名・origin・リプレイ拒否、投稿の所有者認可といいねの冪等性を確認した。認証の迂回用エンドポイントは追加していない。
- Expo Doctorは20/20成功。iOS／Androidのbundle生成とNode向けAPI buildが成功した。
- 開発DBでseedを再実行し、画像付きユーザー4件・サンプル投稿8件が重複せず、既存の利用者投稿2件が保持された。アバターはAPIの静的配信から取得した。
- iPhone 17 Pro Simulator／iOS 26.5／Expo Goで実APIとseedを使用。角丸カードと8ptのカード間隔、右寄せしたいいね・共有、投稿者→プロフィール→戻る、共有シート、アカウント情報と操作行の区別を確認した。いいね2→3→2で投稿の位置が変わらない操作を動画に記録した。
- ライト／ダークの切替を確認し、独自の文字サイズクラスが文字色を消していた不具合を共通のtailwind-merge設定で修正した。プロフィールではSimulatorの文字拡大操作後も本文が折り返された。最大アクセシビリティ文字サイズと全画面の組み合わせは未確認。
- ログイン画面で黒地の公式AppleボタンとGoogleの多色ロゴを確認。Google Emulateからアプリへ復帰し、元のテストユーザーで再ログインした。投稿シートは初期高さとキーボード表示時の拡張・投稿操作領域を確認した。CUAの文字入力が反映されなかったため、この操作による新規投稿完了は未確認である。

Androidのネイティブ実行、iPhone実機、実Google／Appleプロバイダ、メール実配送、OS関連付けを使う実機パスキー、Maestroは未実施。Expo Goではnative passkeyを無効にし、代わりのログイン方法を案内する。追加のネイティブ依存・associated domainsを使うには新しい互換ビルドが必要である。DBは追加migrationを適用する。GCP apply・本番配信・OTA公開は実行していない。

## 2026-11-05の初期設定検証（改名前のビルド）

- [GitHub CI](https://github.com/ReoHakase/expo-hono-opentofu-starter/actions/runs/41992135095): `2388c8b` のquality / infrastructure / containerが成功。lint・型・Bun/Jest・PostgreSQL認証統合テスト・Expo Doctor・両OSのbundle・OpenTofu/TFLint・Nodeコンテナーの起動を含む。
- [PR自動preview](https://expo.dev/accounts/reohakase/projects/expo-hono-opentofu-starter/workflows/01a1aac0-058d-7452-9edb-5b69be862cb7): 同じcommitで両OSのupdate公開とPRコメントが成功。
- [手動preview配信](https://expo.dev/accounts/reohakase/projects/expo-hono-opentofu-starter/workflows/01a1aac0-7f64-7679-b78c-e0fd098d1d3d): 同じcommitで成功。
- [iOS Simulatorビルド](https://expo.dev/accounts/reohakase/projects/expo-hono-opentofu-starter/builds/e473f917-7fc8-4930-bb93-2608408f03bf)と[Android preview APK](https://expo.dev/accounts/reohakase/projects/expo-hono-opentofu-starter/builds/43dce5d8-35a5-4990-bc67-2167e3445017)が成功。ビルド元は `9d35603`。その後のシート修正とBabel runtime変更はJavaScriptのみで、iOSのfingerprintが同一であることも確認した。
- ローカルiPhone 17 Pro Simulator / iOS 26.5のExpo Goで `2388c8b` を起動。Today→詳細→戻る、保存→LibraryのSaved絞り込み、完了シートの本文とDone、同日の重複完了防止、進捗1/3への反映、検索の該当なし、ダークモード、触覚設定の切り替えを確認した。完了シートの画像は [PR #5](https://github.com/ReoHakase/expo-hono-opentofu-starter/pull/5) に添付。

iPhone実機とAndroid端末での操作、日次目標スライダー、文字サイズ拡大、シートのスワイプ/Android Back、再起動後の保持、公開API経由の認証は未確認。Androidのビルド成功は操作確認の代わりにはしない。GCP本番デプロイと本番OTA、ストア提出は実行していない。

## 2026-11-05の改名・worktree分離の検証

- `bun run check`、`bun run test:integration`、`bun run build:api` が成功。IDの安定性、引用符・空白・ドル記号を含むパス、symlink、branch変更、detached HEAD、同時setupによるsecret保持と既存envの保持をBunで確認した。
- Expo Doctorは20/20成功。SDK 58のiOS・Android bundle生成が成功。新しいアプリID・スキームに対応するネイティブビルドはまだ作成していない。
- 実際のlinked worktreeを3つ作成し、ホストのみ・コンテナのみ・ホスト2つ＋コンテナ1つでAPI `/ready` とMetro `/status` が同時に成功した。コンテナ内部はそれぞれ8080/8081、ホスト公開ポートは6個すべて異なった。
- 各DBへ異なる検証値を保存し、他worktreeの値が見えないこと、停止・再起動やホスト/コンテナの切替後も自分の値を保持することを確認した。1つの `services:down` 後も他のAPIが応答し、停止対象のDB volumeも保持された。ホストのAPI二重起動は既存プロセスを終了せず拒否された。
- コンテナ内からlinked worktreeのGit操作が成功。Turborepoの共有キャッシュ参照による起動エラーを、worktree内への明示cacheDirで解消した。API終了処理も重複signalでDB poolを二重終了しないよう修正し、3コンテナのCtrl+C終了を確認した。
- ルートとbootstrapのOpenTofu fmt/init（backend無効・lockfile読取専用）/validate、TFLintが成功。ShellCheckとGitHub Actionsのactionlintも成功。ホストにIaC CLIがないため、Dev Containerイメージ内の固定版を使用した。クラウドへのapply・配信は実行していない。
- iPhone 17 Pro Simulator / iOS 26.5のExpo Goで起動し、設定画面の新名称・オフライン案内・ダークモード・触覚Switchを確認した。SQLiteに新しい `expo-hono-opentofu-starter.preferences` キーで設定が保存されたことも確認した。日次目標SliderのAX操作ではアプリ側の値変更を確認できていない。

初回の依存導入を3つ同時に実行するとLefthookの共有hook更新が競合したため、初回install/コンテナ作成は順に実行する手順とした。Portless 0.15.8の同時route登録中に一度JSON読取警告を観測したが、登録後の全routeは正常に応答した。Dockerの容量上限により1台のReact Native DevTools取得がfallbackになった。検証専用コンテナ・volume・worktreeは終了後に削除し、通常の開発用DBと既存の旧DBは保持した。

Androidのネイティブ実行、iPhone/Android実機、公開HTTPSトンネルを通した端末認証、新アプリIDのビルド/インストールは未実施。改名前のビルド成功記録は、新しい識別子のネイティブ検証には含めない。

## 2026-11-06のPortless Compose連携の検証

- Portless 0.16.0でAPI・MetroをComposeサービスとして起動し、`/ready` / `/status` が応答した。APIはDBのTCP healthcheckとmigration完了を待つ。Metro単独起動ではDBコンテナが作られないことを確認した。
- 3 linked worktreeでAPI・Metroが同時に応答し、6つの公開ポートがすべて異なり、loopback限定であることを確認した。PostgreSQLは3つともホスト公開なし。各DBに異なる値を保存し、他worktreeの値が見えないことを確認した。
- 1つのprojectをdownしても残りのAPIが応答し、停止対象のDB volumeは保持された。再起動後も検証値を保持した。foregroundのCtrl+CでAPI・Metroとrouteが終了し、他projectと共有proxyの既存routeは保持された。`services:down` はeditorを含む全profileを終了する。
- 空白・引用符・ドル記号を含むcheckoutでComposeのmountとAPI起動が成功し、Bunの共通Compose aliasでもパスを保持できることを確認した。BunテストではIDの安定性、branch変更、detached HEAD、symlink、同時setup、secretと既存アプリenvの保持を検証した。
- API環境のBunテストで開発originの補完、明示HTTPS URLの優先、本番への開発設定の混入防止、secretを含まないエラーを検証した。通常MetroのmanifestとJavaScript bundleをPortless経由で取得し、内部8081が公開bundle URLへ混ざらないことを確認した。実APIのCORSでもMetro originが許可された。
- `compose.go.yaml` でExpo GoのQRと匿名ngrokトンネルを生成し、公開トンネルからiOS manifestを取得した。SDK 58の既定Expoトンネルはログインを要求するため、開発用コマンドは `--tunnel ngrok` を明示する。
- `bun run check`、Compose経由の認証統合テストとmigration、Expo Doctor（20/20）、iOS・Android export、通常/editor/tunnel/Expo GoのCompose設定検証が成功した。
- 既存イメージから起動した編集用workspaceでlinked worktreeのGit操作・型検査が成功し、API・MetroのPortless公開ポートも維持された。

Dockerの容量上限により、3 worktreeそれぞれへの依存の新規導入は完了しなかった。並列サービス検証ではGit管理外のoverrideで導入済みの依存volumeのみを共有し、ソース・アプリenv・DB・ネットワーク・公開ポートは分離した。標準Compose設定は依存volumeもprojectごとに分離する。

Dev Container CLI 0.90.0 / Docker Compose 5.5.0による新規buildは未完了。最初はBakeが生成Dockerfileの外部パスへのread許可を要求し、Git管理外のcheckout内をTMPDIRにして再試行した後はGoogle Cloud CLI導入中に容量不足で停止した。既存イメージでのworkspace検証と新規build成功は区別する。

iPhone/Android実機での接続・認証、新しいDev Containerイメージの初回作成、3 worktreeの完全に独立した依存導入は未確認。UIやネイティブ依存・アプリIDを変更しておらず、今回ネイティブビルド・配信・IaC applyは実行していない。

## 2026-11-06のHTTPS切替の検証

- 標準の `<service>.<repo>-<worktree ID>.localhost` を維持し、PortlessをHTTPS/443、APIの開発認証URL・許可origin・Metroのproxy URLをHTTPSへ変更した。worktree-init、Compose project名、DB・volume名は変更していない。
- 他の開発環境のHTTP proxyを維持するため、Git管理外の専用stateで検証用HTTPS proxyを443に起動した。OSの信頼ストアは変更せず、検証用CAを明示して証明書を検証した。
- 1 worktreeで新規の依存導入・DB初期化・migration・API/Metro起動が成功。API `/ready`、Metro `/status`、iOS manifestとHTTPS bundle取得、HTTP/2、WSSの101 handshakeが成功した。コンテナ内部の8080/8081はHTTPのまま、DBはホスト非公開である。
- HTTPS APIへの登録・セッション取得とMetro originのCORSが成功。セッションcookieにSecure・HttpOnlyが付くことを確認し、検証ユーザーは削除した。
- `bun run check` と通常/editor/tunnel/Expo GoのCompose設定検証が成功。Expo Goのトンネル構成は従来どおりMetroのproxy URLを空にして外部トンネルを使う。
- mainのUniwind構成を取り込んだ後も `bun run check` とHTTPS bundle取得が成功。生成型・Metro設定・CSS生成のCI検査を維持した。

ブラウザの警告を消すためのOSへのCA信頼登録、iPhone/Android実機での接続・認証は未実施。通常利用時はホストで `portless trust` を行う。共有HTTP proxyのHTTPSへの切替は、利用中worktreeを止めた上でホスト側で一度行い、各worktreeの停止処理からは行わない。

## プロフィール編集

- BunのPostgreSQL統合テストで、未認証の更新拒否、他ユーザーの保護、不正な画像の拒否、名前と写真の保存、JPEGの配信、画像の置換・削除を確認する。JestとTesting Libraryで写真選択のキャンセル、空の表示名、通信失敗後の再保存、投稿キャッシュの更新範囲を確認する。
- iPhone 17 Pro Simulator（iOS 26.5、Expo Go）とPixel 8 Emulator（API 36、Development Build）で、写真選択・切り抜き・プレビュー、名前入力と保存、マイページへの反映を確認した。iOSでは変更の破棄、Androidでは写真の削除と標準の戻る操作を確認した。物理端末は未確認。
