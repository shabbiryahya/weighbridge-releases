const fs = require("fs");
const path = require("path");

// electron-builder's GitHub publisher races two publisher instances against
// each other when publishing the installer and its blockmap, and both try to
// create the release for the tag if it doesn't exist yet. Pre-creating the
// release here means both racing instances just find it instead of racing
// to create it.
async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GH_TOKEN (or GITHUB_TOKEN) must be set to publish to GitHub Releases.");
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
  const { owner, repo } = pkg.build.publish;
  const tag = `v${pkg.version}`;
  const headers = {
    Authorization: `token ${token}`,
    "User-Agent": "weighbridge-release-script",
    Accept: "application/vnd.github+json",
  };

  const existing = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, { headers });
  if (existing.status === 200) {
    console.log(`Release ${tag} already exists, skipping creation.`);
    return;
  }
  if (existing.status !== 404) {
    throw new Error(`Unexpected status checking release ${tag}: ${existing.status} ${await existing.text()}`);
  }

  const created = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ tag_name: tag, name: tag, draft: false, prerelease: false }),
  });
  if (!created.ok) {
    throw new Error(`Failed to create release ${tag}: ${created.status} ${await created.text()}`);
  }
  console.log(`Created release ${tag}.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
