# 发布与签名公证手册

> 面向维护者。记录 tag 发布流程、macOS 签名/公证配置、产物验证清单，以及当前签名状态的边界。
> 上次全面核验：2026-11-06（v1.4.0 产物实检）。

## 1. 发布流程

```bash
# 1. 确认 main 干净、CI 绿
# 2. 升版本（package.json version）
# 3. 打 tag 并推送 —— tag 是 release 的唯一触发器
git tag v1.x.0 && git push origin main --tags
# 4. CI 自动：双平台构建 → macOS 签名+公证 → GitHub Release 上传 exe/dmg
# 5. 按 §5 验证产物后，在 Release 页把 prerelease/draft 状态定稿
```

产物命名（electron-builder 默认）：

- `Typing.Master-1.x.0.exe`（NSIS 安装器，x64）
- `Typing.Master-1.x.0.dmg`（macOS x64）
- `Typing.Master-1.x.0-arm64.dmg`（macOS Apple Silicon）

## 2. macOS 签名与公证

### 2.1 所需 GitHub Secrets

| Secret | 内容 | 备注 |
|---|---|---|
| `MACOS_CERTIFICATE` | Developer ID Application 证书 `.p12` 的 **base64** | `base64 -i cert.p12 \| pbcopy` |
| `MACOS_CERTIFICATE_PWD` | 该 .p12 的导出密码 | |
| `APPLE_ID` | Apple 账号邮箱 | 公证用 |
| `APPLE_APP_SPECIFIC_PASSWORD` | App 专用密码 | appleid.apple.com 生成，**不是**账号密码 |
| `APPLE_TEAM_ID` | 团队 ID（10 位） | Membership 页可查 |

### 2.2 签名链路如何工作（重要，改 CI 前读）

1. **证书**：CI 的 Configure 步骤把 base64 的 `CSC_LINK` 导入环境 → electron-builder 拿到后**自行解码 base64、创建临时 keychain、导入证书、签名**（app-builder-lib 的 `importCertificate()` 原生支持裸 base64）。不需要手工 `security import` 步骤。
2. **公证**：electron-builder 25 内置公证（检测到 `APPLE_ID` 等环境变量即触发）会先公证一次；`afterSign: build/notarize.js` 随后**再公证一次** —— 双重公证（见 issue #8，v1.4.0 日志已证实）。二选一收敛：删除 afterSign 钩子，或 `mac.notarize: false` 关内置。
3. **凭证缺失的降级**：三个 APPLE_* 变量任一缺失 → notarize.js 跳过公证只签名；`CSC_LINK` 缺失 → 完全跳过签名（ad-hoc）。所以 fork/无 secrets 环境也能构建，只是产物未签名。
4. **PR 构建**：PR 无 secrets，macOS job 已被显式跳过（`github.event_name != 'pull_request'`）。

### 2.3 待办（issue #9）

CI 补 DMG staple（app 已 staple，DMG 容器没有）：

```yaml
- name: Staple DMGs
  if: matrix.platform == 'mac'
  run: |
    xcrun stapler staple "dist/"*.dmg
    xcrun stapler validate "dist/"*.dmg
```

## 3. Windows 签名（当前：未签名）

v1.4.0 的 exe **没有 Authenticode 证书表**（PE Data Directory index 4 为空），首次运行会触发 SmartScreen「Windows 已保护你的电脑」。

候选方案（按个人开发者友好度）：

| 方案 | 成本 | SmartScreen 信誉 |
|---|---|---|
| Azure Trusted Signing | $9.99/月 | 官方渠道，建立快；electron-builder 26.x 原生支持 |
| OV 代码签名证书 | ~$200+/年 | 需时间积累；证书须存硬件 token（CI 接入麻烦） |
| 暂不签名 | 0 | 无；文档需写明「更多信息 → 仍要运行」路径（用户手册 §0 已写） |

## 4. 产物验证清单（发布前跑一遍）

macOS（在本机，任一 arch 都验）：

```bash
# 挂载下载的 dmg
hdiutil attach -nobrowse -readonly -mountpoint /tmp/tm-check "Typing Master-1.x.0-arm64.dmg"

# 1) 签名身份 + hardened runtime + 时间戳
codesign -dv --verbose=4 "/tmp/tm-check/Typing Master.app" | grep -E "Authority=|flags=|Timestamp="
#    期望：Authority=Developer ID Application: <名字> (<TEAM_ID>)
#          flags=0x10000(runtime)   Timestamp=<非空>

# 2) Gatekeeper 评估
spctl -a -t exec -vv "/tmp/tm-check/Typing Master.app"
#    期望：accepted, source=Notarized Developer ID

# 3) staple
xcrun stapler validate "/tmp/tm-check/Typing Master.app"
#    期望：The validate action worked!

# 4) DMG 容器 staple（修复 issue #9 后应通过；当前版本会报 does not have a ticket）
xcrun stapler validate "Typing Master-1.x.0-arm64.dmg"

hdiutil detach /tmp/tm-check
```

Windows（无 Windows 机器时的最小检查）：

```powershell
Get-AuthenticodeSignature ".\Typing.Master.Setup.1.x.0.exe"
# 期望（接入签名后）：Status=Valid，SignerCertificate 非空
# 当前未签名版本：Status=NotSigned
```

## 5. 产物内容抽查

- 安装/启动后首次界面正常，选择每种语言出词
- 词汇管理：导入 §4.1 的最小 CSV、导出再导入往返一致
- 统计面板在至少一次练习后有数据

## 6. 历史核验记录

| 日期 | 版本 | 结论 |
|---|---|---|
| 2026-11-06 | v1.4.0 | macOS 双 arch：Developer ID（Yichun Deng, 5CFSU44B7Q）+ 公证 + app staple ✅；DMG 容器无 staple；exe 未签名；CI 双重公证证实（run 33694574749） |
