"""Render the Phase 0 static application inventory from a committed Git tree."""
import io
from pathlib import PurePosixPath
import re
import subprocess
import sys
import tarfile


def git(*args):
    return subprocess.check_output(["git", *args])


def report(revision):
    sha = git("rev-parse", "--verify", "--end-of-options", revision + "^{commit}").decode().strip()
    tree = git("ls-tree", "-r", "--name-only", sha).decode().splitlines()
    roots = ("backend/src/", "frontend/src/", "mobile/app/", "mobile/src/")
    paths = [p for p in tree if p.startswith(roots) and p.endswith((".ts", ".tsx"))
             and not re.search(r"\.(?:spec|test)\.|/(?:__tests__|test)/", p)]
    plan = "docs/operations/PLATFORM_READINESS_MASTER_PLAN_20261117.md"
    schema = "backend/prisma/schema.prisma"
    selected = paths + [schema, plan, "backend/.env.example", "docker-compose.yml", "frontend/next.config.ts"] + [
        p for p in tree if p.startswith(".github/workflows/") and p.endswith((".yml", ".yaml"))]
    archive = git("archive", "--format=tar", sha, "--", *selected)
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        sources = {p: tar.extractfile(p).read().decode() for p in selected}

    lines = ["# Application source inventory", "", f"Source commit `{sha}`.",
             f"Reproduce from the repository root with `python3 scripts/source-inventory.py {sha}`.",
             "This snapshot lists declarations in committed code. Deployment, configuration and role acceptance require separate evidence. Counts include declarations even when access is conditional."]
    def section(title, entries):
        lines.extend(["", f"## {title} ({len(entries)})", ""] + ["- " + row for row in entries])

    web = []
    for p in paths:
        if p.startswith("frontend/src/app/") and p.endswith("/page.tsx"):
            parts = PurePosixPath(p).parts[3:-1]
            route = "/" + "/".join(v for v in parts if not v.startswith("("))
            web.append(f"`{route}` — `{p}`")
    section("Web pages", sorted(web))
    section("Expo Router screen files", [f"`{p}`" for p in paths if p.startswith("mobile/app/")
                                         and p.endswith(".tsx") and not p.endswith("/_layout.tsx")])

    controllers, routes, jobs, todos, env = [], [], [], [], set()
    verbs = r"Get|Post|Put|Patch|Delete|Head|Options|All"
    decorator = re.compile(r"^\s*@(Controller|" + verbs + r")\((?:['\"]([^'\"]*)['\"])?\)", re.M)
    for p in paths:
        source = sources[p]
        if p.startswith("backend/src/"):
            prefix = None
            markers = re.findall(r"^\s*@(Controller|" + verbs + r")\(", source, re.M)
            events = decorator.findall(source)
            if len(markers) != len(events):
                raise ValueError(f"Review unsupported route declaration in {p}")
            for kind, segment in events:
                if kind == "Controller":
                    prefix = segment
                    controllers.append(f"`/api/{prefix}` — `{p}`")
                else:
                    if prefix is None:
                        raise ValueError(f"Missing controller in {p}")
                    route = "/".join(s.strip("/") for s in ("api", prefix, segment) if s)
                    routes.append(f"`{kind.upper()} /{route}`")
            for cadence, handler in re.findall(r"@Cron\(([^)]+)\)\s+(?:async\s+)?(\w+)\(", source):
                jobs.append(f"`{cadence}` — `{handler}` in `{p}`")
        env.update(re.findall(r"process\.env\.([A-Z][A-Z_0-9]*)", source))
        env.update(re.findall(r"(?:process\.env\[|\.get(?:<[^>]+>)?\(\s*)['\"]([A-Z][A-Z0-9_]+)['\"]", source))
        for number, line in enumerate(source.splitlines(), 1):
            if re.search(r"\b(?:TODO|FIXME)\b", line):
                todos.append(f"`{p}:{number}` — {line.strip().lstrip('/ *')}")
    section("Nest controller prefixes", controllers)
    section("Nest HTTP method declarations", sorted(routes))
    section("Prisma models", [f"`{v}`" for v in re.findall(r"^model (\w+)", sources[schema], re.M)])
    section("Prisma SQL migrations", [f"`{PurePosixPath(p).parent.name}`" for p in tree
                                      if p.startswith("backend/prisma/migrations/") and p.endswith("/migration.sql")])
    section("Nest scheduled methods", jobs)
    workflow_jobs = []
    for p in selected:
        if p.startswith(".github/workflows/"):
            block = re.search(r"^jobs:\s*\n((?:[ \t][^\n]*\n|\n)*)", sources[p], re.M)[1]
            workflow_jobs.extend(f"`{p}` — `{j}`" for j in re.findall(r"^  ([\w-]+):", block, re.M))
    section("GitHub workflow jobs", workflow_jobs)
    adapters = [p for p in paths if p.startswith("backend/src/") and (
        "/providers/" in p or p.endswith(("vault-storage.service.ts","twilio.service.ts","stripe.service.ts","ai-vision.service.ts")))]
    section("Provider adapters, interfaces and integrations", [f"`{p}`" for p in adapters])
    lines.extend(["", "AI Vision supports a simulation mode. Diagnostics separately declares an Anthropic adapter. Its constructor checks for a key and model. Inspect each integration before enabling external calls."])
    env.update(re.findall(r"^#?\s*([A-Z][A-Z0-9_]+)=", sources["backend/.env.example"], re.M))
    compose = sources["docker-compose.yml"]
    env.update(re.findall(r"\$\{([A-Z][A-Z0-9_]*)", compose))
    env.update(re.findall(r"^      ([A-Z][A-Z0-9_]+):", compose, re.M))
    env.update(re.findall(r"process\.env\.([A-Z][A-Z_0-9]*)", sources["frontend/next.config.ts"]))
    section("Literal application, Compose and example configuration keys", [f"`{k}`" for k in sorted(env)])
    lines.extend(["", "Scope includes literal process.env references, uppercase literal getter keys in application source, Next build settings, Compose and backend example declarations. Dynamic lookups, CI-only variables and secrets configured only in hosting require a separate inventory."])
    features = re.search(r"export const PLATFORM_FEATURES = \[(.*?)\] as const", sources["backend/src/common/plans.ts"], re.S)[1]
    section("Plan feature keys", [f"`{v}`" for v in re.findall(r"^\s*'(\w+)'", features, re.M)])
    lines.extend(["", "Runtime selectors include `AI_VISION_MODE`, `PAYMENT_PROVIDER` and `GUARDIAN_WHATSAPP_MODE` with `GUARDIAN_WHATSAPP_AGENCY_IDS`. A plan entitlement and a configured provider are separate conditions."])
    section("Literal TODO and FIXME markers in application source", todos)
    start = sources[plan].index("| Decision | Recommended default | Required before |")
    lines.extend(["", "## Externally owned decisions", "", sources[plan][start:].split("\n\n", 1)[0]])
    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 scripts/source-inventory.py COMMIT")
    print(report(sys.argv[1]))
