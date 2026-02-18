#!/usr/bin/env bun
import { spawn } from "child_process"
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

type Color = "reset" | "green" | "yellow" | "blue" | "red" | "cyan" | "magenta"

const colors: Record<Color, string> = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m"
}

function colorize(text: string, color: Color): string {
    return `${colors[color]}${text}${colors.reset}`
}

function log(message: string, color: Color = "reset") {
    console.log(colorize(message, color))
}

function header(text: string) {
    console.log("\n" + colorize("═".repeat(60), "cyan"))
    console.log(colorize(`  ${text}`, "cyan"))
    console.log(colorize("═".repeat(60), "cyan") + "\n")
}

function execCommand(
    command: string,
    cwd?: string
): Promise<{ stdout: string; stderr: string; code: number }> {
    return new Promise(resolve => {
        const child = spawn(command, {
            shell: true,
            cwd: cwd || process.cwd(),
            stdio: "inherit"
        })

        child.on("close", code => {
            resolve({ stdout: "", stderr: "", code: code || 0 })
        })
    })
}

async function prompt(question: string): Promise<string> {
    process.stdout.write(colorize(question, "yellow"))
    return new Promise(resolve => {
        process.stdin.once("data", data => {
            resolve(data.toString().trim())
        })
    })
}

function getVersion(packagePath: string): string {
    try {
        const pkg = JSON.parse(readFileSync(packagePath, "utf-8"))
        return pkg.version
    } catch {
        return "0.0.0"
    }
}

function incrementVersion(version: string): string {
    const parts = version.split(".")
    parts[2] = String(Number(parts[2]) + 1)
    return parts.join(".")
}

function updateVersion(packagePath: string, newVersion: string) {
    const pkg = JSON.parse(readFileSync(packagePath, "utf-8"))
    pkg.version = newVersion
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n")
}

async function buildAll() {
    header("Building All Packages")
    log("Running: bun run build", "blue")
    const result = await execCommand("bun run build")
    if (result.code === 0) {
        log("✓ All packages built successfully!", "green")
    } else {
        log("✗ Build failed", "red")
        process.exit(1)
    }
}

async function buildPackage(name: string, path: string) {
    header(`Building ${name}`)
    log(`Running: bun run build in ${path}`, "blue")
    const result = await execCommand("bun run build", path)
    if (result.code === 0) {
        log(`✓ ${name} built successfully!`, "green")
    } else {
        log(`✗ ${name} build failed`, "red")
        process.exit(1)
    }
}

async function deployDashboard() {
    header("Deploying Dashboard to Vercel")

    const answer = await prompt("Deploy to production? (y/n): ")
    const isProduction = answer.toLowerCase() === "y"

    log(`Deploying dashboard${isProduction ? " to production" : ""}...`, "blue")

    const command = isProduction ? "vercel --prod" : "vercel"
    const result = await execCommand(command, "apps/dashboard")

    if (result.code === 0) {
        log("✓ Dashboard deployed successfully!", "green")
    } else {
        log("✗ Dashboard deployment failed", "red")
        process.exit(1)
    }
}

