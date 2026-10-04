# Release and recovery

Main is source history; a merge does not change the live gist. The release version is package.json/package-lock.json. Every retained bundle records the source SHA, version, JS/source-map hashes and a checksum file.

## Build a candidate

1. Merge reviewed changes, fetch main and use a clean checkout.
2. Run `npm run package:release`, or manually dispatch **Bundle release** on main. The gate runs lint, type checking and a production build.
3. Retain the `surfingkeys-bundle-<SHA>` artifact. Manual artifacts expire after 90 days; version-tag builds also save a draft GitHub Release with those same files.
4. For a versioned release, use the existing `npm run release` command. It verifies before bump/tag/push. Tag `v<version>` must match the package version and main history. It does not publish to the gist.

Before promotion, load the candidate in a separate SurfingKeys test profile/local config and check the dialog version, Unicode and malformed prompt fragments, intended site automation, image copy and URL fallback. Use synthetic clipboard content. This is a manual acceptance boundary; no real-profile test is implied by a successful build.

## Promote the retained package

Dispatch **Promote retained bundle to Gist** on main with the successful Bundle release run ID. It verifies successful run/workflow identity, main ancestry, manifest source/version and hashes, then publishes the exact JS to the existing gist without rebuilding. `GIST_TOKEN` is used only in promotion. The summary records the source SHA and new gist revision.

For a local promotion, restore the artifact under `release/`, fetch origin/main, run `npm run verify:release`, then `npm run deploy`. Check the loaded dialog version after refreshing SurfingKeys and record a page/clipboard smoke result. Build, promotion and accepted runtime behavior are separate states.

## Restore a working version

Retain the previous successful bundle run and draft-release assets before promotion. To restore, dispatch the same promotion workflow with that previous successful run ID. Older versions remain valid for this gist; verification compares the bundle with its own manifest, not today's package.json. Confirm the restored dialog version and behavior. If an artifact has expired, use retained release assets with the local commands above; do not rebuild an old tag and assume it produces identical bytes.

GitHub tags/downloads and the production gist serve different purposes. Publish draft downloads after candidate acceptance if desired; gist updates are always explicit. No browser-store credentials are required.
