#!/usr/bin/env node
// Wires a `release` signingConfig (sourced from android/gradle.properties)
// into the release build type of android/app/build.gradle, generated fresh
// each run by `expo prebuild`. Run from the app directory (cwd = apps/<app>).
"use strict";

const fs = require("fs");
const path = "android/app/build.gradle";
let src = fs.readFileSync(path, "utf8");

function findMatchingBrace(text, openBraceIdx) {
  let depth = 0;
  for (let i = openBraceIdx; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("Unbalanced braces starting at index " + openBraceIdx);
}

// 1. Ensure signingConfigs { ... } has a `release` entry.
const scIdx = src.indexOf("signingConfigs");
if (scIdx === -1) {
  throw new Error("Could not find `signingConfigs` block in " + path);
}
const scBraceIdx = src.indexOf("{", scIdx);
const scEndIdx = findMatchingBrace(src, scBraceIdx);
const signingConfigsBlock = src.slice(scBraceIdx, scEndIdx + 1);

if (!/\brelease\s*\{/.test(signingConfigsBlock)) {
  const insertion =
    "\n        release {\n" +
    "            if (project.hasProperty('RELEASE_STORE_FILE')) {\n" +
    "                storeFile file(RELEASE_STORE_FILE)\n" +
    "                storePassword RELEASE_STORE_PASSWORD\n" +
    "                keyAlias RELEASE_KEY_ALIAS\n" +
    "                keyPassword RELEASE_KEY_PASSWORD\n" +
    "            }\n" +
    "        }\n";
  src = src.slice(0, scBraceIdx + 1) + insertion + src.slice(scBraceIdx + 1);
}

// 2. Point the release build type's signingConfig at signingConfigs.release.
const btIdx = src.indexOf("buildTypes");
if (btIdx === -1) {
  throw new Error("Could not find `buildTypes` block in " + path);
}
const btBraceIdx = src.indexOf("{", btIdx);
const btEndIdx = findMatchingBrace(src, btBraceIdx);
let buildTypesBlock = src.slice(btBraceIdx, btEndIdx + 1);

const relMatch = buildTypesBlock.match(/release\s*\{/);
if (!relMatch) {
  throw new Error("Could not find `release` build type in " + path);
}
const relBraceIdx = relMatch.index + relMatch[0].lastIndexOf("{");
const relEndIdx = findMatchingBrace(buildTypesBlock, relBraceIdx);
let releaseBlock = buildTypesBlock.slice(relBraceIdx, relEndIdx + 1);

if (/signingConfig\s+signingConfigs\.\w+/.test(releaseBlock)) {
  releaseBlock = releaseBlock.replace(
    /signingConfig\s+signingConfigs\.\w+/,
    "signingConfig signingConfigs.release"
  );
} else {
  releaseBlock = releaseBlock.replace(
    "{",
    "{\n            signingConfig signingConfigs.release"
  );
}

buildTypesBlock =
  buildTypesBlock.slice(0, relBraceIdx) +
  releaseBlock +
  buildTypesBlock.slice(relEndIdx + 1);
src = src.slice(0, btBraceIdx) + buildTypesBlock + src.slice(btEndIdx + 1);

fs.writeFileSync(path, src);
console.log("Patched " + path + ": release build type now uses signingConfigs.release");