async function publishSDK() {
    header("Publishing SDK to npm")

    const packagePath = "packages/sdk/package.json"
    const currentVersion = getVersion(packagePath)

    log(`Current version: ${currentVersion}`, "cyan")

    const answer = await prompt(
        `Increment version? (y/n) [auto: ${incrementVersion(currentVersion)}]: `
    )

    if (answer.toLowerCase() === "y") {
        const newVersion = incrementVersion(currentVersion)
        log(`Updating version to ${newVersion}...`, "blue")
        updateVersion(packagePath, newVersion)

        log("Updating CHANGELOG.md...", "blue")
        const changelog = readFileSync("packages/sdk/CHANGELOG.md", "utf-8")
        const date = new Date().toISOString().split("T")[0]
        const newEntry = `\n## [${newVersion}] - ${date}\n\n### Changed\n\n- Bug fixes and improvements\n\n`
        const updatedChangelog = changelog.replace(
            /^(# Changelog\n\n[^\n]*\n\n)/,
            `$1${newEntry}`
        )
        writeFileSync("packages/sdk/CHANGELOG.md", updatedChangelog)

        log("Committing version bump...", "blue")
        await execCommand(
            `git add packages/sdk/package.json packages/sdk/CHANGELOG.md`
        )
        await execCommand(
            `git commit -m "chore(sdk): bump version to ${newVersion}"`
        )
        log("✓ Version updated and committed", "green")
    }

    log("Building SDK...", "blue")
    const buildResult = await execCommand("bun run build", "packages/sdk")
    if (buildResult.code !== 0) {
        log("✗ Build failed", "red")
        process.exit(1)
    }
    log("✓ Build successful", "green")

    const dryRunAnswer = await prompt("Run dry-run first? (y/n): ")
    if (dryRunAnswer.toLowerCase() === "y") {
        log("Running npm publish --dry-run...", "blue")
        await execCommand("npm publish --dry-run", "packages/sdk")
    }

    const publishAnswer = await prompt("Publish to npm now? (y/n): ")
    if (publishAnswer.toLowerCase() === "y") {
        log("Publishing to npm...", "blue")
        const result = await execCommand(
            "npm publish --access public",
            "packages/sdk"
        )
        if (result.code === 0) {
            log("✓ SDK published successfully!", "green")
            log(
                "View at: https://www.npmjs.com/package/@remcostoeten/analytics",
                "cyan"
            )
        } else {
            log("✗ Publish failed", "red")
            process.exit(1)
        }
    }
}

async function runTests() {
    header("Running Tests")
    log("Running: bun test", "blue")
    const result = await execCommand("bun test")
    if (result.code === 0) {
        log("✓ All tests passed!", "green")
    } else {
        log("✗ Tests failed", "red")
        process.exit(1)
    }
}

async function typecheck() {
    header("Type Checking")
    log("Running: bun run typecheck", "blue")
    const result = await execCommand("bun run typecheck")
    if (result.code === 0) {
        log("✓ Type check passed!", "green")
    } else {
        log("✗ Type check failed", "red")
        process.exit(1)
    }
}

async function createGitTag() {
    header("Creating Git Tag")

    const version = getVersion("packages/sdk/package.json")
    const tagName = `v${version}`

    log(`Creating tag: ${tagName}`, "blue")

    const message = await prompt(
        `Tag message (default: "Release ${tagName}"): `
    )
    const tagMessage = message || `Release ${tagName}`

    await execCommand(`git tag -a ${tagName} -m "${tagMessage}"`)

    const pushAnswer = await prompt("Push tag to remote? (y/n): ")
    if (pushAnswer.toLowerCase() === "y") {
        log("Pushing tag...", "blue")
        await execCommand(`git push origin ${tagName}`)
        log("✓ Tag pushed successfully!", "green")
    }
}

async function fullRelease() {
    header("Full Release Process")

    log("This will:", "yellow")
    log("  1. Run tests", "yellow")
    log("  2. Type check", "yellow")
    log("  3. Build all packages", "yellow")
    log("  4. Deploy dashboard to Vercel", "yellow")
    log("  5. Publish SDK to npm", "yellow")
    log("  6. Create and push git tag", "yellow")

    const answer = await prompt("\nContinue? (y/n): ")
    if (answer.toLowerCase() !== "y") {
        log("Cancelled", "yellow")
        return
    }

    await runTests()
    await typecheck()
    await buildAll()
    await deployDashboard()
    await publishSDK()
    await createGitTag()

    header("🎉 Release Complete!")
    log("All steps completed successfully!", "green")
}

async function showMenu() {
    console.clear()
    header("🚀 Remco Analytics Deployment Tool")

    log("1. Build all packages", "cyan")
    log("2. Build SDK only", "cyan")
    log("3. Build Dashboard only", "cyan")
    log("4. Build Ingestion only", "cyan")
    log("5. Deploy Dashboard to Vercel", "cyan")
    log("6. Publish SDK to npm", "cyan")
    log("7. Run tests", "cyan")
    log("8. Type check", "cyan")
    log("9. Create git tag", "cyan")
    log("10. Full release (all steps)", "cyan")
    log("0. Exit", "cyan")

    const choice = await prompt("\nSelect an option: ")

    switch (choice) {
        case "1":
            await buildAll()
            break
        case "2":
            await buildPackage("SDK", "packages/sdk")
            break
        case "3":
            await buildPackage("Dashboard", "apps/dashboard")
            break
        case "4":
            await buildPackage("Ingestion", "apps/ingestion")
            break
        case "5":
            await deployDashboard()
            break
        case "6":
            await publishSDK()
            break
        case "7":
            await runTests()
            break
        case "8":
            await typecheck()
            break
        case "9":
            await createGitTag()
            break
        case "10":
            await fullRelease()
            break
        case "0":
            log("Goodbye! 👋", "green")
            process.exit(0)
        default:
            log("Invalid option", "red")
    }

    const continueAnswer = await prompt("\nPress Enter to continue...")
    await showMenu()
}

async function main() {
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
        process.stdin.setRawMode(false)
    }
    process.stdin.resume()

    await showMenu()
}

main().catch(error => {
    log(`Error: ${error.message}`, "red")
    process.exit(1)
})
