const { execSync } = require("child_process");
const { defineConfig } = require("@vue/cli-service");

// Expose the deployed revision on the 原始碼與授權 page (AGPL source offer).
function gitCommit() {
  try {
    return execSync("git rev-parse HEAD", { cwd: __dirname, stdio: "pipe" })
      .toString()
      .trim();
  } catch {
    return "";
  }
}
process.env.VUE_APP_COMMIT ||= gitCommit();
process.env.VUE_APP_BUILD_DATE ||= new Date().toISOString().slice(0, 10);

module.exports = defineConfig({
  transpileDependencies: true,
});
