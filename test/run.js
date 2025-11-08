#!/usr/bin/env node

/**
 * Lightweight integration test runner for jsdoc-plugin-esnext.
 *
 * Executes JSDoc with the plugin enabled for a series of fixtures and validates
 * both the generated doclets (`jsdoc -X`) and the corresponding HTML output.
 *
 * The goal is to ensure the documented features listed in README.md (lines 12-19)
 * keep working over time.
 */

const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const JSDOC_BIN = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'jsdoc.cmd' : 'jsdoc');
const CONFIG_PATH = path.join(__dirname, 'jsdoc.config.json');

let configData = {};
try {
    configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (error) {
    throw new Error(`Unable to read ${CONFIG_PATH}: ${error.message}`);
}

const configuredDestination = configData?.opts?.destination;
const OUTPUT_ROOT = path.resolve(ROOT, configuredDestination ?? path.join('test', 'output'));
const AGGREGATED_DIR = OUTPUT_ROOT;

/**
 * Spawn helper that runs JSDoc with the plugin enabled.
 * Throws if the process exits with non-zero status.
 */
function runJsdoc(args, description) {
    const result = spawnSync(JSDOC_BIN, ['-c', CONFIG_PATH, ...args], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
    });

    if (result.status !== 0) {
        const error = [
            `Failed while ${description}`,
            result.stdout.trim(),
            result.stderr.trim()
        ].filter(Boolean).join('\n');
        throw new Error(error);
    }

    return result.stdout;
}

/**
 * Parses the doclets produced by `jsdoc -X`.
 */
function collectDoclets(files) {
    const stdout = runJsdoc(['-X', ...files], `collecting doclets for ${files.join(', ')}`);
    try {
        return JSON.parse(stdout);
    } catch (error) {
        throw new Error(`Unable to parse doclets JSON: ${error.message}`);
    }
}

/**
 * Generates HTML documentation for inspection.
 */
function generateHtml(files, destination) {
    fs.rmSync(destination, { recursive: true, force: true });
    runJsdoc(['-d', destination, ...files], `generating HTML output for ${files.join(', ')}`);
}

/**
 * Reads a generated HTML file and returns its contents.
 * Ensures the file exists so missing outputs trigger test failures.
 */
function readHtml(destination, relativePath) {
    const filePath = path.join(destination, relativePath);
    assert.ok(fs.existsSync(filePath), `Expected HTML file ${relativePath}`);
    return fs.readFileSync(filePath, 'utf8');
}

/**
 * Convenience helper to retrieve the first matching doclet according to a predicate.
 */
function findDoclet(doclets, predicate) {
    return doclets.find(doclet => predicate(doclet));
}

