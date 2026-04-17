#!/usr/bin/env bun

import { select, confirm, multiselect } from "@inquirer/prompts"
import { spawn } from "child_process"
import { readdir } from "fs/promises"
import { join } from "path"

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
}

function log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`)
}

async function runCommand(
    command: string,
    cwd: string = process.cwd()
): Promise<boolean> {
    return new Promise(resolve => {
        log(`\n▶ Running: ${command}`, colors.cyan)
        const [cmd, ...args] = command.split(" ")
        const proc = spawn(cmd, args, { cwd, stdio: "inherit", shell: true })

        proc.on("close", code => {
            if (code === 0) {
                log("✓ Success\n", colors.green)
                resolve(true)
            } else {
                log(`✗ Failed with code ${code}\n`, colors.red)
                resolve(false)
            }
        })
    })
}

async function findTestFiles(baseDir: string): Promise<string[]> {
    const testFiles: string[] = []

    async function scan(dir: string) {
        try {
            const entries = await readdir(dir, { withFileTypes: true })
            for (const entry of entries) {
                const fullPath = join(dir, entry.name)
                if (
                    entry.isDirectory() &&
                    !entry.name.includes("node_modules")
                ) {
                    await scan(fullPath)
                } else if (
                    entry.isFile() &&
                    (entry.name.endsWith(".test.ts") ||
                        entry.name.endsWith(".spec.ts"))
                ) {
                    testFiles.push(fullPath.replace(baseDir + "/", ""))
                }
            }
        } catch {}
    }

    await scan(baseDir)
    return testFiles.sort()
}

async function testMenu() {
    const action = await select({
        message: "Test Options:",
        choices: [
            { value: "all", name: "Run All Tests" },
            { value: "individual", name: "Run Individual Package Tests" },
            { value: "files", name: "Run Specific Test Files" },
            { value: "watch", name: "Watch Mode" },
            { value: "coverage", name: "Run with Coverage" },
            { value: "back", name: "Back" }
        ]
    })

    if (action === "back") return

    if (action === "all") {
        await runCommand("bun test")
    } else if (action === "watch") {
        await runCommand("bun test --watch")
    } else if (action === "coverage") {
        await runCommand("bun test --coverage")
    } else if (action === "individual") {
        const selected = await multiselect({
            message: "Select packages to test:",
            choices: [
                { value: "packages/db", name: "Database" },
                { value: "apps/ingestion", name: "Ingestion" },
                { value: "packages/sdk", name: "SDK" },
                { value: "apps/example-dashboard", name: "Dashboard" }
            ]
        })

        for (const pkg of selected) {
            await runCommand("bun test", pkg)
        }
    } else if (action === "files") {
        log("Scanning for test files...", colors.yellow)
        const testFiles = await findTestFiles(process.cwd())

        if (testFiles.length === 0) {
            log("No test files found!", colors.red)
            return
        }

        const selected = await multiselect({
            message: "Select test files to run:",
            choices: testFiles.map(file => ({ value: file, name: file }))
        })

        if (selected.length > 0) {
            await runCommand(`bun test ${selected.join(" ")}`)
        }
    }
}

async function buildMenu() {
    const action = await select({
        message: "Build Options:",
        choices: [
            { value: "all", name: "Build All" },
            { value: "individual", name: "Build Individual Packages" },
            { value: "back", name: "Back" }
        ]
    })

    if (action === "back") return

    if (action === "all") {
        await runCommand("bun run build")
    } else if (action === "individual") {
        const selected = await multiselect({
            message: "Select packages to build:",
            choices: [
                { value: "apps/ingestion", name: "Ingestion" },
                { value: "apps/example-dashboard", name: "Dashboard" },
                { value: "packages/sdk", name: "SDK" },
                { value: "packages/db", name: "Database" }
            ]
        })

        for (const pkg of selected) {
            await runCommand("bun run build", pkg)
        }
    }
}

async function devMenu() {
    const action = await select({
        message: "Development Options:",
        choices: [
            { value: "ingestion", name: "Start Ingestion Server" },
            { value: "dashboard", name: "Start Dashboard Server" },
            { value: "typecheck", name: "Type Check All" },
            { value: "lint", name: "Lint All" },
            { value: "fmt:check", name: "Format Check" },
            { value: "fmt", name: "Format Fix" },
            { value: "back", name: "Back" }
        ]
    })

    if (action === "back") return

    const commandMap: Record<string, { command: string; cwd?: string }> = {
        ingestion: { command: "bun run dev", cwd: "apps/ingestion" },
        dashboard: { command: "bun run dev", cwd: "apps/example-dashboard" },
        typecheck: { command: "bun run typecheck" },
        lint: { command: "bun run lint" },
        "fmt:check": { command: "bun run fmt:check" },
        fmt: { command: "bun run fmt" }
    }

    const cmd = commandMap[action]
    if (cmd) await runCommand(cmd.command, cmd.cwd)
}

async function dbMenu() {
    const action = await select({
        message: "Database Options:",
        choices: [
            { value: "generate", name: "Generate Migration" },
            { value: "migrate", name: "Run Migration" },
            { value: "studio", name: "Open Drizzle Studio" },
            { value: "back", name: "Back" }
        ]
    })

    if (action === "back") return

    const commandMap: Record<string, string> = {
        generate: "bun run db:generate",
        migrate: "bun run db:migrate",
        studio: "bun run db:studio"
    }

    if (commandMap[action]) {
        await runCommand(commandMap[action], "packages/db")
    }
}

async function main() {
    log("\n╔════════════════════════════════════════╗", colors.cyan)
    log("║   Analytics Platform CLI               ║", colors.cyan)
    log("╚════════════════════════════════════════╝\n", colors.cyan)

    while (true) {
        const choice = await select({
            message: "What would you like to do?",
            choices: [
                { value: "test", name: "Tests" },
                { value: "build", name: "Build" },
                { value: "dev", name: "Development" },
                { value: "db", name: "Database" },
                { value: "install", name: "Install Dependencies" },
                { value: "clean", name: "Clean & Reinstall" },
                { value: "exit", name: "Exit" }
            ]
        })

        if (choice === "exit") {
            log("\nGoodbye!\n", colors.green)
            process.exit(0)
        }

        if (choice === "test") await testMenu()
        else if (choice === "build") await buildMenu()
        else if (choice === "dev") await devMenu()
        else if (choice === "db") await dbMenu()
        else if (choice === "install") await runCommand("bun install")
        else if (choice === "clean") {
            const confirmClean = await confirm({
                message: "Delete node_modules and reinstall?"
            })
            if (confirmClean) {
                await runCommand("rm -rf node_modules")
                await runCommand("bun install")
            }
        }

        console.log("\n")
    }
}

main().catch(error => {
    log(`\nError: ${error.message}\n`, colors.red)
    process.exit(1)
})
