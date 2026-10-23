import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");
const knownBadManifests = new Set([
  "bd1aeee419ea36da9aa2b657288da4101887be468f020ac63d22ba6ed84a3ea5",
  "56b74573eed6e4aafe4b50603dbe7853e0345f188c8e44a09f1098caf1f4bcdf",
]);

function pinnedImage(reference) {
  const match = reference.match(/@sha256:([a-f0-9]{64})$/);
  assert.ok(match, "external LiteLLM images require a complete digest");
  assert.ok(!/:v?1\.107\.0(?:@|$)/.test(reference), "compromised release");
  assert.ok(!knownBadManifests.has(match[1]), "compromised platform manifest");
  assert.ok(!/^(1bbcb1443bc9|c00f9d92c427|7b00e91cd2fe)/.test(match[1]),
    "compromised multi-platform index");
  return reference;
}

function exactRequirement(requirement) {
  const match = requirement.match(/^litellm(?:\[[a-z0-9,._-]+\])?==([0-9]+\.[0-9]+\.[0-9]+(?:\.post[0-9]+)?)$/);
  assert.ok(match, "LiteLLM wheel input must use an exact release");
  assert.notEqual(match[1], "1.107.0", "compromised release");
}

function lockedCookbook(dockerfile) {
  assert.match(dockerfile, /^RUN python3 -m pip install --no-cache-dir -r \/app\/requirements\.txt$/m);
  assert.doesNotMatch(dockerfile, /^RUN .*pip(?:3)? install (?:--[^ ]+ )*litellm(?:\s|$)/m);
}

test("deployment and existing base use the same complete pre-incident digest", () => {
  const kube = read("deploy/kubernetes/kub.yaml").match(/^\s+image:\s*(\S+)$/m)?.[1];
  const base = read("deploy/Dockerfile.ghcr_base").match(/^FROM (\S+)$/m)?.[1];
  assert.ok(kube && base);
  assert.equal(pinnedImage(kube), pinnedImage(base));
  const custom = read("docker/Dockerfile.custom_ui").match(/^FROM (\S+)$/m)?.[1];
  assert.ok(custom);
  pinnedImage(custom);
  assert.match(custom, /:litellm_fwd_server_root_path-dev@/);
});

test("floating, malformed and reported malicious image references are rejected", () => {
  for (const reference of [
    "ghcr.io/berriai/litellm:main-latest",
    "docker.litellm.ai/berriai/litellm:main-stable",
    "ghcr.io/berriai/litellm:latest@sha256:123",
    ...[...knownBadManifests].map((hash) => "ghcr.io/berriai/litellm@sha256:" + hash),
    "ghcr.io/berriai/litellm:v1.107.0@sha256:" + "a".repeat(64),
    "ghcr.io/berriai/litellm@sha256:1bbcb1443bc9" + "0".repeat(52),
  ]) assert.throws(() => pinnedImage(reference), reference);
});

test("Compose keeps its source build and cannot prefer an upstream pull", () => {
  const compose = read("docker-compose.yml");
  assert.match(compose, /^    build:\n      context: \./m);
  assert.match(compose, /^    image: litellm-turbo:local$/m);
  assert.match(compose, /^    pull_policy: build$/m);
  assert.doesNotMatch(compose, /^    image: .*berriai\/litellm/m);
});

test("cookbook installs its existing exact requirements", () => {
  exactRequirement(read("cookbook/litellm-ollama-docker-image/requirements.txt").trim());
  lockedCookbook(read("cookbook/litellm-ollama-docker-image/Dockerfile"));
});

test("unconstrained wheel installs and the compromised version are rejected", () => {
  for (const requirement of ["litellm", "litellm>=1.83.5", "litellm==1.107.0"]) {
    assert.throws(() => exactRequirement(requirement));
  }
  for (const requirement of ["litellm==1.83.5", "litellm[proxy]==1.106.2"]) {
    exactRequirement(requirement);
  }
  assert.throws(() => lockedCookbook("RUN python3 -m pip install litellm"));
});

test("the local source lock and Helm default stay outside the compromised release", () => {
  const packageBlock = read("uv.lock").split("[[package]]")
    .find((block) => /^name = "litellm"$/m.test(block));
  assert.ok(packageBlock, "source lock must contain LiteLLM");
  exactRequirement("litellm==" + packageBlock.match(/^version = "([^"]+)"$/m)?.[1]);
  assert.match(packageBlock, /^source = \{ editable = "\." \}$/m);
  const appVersion = read("deploy/charts/litellm-helm/Chart.yaml")
    .match(/^appVersion: (\S+)$/m)?.[1];
  assert.match(appVersion, /^v[0-9]+\.[0-9]+\.[0-9]+$/);
  assert.notEqual(appVersion, "v1.107.0");
  assert.match(read("deploy/charts/litellm-helm/values.yaml"), /^  tag: ""$/m);
});
