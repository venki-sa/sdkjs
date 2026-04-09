#!/usr/bin/env node
/**
 * Validate OMML command aliases against KaTeX.
 *
 * Reads OmmlCommandAliases.generated.js data and tests each:
 *   1. Does the OMML command render in KaTeX? (if yes, no mapping needed)
 *   2. Does the mapped LaTeX render in KaTeX? (if no, mapping is wrong)
 *
 * Also validates all 483 OMML commands from mathContent.js to find which
 * ones KaTeX already supports natively.
 *
 * Usage: node validate_against_katex.js
 */

const katex = require('katex');

// Parse mathContent.js OMML commands
const fs = require('fs');
const path = require('path');

const SDKJS_ROOT = path.resolve(__dirname, '../..');
const mathContentPath = path.join(SDKJS_ROOT, 'word/Math/mathContent.js');
const aliasesPath = path.join(SDKJS_ROOT, 'word/Math/OmmlCommandAliases.generated.js');

function testKaTeX(latex) {
    try {
        katex.renderToString(latex, { throwOnError: true, strict: 'error' });
        return { ok: true, error: null };
    } catch (e) {
        // Retry with strict: warn (some things work in practice but strict rejects)
        try {
            katex.renderToString(latex, { throwOnError: true, strict: 'warn' });
            return { ok: true, error: null, strictOnly: true };
        } catch (e2) {
            return { ok: false, error: e2.message.slice(0, 120) };
        }
    }
}

// Extract OMML commands from mathContent.js
function parseOmmlCommands() {
    const text = fs.readFileSync(mathContentPath, 'utf8');
    const pattern = /\['(\\\\[a-zA-Z]+)',\s*0x([0-9A-Fa-f]+)\]/g;
    const commands = {};
    let match;
    while ((match = pattern.exec(text)) !== null) {
        commands[match[1].replace(/\\\\/g, '\\')] = parseInt(match[2], 16);
    }
    return commands;
}

// Parse the generated aliases file
function parseAliases() {
    // Execute in isolated context
    const code = fs.readFileSync(aliasesPath, 'utf8');
    const window = { AscMath: {} };
    const fn = new Function('window', code);
    fn(window);
    return {
        aliases: window.AscMath.OmmlCommandAliases || {},
        removeList: window.AscMath.OmmlCommandRemoveList || {},
        meta: window.AscMath.OmmlCommandAliasesMeta || {},
    };
}

function main() {
    const ommlCommands = parseOmmlCommands();
    const { aliases, removeList, meta } = parseAliases();

    console.log('='.repeat(70));
    console.log('OMML → LaTeX VALIDATION AGAINST KaTeX');
    console.log('='.repeat(70));
    console.log(`KaTeX version: ${katex.version || 'unknown'}`);
    console.log(`OMML commands: ${Object.keys(ommlCommands).length}`);
    console.log(`Alias entries: ${meta.totalEntries}`);
    console.log();

    // Phase 1: Test all OMML commands directly in KaTeX
    console.log('-'.repeat(70));
    console.log('PHASE 1: Which OMML commands does KaTeX support natively?');
    console.log('-'.repeat(70));

    const nativelySupported = [];
    const notSupported = [];

    for (const [cmd, codepoint] of Object.entries(ommlCommands)) {
        // Test the command with a simple usage
        const testExpr = cmd + ' ';
        const result = testKaTeX(testExpr);
        if (result.ok) {
            nativelySupported.push(cmd);
        } else {
            notSupported.push({ cmd, codepoint, error: result.error });
        }
    }

    console.log(`Natively supported: ${nativelySupported.length}`);
    console.log(`Not supported:      ${notSupported.length}`);
    console.log();

    // Phase 2: For commands with aliases, test the alias output
    console.log('-'.repeat(70));
    console.log('PHASE 2: Do alias mappings produce valid KaTeX?');
    console.log('-'.repeat(70));

    const aliasOk = [];
    const aliasBad = [];
    const aliasUnnecessary = []; // alias exists but KaTeX supports the original

    for (const [cmd, latex] of Object.entries(aliases)) {
        const aliasResult = testKaTeX(latex + ' ');
        const originalResult = testKaTeX(cmd + ' ');

        if (originalResult.ok) {
            aliasUnnecessary.push({ cmd, latex, note: 'KaTeX already supports original' });
        }

        if (aliasResult.ok) {
            aliasOk.push({ cmd, latex });
        } else {
            aliasBad.push({ cmd, latex, error: aliasResult.error });
        }
    }

    console.log(`Alias renders OK:      ${aliasOk.length}`);
    console.log(`Alias renders FAIL:    ${aliasBad.length}`);
    console.log(`Alias unnecessary:     ${aliasUnnecessary.length} (KaTeX supports original)`);
    console.log();

    if (aliasBad.length > 0) {
        console.log('BROKEN ALIASES (mapped LaTeX fails in KaTeX):');
        for (const { cmd, latex, error } of aliasBad) {
            console.log(`  ${cmd.padEnd(20)} → ${latex.padEnd(30)} ERROR: ${error.slice(0, 60)}`);
        }
        console.log();
    }

    if (aliasUnnecessary.length > 0) {
        console.log('UNNECESSARY ALIASES (KaTeX already supports the OMML command):');
        for (const { cmd, latex } of aliasUnnecessary) {
            console.log(`  ${cmd.padEnd(20)} → ${latex.padEnd(30)} (original works in KaTeX)`);
        }
        console.log();
    }

    // Phase 3: Commands with no alias AND not supported by KaTeX
    console.log('-'.repeat(70));
    console.log('PHASE 3: Gap analysis — OMML commands with no path to valid LaTeX');
    console.log('-'.repeat(70));

    const gaps = [];
    for (const { cmd, codepoint } of notSupported) {
        if (!aliases[cmd] && !removeList[cmd]) {
            gaps.push({ cmd, codepoint });
        }
    }

    if (gaps.length > 0) {
        console.log(`Commands with no alias and no KaTeX support: ${gaps.length}`);
        for (const { cmd, codepoint } of gaps) {
            console.log(`  ${cmd.padEnd(20)} U+${codepoint.toString(16).toUpperCase().padStart(4, '0')}  ${String.fromCodePoint(codepoint)}`);
        }
    } else {
        console.log('No gaps — every OMML command either works in KaTeX or has a valid alias.');
    }

    // Phase 4: Remove list validation
    console.log();
    console.log('-'.repeat(70));
    console.log('PHASE 4: Remove list — commands that should be silently dropped');
    console.log('-'.repeat(70));
    for (const cmd of Object.keys(removeList)) {
        const result = testKaTeX(cmd + ' ');
        const status = result.ok ? 'KaTeX supports (reconsider removal?)' : 'KaTeX rejects (removal correct)';
        console.log(`  ${cmd.padEnd(20)} ${status}`);
    }

    // Summary
    console.log();
    console.log('='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total OMML commands:           ${Object.keys(ommlCommands).length}`);
    console.log(`KaTeX supports natively:       ${nativelySupported.length}`);
    console.log(`Mapped via alias (valid):      ${aliasOk.length}`);
    console.log(`Mapped via alias (BROKEN):     ${aliasBad.length}`);
    console.log(`Mapped to remove:              ${Object.keys(removeList).length}`);
    console.log(`Unnecessary aliases:           ${aliasUnnecessary.length}`);
    console.log(`Gaps (no path to valid):       ${gaps.length}`);
    console.log(`Coverage: ${((nativelySupported.length + aliasOk.length + Object.keys(removeList).length) / Object.keys(ommlCommands).length * 100).toFixed(1)}%`);
}

main();