const testMatrix = [
    {
        name: 'private-members',
        sources: [path.join('test', 'fixtures', 'private-members.js')],
        htmlChecks(destination) {
            const html = readHtml(destination, 'PrivateExample.html');
            assert.ok(html.includes('#handleClick'), 'HTML should mention #handleClick');
            assert.ok(html.includes('(private, static)'), 'HTML should show private static marker');
            assert.ok(html.includes('#initialized'), 'HTML should list #initialized');
        },
        docletChecks(doclets) {
            const privateMethod = findDoclet(doclets, d => d.name === '#increment' && d.kind === 'function');
            assert.ok(privateMethod, 'Expected private method doclet for #increment');
            assert.equal(privateMethod.access, 'private', 'Private method must carry @private');

            const arrowFunction = findDoclet(doclets, d => d.name === '#handleClick' && d.kind === 'function' && !d.undocumented);
            assert.ok(arrowFunction, 'Expected arrow-bound private method to be treated as function');

            const privateField = findDoclet(doclets, d => d.name === '#initialized' && d.kind === 'member');
            assert.ok(privateField, 'Expected private field doclet for #initialized');
            assert.equal(privateField.access, 'private', 'Private field must be tagged @private');

            const staticPrivate = findDoclet(doclets, d => d.name === '#instanceCount' && d.scope === 'static');
            assert.ok(staticPrivate, 'Expected static private field to keep static scope');
            assert.ok(staticPrivate.longname?.includes('.'), 'Static private field should use dot longname');

        }
    },
    {
        name: 'static-members',
        sources: [path.join('test', 'fixtures', 'static-members.js')],
        htmlChecks(destination) {
            const consumerHtml = readHtml(destination, 'StaticConsumer.html');
            assert.ok(consumerHtml.includes('(static) </span>counter'), 'StaticConsumer.html should render counter as static');
            assert.ok(consumerHtml.includes('id=".staticProp"'), 'StaticConsumer.html should include mixin static property with dot anchor');
            const mixinHtml = readHtml(destination, 'StaticMixin.html');
            assert.ok(mixinHtml.includes('(static) </span>staticProp'), 'StaticMixin.html should render staticProp as static');
        },
        docletChecks(doclets) {
            const mixinStaticProp = findDoclet(doclets, d => d.name === 'staticProp' && d.memberof === 'StaticMixin');
            assert.ok(mixinStaticProp, 'Expected mixin static property doclet');
            assert.equal(mixinStaticProp.scope, 'static', 'Mixin static property must keep static scope');
            assert.ok(mixinStaticProp.longname?.includes('.'), 'Mixin static property should use dot longname');

            const mixinStaticMethod = findDoclet(doclets, d => d.name === 'staticMethod' && d.memberof === 'StaticMixin');
            assert.ok(mixinStaticMethod, 'Expected mixin static method doclet');
            assert.equal(mixinStaticMethod.scope, 'static', 'Mixin static method must remain static');
            assert.ok(mixinStaticMethod.longname?.includes('.'), 'Mixin static method should use dot longname');

            const augmentedStaticProp = findDoclet(doclets, d => d.name === 'staticProp' && d.memberof === 'StaticConsumer');
            assert.ok(augmentedStaticProp, 'StaticConsumer should expose mixed-in static property');
            assert.equal(augmentedStaticProp.scope, 'static', 'Mixed-in static property must remain static');

            const augmentedStaticMethod = findDoclet(doclets, d => d.name === 'staticMethod' && d.memberof === 'StaticConsumer');
            assert.ok(augmentedStaticMethod, 'StaticConsumer should expose mixed-in static method');
            assert.equal(augmentedStaticMethod.scope, 'static', 'Mixed-in static method must remain static');

            const consumerStatic = findDoclet(doclets, d => d.name === 'counter' && d.memberof === 'StaticConsumer');
            assert.ok(consumerStatic, 'Expected static member on StaticConsumer');
            assert.equal(consumerStatic.scope, 'static', 'StaticConsumer counter must be static');
            assert.ok(consumerStatic.longname?.includes('.'), 'Class static member should use dot longname');

            const privateStatic = findDoclet(doclets, d => d.name === '#token' && d.memberof === 'StaticConsumer');
            assert.ok(privateStatic, 'Expected private static token doclet');
            assert.equal(privateStatic.scope, 'static', 'Private static token must retain static scope');
            assert.ok(privateStatic.longname?.includes('.'), 'Private static token should use dot longname');
        }
    },
    {
        name: 'default-export-class',
        sources: [path.join('test', 'fixtures', 'default-export-class.js')],
        htmlChecks(destination) {
            const html = readHtml(destination, 'FooClass.html');
            assert.ok(html.includes('Class: FooClass'), 'HTML should use the class name FooClass');
        },
        docletChecks(doclets) {
            const classDoclet = findDoclet(doclets, d => d.name === 'FooClass' && d.kind === 'class' && !d.undocumented);
            assert.ok(classDoclet, 'Default exported class should keep its name');
            assert.equal(classDoclet.longname, 'FooClass', 'Class longname should match FooClass');

            const methodDoclet = findDoclet(doclets, d => d.name === 'classMethod' && d.memberof === 'FooClass');
            assert.ok(methodDoclet, 'Class method should belong to FooClass');
        }
    },
    {
        name: 'default-export-function',
        sources: [path.join('test', 'fixtures', 'default-export-function.js')],
        htmlChecks(destination) {
            const html = readHtml(destination, 'global.html');
            assert.ok(html.includes('createGreeting'), 'HTML should reference createGreeting');
        },
        docletChecks(doclets) {
            const fnDoclet = findDoclet(doclets, d => d.name === 'createGreeting' && d.kind === 'function' && !d.memberof);
            assert.ok(fnDoclet, 'Default exported function should have the correct name');
            assert.ok(!fnDoclet.memberof, 'Default exported function should not be attached to module.exports');
        }
    },
    {
        name: 'default-export-object',
        sources: [path.join('test', 'fixtures', 'default-export-object.js')],
        htmlChecks(destination) {
            const html = readHtml(destination, 'global.html');
            assert.ok(html.includes('modeConfig'), 'HTML should reference modeConfig');
        },
        docletChecks(doclets) {
            const objectDoclet = findDoclet(doclets, d => d.name === 'modeConfig' && d.kind === 'member');
            assert.ok(objectDoclet, 'Default exported object literal should have inferred name');
            assert.ok(!objectDoclet.memberof, 'Default export object should not be scoped to module.exports');
            assert.equal(objectDoclet.longname, 'modeConfig', 'Default export object should expose clean longname');
        }
    },
    {
        name: 'mixin-duplicate-fields',
        sources: [path.join('test', 'fixtures', 'mixin-duplicate-fields.js')],
        htmlChecks(destination) {
            const html = readHtml(destination, 'MixinClass.html');
            const matches = html.match(/id="field"/g) || [];
            assert.equal(matches.length, 1, 'HTML should list MixinClass#field only once');
        },
        docletChecks(doclets) {
            const mixinFieldDoclets = doclets.filter(d => d.name === 'field' && d.memberof === 'MixinClass');
            assert.equal(mixinFieldDoclets.length, 1, 'Mixin field should only produce a single doclet on MixinClass');
            const fieldDoclet = mixinFieldDoclets[0];
            assert.equal(fieldDoclet.scope, 'instance', 'Mixin field should remain an instance member');
        }
    },
    {
        name: 'default-export-function-defaults',
        sources: [path.join('test', 'fixtures', 'default-export-function-defaults.js')],
        htmlChecks(destination) {
            const html = readHtml(destination, 'global.html');
            assert.ok(html.includes('greet'), 'HTML should reference greet function');
            assert.ok(html.includes('default_value'), 'HTML should render default parameter value');
        },
        docletChecks(doclets) {
            const fnDoclet = findDoclet(doclets, d => d.name === 'greet' && d.kind === 'function' && !d.memberof);
            assert.ok(fnDoclet, 'Default exported function with default parameter should exist');
            const param = fnDoclet.params?.[0];
            assert.ok(param, 'Default exported function should list parameters');
            assert.equal(param.defaultvalue, "'default_value'", 'Default parameter value should be preserved');
        }
    }
];

let hasFailures = false;

const allSources = Array.from(new Set(testMatrix.flatMap(testCase => testCase.sources)));
fs.rmSync(OUTPUT_ROOT, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
generateHtml(allSources, AGGREGATED_DIR);

for (const testCase of testMatrix) {
    process.stdout.write(`Running ${testCase.name}… `);
    try {
        testCase.htmlChecks(AGGREGATED_DIR);

        const doclets = collectDoclets(testCase.sources);
        testCase.docletChecks(doclets);

        process.stdout.write('OK\n');
    } catch (error) {
        hasFailures = true;
        process.stdout.write('FAILED\n');
        console.error(error.message ?? String(error));
    }
}

if (hasFailures) {
    process.exitCode = 1;
    console.error('\nAt least one test failed.');
} else {
    console.log('\nAll integration tests passed.');
}

