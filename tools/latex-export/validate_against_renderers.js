#!/usr/bin/env node
/**
 * Validate OMML command aliases against both KaTeX AND MathJax.
 * Golden policy: if BOTH renderers accept it, it's valid output.
 */

const katex = require('katex');
const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');

const fs = require('fs');
const path = require('path');

const SDKJS_ROOT = path.resolve(__dirname, '../..');
const mathContentPath = path.join(SDKJS_ROOT, 'word/Math/mathContent.js');
const aliasesPath = path.join(SDKJS_ROOT, 'word/Math/OmmlCommandAliases.generated.js');

// Setup MathJax
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const mjDoc = mathjax.document('', {
    InputJax: new TeX({ packages: AllPackages }),
    OutputJax: new SVG(),
});

function testKaTeX(latex) {
    try {
        katex.renderToString(latex, { throwOnError: true, strict: 'warn' });
        return true;
    } catch (e) { return false; }
}

function testMathJax(latex) {
    try {
        const node = mjDoc.convert(latex, { display: false });
        const svg = adaptor.innerHTML(node);
        // MathJax renders errors as <merror> elements
        return !svg.includes('merror') && !svg.includes('data-mjx-error');
    } catch (e) { return false; }
}

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

function parseAliases() {
    const code = fs.readFileSync(aliasesPath, 'utf8');
    const window = { AscMath: {} };
    new Function('window', code)(window);
    return {
        aliases: window.AscMath.OmmlCommandAliases || {},
        removeList: window.AscMath.OmmlCommandRemoveList || {},
    };
}

function main() {
    const ommlCommands = parseOmmlCommands();
    const { aliases, removeList } = parseAliases();

    console.log('='.repeat(70));
    console.log('OMML COMMAND VALIDATION: KaTeX + MathJax');
    console.log('='.repeat(70));
    console.log(`OMML commands: ${Object.keys(ommlCommands).length}`);
    console.log(`Aliases: ${Object.keys(aliases).length} replace + ${Object.keys(removeList).length} remove`);
    console.log();

    // Test all OMML commands natively
    const native = { both: [], katexOnly: [], mathjaxOnly: [], neither: [] };
    for (const cmd of Object.keys(ommlCommands)) {
        const k = testKaTeX(cmd + ' ');
        const m = testMathJax(cmd);
        if (k && m) native.both.push(cmd);
        else if (k) native.katexOnly.push(cmd);
        else if (m) native.mathjaxOnly.push(cmd);
        else native.neither.push(cmd);
    }

    console.log('PHASE 1: Native OMML command support');
    console.log('-'.repeat(70));
    console.log(`Both support:      ${native.both.length}`);
    console.log(`KaTeX only:        ${native.katexOnly.length}`);
    console.log(`MathJax only:      ${native.mathjaxOnly.length}`);
    console.log(`Neither:           ${native.neither.length}`);

    if (native.mathjaxOnly.length > 0) {
        console.log(`\nMathJax-only (KaTeX rejects):`);
        for (const cmd of native.mathjaxOnly.slice(0, 20))
            console.log(`  ${cmd}`);
        if (native.mathjaxOnly.length > 20) console.log(`  ... and ${native.mathjaxOnly.length - 20} more`);
    }

    // Test alias outputs
    const aliasResults = { bothOk: [], katexOnly: [], mathjaxOnly: [], bothFail: [] };
    const unnecessary = []; // both renderers support original

    for (const [cmd, latex] of Object.entries(aliases)) {
        const k = testKaTeX(latex + (latex.match(/[a-zA-Z]$/) ? ' ' : ''));
        const m = testMathJax(latex);
        if (k && m) aliasResults.bothOk.push({ cmd, latex });
        else if (k) aliasResults.katexOnly.push({ cmd, latex });
        else if (m) aliasResults.mathjaxOnly.push({ cmd, latex });
        else aliasResults.bothFail.push({ cmd, latex });

        // Check if alias is unnecessary
        const origK = testKaTeX(cmd + ' ');
        const origM = testMathJax(cmd);
        if (origK && origM) unnecessary.push({ cmd, latex });
    }

    console.log(`\nPHASE 2: Alias mapping validation`);
    console.log('-'.repeat(70));
    console.log(`Both render OK:    ${aliasResults.bothOk.length}`);
    console.log(`KaTeX only:        ${aliasResults.katexOnly.length}`);
    console.log(`MathJax only:      ${aliasResults.mathjaxOnly.length}`);
    console.log(`Both FAIL:         ${aliasResults.bothFail.length}`);
    console.log(`Unnecessary:       ${unnecessary.length} (original works in both)`);

    if (aliasResults.bothFail.length > 0) {
        console.log(`\nBROKEN (both fail):`);
        for (const { cmd, latex } of aliasResults.bothFail)
            console.log(`  ${cmd.padEnd(20)} → ${latex}`);
    }

    if (aliasResults.mathjaxOnly.length > 0) {
        console.log(`\nMathJax-only (KaTeX rejects alias):`);
        for (const { cmd, latex } of aliasResults.mathjaxOnly)
            console.log(`  ${cmd.padEnd(20)} → ${latex}`);
    }

    if (aliasResults.katexOnly.length > 0) {
        console.log(`\nKaTeX-only (MathJax rejects alias):`);
        for (const { cmd, latex } of aliasResults.katexOnly)
            console.log(`  ${cmd.padEnd(20)} → ${latex}`);
    }

    if (unnecessary.length > 0) {
        console.log(`\nUNNECESSARY (move to VALID_LATEX_COMMANDS):`);
        for (const { cmd, latex } of unnecessary)
            console.log(`  ${cmd.padEnd(20)} → ${latex}`);
    }

    // Gap analysis
    const gaps = [];
    for (const cmd of native.neither) {
        if (!aliases[cmd] && !removeList[cmd]) gaps.push(cmd);
    }
    console.log(`\nPHASE 3: Gaps`);
    console.log('-'.repeat(70));
    if (gaps.length > 0) {
        console.log(`${gaps.length} commands with no renderer support and no alias:`);
        for (const cmd of gaps) console.log(`  ${cmd}`);
    } else {
        console.log('No gaps — full coverage.');
    }

    // Summary
    const total = Object.keys(ommlCommands).length;
    const covered = native.both.length + native.katexOnly.length + native.mathjaxOnly.length
        + aliasResults.bothOk.length + aliasResults.katexOnly.length + aliasResults.mathjaxOnly.length
        + Object.keys(removeList).length;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`COVERAGE: ${native.both.length} native + ${Object.keys(aliases).length} aliased + ${Object.keys(removeList).length} removed = ${total} total`);
    console.log('='.repeat(70));
}

main();
