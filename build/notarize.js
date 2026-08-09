// afterSign 钩子：签名后、打包 dmg 前执行。
// 仅当 Apple 公证凭证齐全时才公证；缺失则跳过（不报错），保证 CI 无 Secret 时仍能构建。
// 凭证从 GitHub Secrets 注入：APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID
const { notarize } = require('@electron/notarize');

exports.default = async function notarizeApp(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') return;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  // 凭证不齐全 → 跳过公证（仅签名）
  if (!appleId || !appleIdPassword || !teamId) {
    console.log('[notarize] Apple 凭证不完整，跳过公证（仅签名）。');
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  console.log(`[notarize] 开始公证 ${appName} ...`);

  await notarize({
    tool: 'notarytool',
    appBundleId: context.packager.appInfo.id,
    appPath: `${appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword,
    teamId,
  });

  console.log('[notarize] 公证完成。');
};
