#!/usr/bin/env node

/**
 * Auto-update script for PublicProviderConf
 * Automatically fetches latest provider data and commits changes
 */

import { execSync } from 'child_process';
import { promises as fs, existsSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BACKUP_DIR = join(ROOT_DIR, '.auto-update-backup');
const DIST_DIR = join(ROOT_DIR, 'dist');
const EXCLUDED_FILES = ['all.json', 'dc_sync_version.json'];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  const defaultOptions = {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    stdio: options.silent ? 'pipe' : 'inherit',
  };
  return execSync(command, { ...defaultOptions, ...options });
}

function resolveUpstreamBranch(branch) {
  try {
    return exec('git rev-parse --abbrev-ref --symbolic-full-name @{u}', { silent: true }).trim();
  } catch {
    try {
      exec(`git show-ref --verify --quiet refs/remotes/origin/${branch}`, { silent: true });
      return `origin/${branch}`;
    } catch {
      return null;
    }
  }
}

function forceCleanWorkingTree() {
  log('   Cleaning working tree (hard reset + clean)...', 'blue');
  exec('git reset --hard HEAD');
  exec('git clean -fd');
  log('   ✅ Working tree cleaned', 'green');
}

function syncBranchToLatest(branch) {
  log('   Syncing repository to latest remote commit...', 'blue');

  try {
    exec('git fetch --all --prune');
  } catch (error) {
    log(`   ⚠️  Fetch failed, continue with local HEAD: ${error.message}`, 'yellow');
    return;
  }

  const upstream = resolveUpstreamBranch(branch);
  if (!upstream) {
    log('   ⚠️  No upstream branch found, continue with local HEAD', 'yellow');
    return;
  }

  try {
    exec(`git reset --hard ${upstream}`);
    log(`   ✅ Synced to ${upstream}`, 'green');
  } catch (error) {
    log(`   ⚠️  Failed to reset to ${upstream}, continue with local HEAD: ${error.message}`, 'yellow');
  }
}

// ============================================
// Phase 1: Prerequisites Check
// ============================================

async function checkPrerequisites() {
  log('\n🔍 Checking prerequisites...', 'cyan');

  // Check if we're in a git repo
  try {
    exec('git rev-parse --git-dir', { silent: true });
  } catch {
    throw new Error('Not a git repository');
  }

  // Check current branch
  const branch = exec('git branch --show-current', { silent: true }).trim();
  if (!branch) {
    throw new Error('Detached HEAD is not supported. Please checkout a branch first.');
  }
  log(`   Current branch: ${branch}`, 'blue');

  // Force clean local changes to maximize automation success
  forceCleanWorkingTree();
  syncBranchToLatest(branch);

  // Check if dist directory exists
  if (!existsSync(DIST_DIR)) {
    log('   Creating dist directory...', 'yellow');
    await fs.mkdir(DIST_DIR, { recursive: true });
  }

  log('   ✅ Prerequisites check passed', 'green');
  return branch;
}

// ============================================
// Phase 2: Backup
// ============================================

async function backupDist() {
  log('\n💾 Backing up current dist...', 'cyan');

  // Clean up old backup
  if (existsSync(BACKUP_DIR)) {
    await fs.rm(BACKUP_DIR, { recursive: true });
  }

  await fs.mkdir(BACKUP_DIR, { recursive: true });

  // Copy all JSON files except excluded ones
  const files = await fs.readdir(DIST_DIR);
  let backupCount = 0;

  for (const file of files) {
    if (file.endsWith('.json') && !EXCLUDED_FILES.includes(file)) {
      const src = join(DIST_DIR, file);
      const dest = join(BACKUP_DIR, file);
      await fs.copyFile(src, dest);
      backupCount++;
    }
  }

  log(`   ✅ Backed up ${backupCount} provider files`, 'green');
  return backupCount;
}

// ============================================
// Phase 3: Build and Run
// ============================================

async function runBuild() {
  log('\n🔨 Running build process...', 'cyan');

  try {
    log('   Installing dependencies...', 'blue');
    exec('pnpm install --frozen-lockfile');

    log('   Building project...', 'blue');
    exec('pnpm build');

    log('   Fetching provider data...', 'blue');
    exec('pnpm start');

    log('   ✅ Build completed successfully', 'green');
  } catch (error) {
    throw new Error(`Build failed: ${error.message}`);
  }
}

// ============================================
// Phase 4: Compare Providers
// ============================================

function extractComparableData(provider) {
  if (!provider || !provider.models) return null;

  return {
    id: provider.id,
    name: provider.name,
    models: provider.models.map(m => ({
      id: m.id,
      name: m.name,
      status: m.status || 'active',
      cost: m.cost || {},
      limit: m.limit || {},
      tool_call: m.tool_call || false,
      attachment: m.attachment || false,
      reasoning: m.reasoning || false,
    })),
  };
}

function compareModels(oldModels, newModels) {
  const oldMap = new Map(oldModels.map(m => [m.id, m]));
  const newMap = new Map(newModels.map(m => [m.id, m]));

  const added = [];
  const removed = [];
  const updated = [];

  // Find added and updated
  for (const [id, newModel] of newMap) {
    if (!oldMap.has(id)) {
      added.push(newModel);
    } else {
      const oldModel = oldMap.get(id);
      const changes = [];

      if (oldModel.status !== newModel.status) {
        changes.push({ field: 'status', old: oldModel.status, new: newModel.status });
      }
      if (JSON.stringify(oldModel.cost) !== JSON.stringify(newModel.cost)) {
        changes.push({ field: 'cost', old: oldModel.cost, new: newModel.cost });
      }
      if (JSON.stringify(oldModel.limit) !== JSON.stringify(newModel.limit)) {
        changes.push({ field: 'limit', old: oldModel.limit, new: newModel.limit });
      }
      if (oldModel.tool_call !== newModel.tool_call) {
        changes.push({ field: 'tool_call', old: oldModel.tool_call, new: newModel.tool_call });
      }
      if (oldModel.attachment !== newModel.attachment) {
        changes.push({ field: 'attachment', old: oldModel.attachment, new: newModel.attachment });
      }

      if (changes.length > 0) {
        updated.push({ model: newModel, changes });
      }
    }
  }

  // Find removed
  for (const [id, oldModel] of oldMap) {
    if (!newMap.has(id)) {
      removed.push(oldModel);
    }
  }

  return { added, removed, updated };
}

async function compareProviders() {
  log('\n📊 Comparing provider data...', 'cyan');

  const changes = {
    providers: {},
    summary: { added: 0, removed: 0, updated: 0, priceChanged: 0 },
  };

  // Get all new provider files
  const newFiles = (await fs.readdir(DIST_DIR))
    .filter(f => f.endsWith('.json') && !EXCLUDED_FILES.includes(f));

  // Get all old provider files
  const oldFiles = existsSync(BACKUP_DIR)
    ? (await fs.readdir(BACKUP_DIR)).filter(f => f.endsWith('.json'))
    : [];

  const allProviders = new Set([
    ...oldFiles.map(f => basename(f, '.json')),
    ...newFiles.map(f => basename(f, '.json')),
  ]);

  for (const providerName of allProviders) {
    const oldPath = join(BACKUP_DIR, `${providerName}.json`);
    const newPath = join(DIST_DIR, `${providerName}.json`);

    let oldData = null;
    let newData = null;

    if (existsSync(oldPath)) {
      const content = await fs.readFile(oldPath, 'utf8');
      oldData = extractComparableData(JSON.parse(content));
    }

    if (existsSync(newPath)) {
      const content = await fs.readFile(newPath, 'utf8');
      newData = extractComparableData(JSON.parse(content));
    }

    // Skip if both are null (shouldn't happen)
    if (!oldData && !newData) continue;

    // New provider added
    if (!oldData && newData) {
      changes.providers[providerName] = {
        type: 'added',
        name: newData.name,
        modelsAdded: newData.models.length,
      };
      changes.summary.added += newData.models.length;
      continue;
    }

    // Provider removed
    if (oldData && !newData) {
      changes.providers[providerName] = {
        type: 'removed',
        name: oldData.name,
        modelsRemoved: oldData.models.length,
      };
      changes.summary.removed += oldData.models.length;
      continue;
    }

    // Compare models
    const modelChanges = compareModels(oldData.models, newData.models);

    if (modelChanges.added.length > 0 || modelChanges.removed.length > 0 || modelChanges.updated.length > 0) {
      changes.providers[providerName] = {
        type: 'modified',
        name: newData.name,
        modelsAdded: modelChanges.added.length,
        modelsRemoved: modelChanges.removed.length,
        modelsUpdated: modelChanges.updated.length,
        added: modelChanges.added,
        removed: modelChanges.removed,
        updated: modelChanges.updated,
      };
      changes.summary.added += modelChanges.added.length;
      changes.summary.removed += modelChanges.removed.length;
      changes.summary.updated += modelChanges.updated.length;

      // Count price changes
      const priceChanges = modelChanges.updated.filter(u =>
        u.changes.some(c => c.field === 'cost')
      ).length;
      changes.summary.priceChanged += priceChanges;
    }
  }

  const modifiedProviders = Object.keys(changes.providers).length;
  log(`   Found changes in ${modifiedProviders} provider(s)`, 'blue');

  return changes;
}

function hasSubstantialChanges(changes) {
  return Object.keys(changes.providers).length > 0;
}

// ============================================
// Phase 5: Generate Commit Message
// ============================================

function formatModelList(models, maxItems = 3) {
  if (models.length === 0) return '';
  const names = models.slice(0, maxItems).map(m => m.name || m.id);
  const suffix = models.length > maxItems ? ` and ${models.length - maxItems} more` : '';
  return names.join(', ') + suffix;
}

function generateCommitMessage(changes) {
  const providerNames = Object.values(changes.providers).map(p => p.name);
  const providerCount = providerNames.length;

  // First line: conventional commit format
  let message = `feat: update ${providerNames.join(', ')} (${providerCount} provider${providerCount > 1 ? 's' : ''})\n\n`;

  // Details for each provider
  for (const [providerId, change] of Object.entries(changes.providers)) {
    if (change.type === 'added') {
      message += `- ${change.name}: new provider with ${change.modelsAdded} model${change.modelsAdded > 1 ? 's' : ''}\n`;
    } else if (change.type === 'removed') {
      message += `- ${change.name}: provider removed (${change.modelsRemoved} model${change.modelsRemoved > 1 ? 's' : ''})\n`;
    } else {
      const parts = [];
      if (change.modelsAdded > 0) parts.push(`+${change.modelsAdded} model${change.modelsAdded > 1 ? 's' : ''}`);
      if (change.modelsRemoved > 0) parts.push(`-${change.modelsRemoved} model${change.modelsRemoved > 1 ? 's' : ''}`);
      if (change.modelsUpdated > 0) parts.push(`${change.modelsUpdated} update${change.modelsUpdated > 1 ? 's' : ''}`);

      message += `- ${change.name}: ${parts.join(', ')}\n`;

      // Add details for added models
      if (change.added && change.added.length > 0) {
        const addedNames = formatModelList(change.added);
        message += `  - added: ${addedNames}\n`;
      }

      // Add details for removed models
      if (change.removed && change.removed.length > 0) {
        const removedNames = formatModelList(change.removed);
        message += `  - deprecated/removed: ${removedNames}\n`;
      }

      // Add details for price changes
      const priceUpdates = change.updated?.filter(u =>
        u.changes.some(c => c.field === 'cost')
      );
      if (priceUpdates && priceUpdates.length > 0) {
        const priceNames = formatModelList(priceUpdates.map(u => u.model));
        message += `  - price updated: ${priceNames}\n`;
      }
    }
  }

  // Summary line
  const { added, removed, updated, priceChanged } = changes.summary;
  const parts = [];
  if (added > 0) parts.push(`${added} model${added > 1 ? 's' : ''} added`);
  if (removed > 0) parts.push(`${removed} model${removed > 1 ? 's' : ''} removed`);
  if (updated > 0) parts.push(`${updated} model${updated > 1 ? 's' : ''} updated`);
  if (priceChanged > 0) parts.push(`${priceChanged} price change${priceChanged > 1 ? 's' : ''}`);

  message += `\nTotal: ${parts.join(', ')}`;

  return message;
}

// ============================================
// Phase 6: Git Commit and Push
// ============================================

async function gitCommitAndPush(message, branch) {
  log('\n📤 Committing and pushing changes...', 'cyan');

  // Add dist directory
  exec('git add dist/');

  // Create commit
  try {
    exec(`git commit -m "${message.replace(/"/g, '\\"')}"`, { silent: true });
    log('   ✅ Changes committed', 'green');
  } catch (error) {
    throw new Error(`Failed to create commit: ${error.message}`);
  }

  // Push to remote
  try {
    exec(`git push origin ${branch}`);
    log('   ✅ Changes pushed to remote', 'green');
  } catch (error) {
    throw new Error(`Failed to push: ${error.message}. Commit exists locally.`);
  }
}

// ============================================
// Phase 7: Cleanup
// ============================================

async function cleanup() {
  log('\n🧹 Cleaning up...', 'cyan');

  if (existsSync(BACKUP_DIR)) {
    await fs.rm(BACKUP_DIR, { recursive: true });
    log('   ✅ Backup directory cleaned', 'green');
  }
}

async function restoreBackup() {
  log('\n⚠️  Restoring backup due to error...', 'yellow');

  if (!existsSync(BACKUP_DIR)) {
    log('   No backup to restore', 'yellow');
    return;
  }

  const files = await fs.readdir(BACKUP_DIR);
  for (const file of files) {
    const src = join(BACKUP_DIR, file);
    const dest = join(DIST_DIR, file);
    await fs.copyFile(src, dest);
  }

  await fs.rm(BACKUP_DIR, { recursive: true });
  log('   ✅ Backup restored', 'green');
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
  const startTime = Date.now();

  log('\n╔═══════════════════════════════════════════════════╗', 'cyan');
  log('║  PublicProviderConf Auto-Update Script           ║', 'cyan');
  log('╚═══════════════════════════════════════════════════╝', 'cyan');

  let branch;

  try {
    // Phase 1: Check prerequisites
    branch = await checkPrerequisites();

    // Phase 2: Backup
    await backupDist();

    // Phase 3: Build
    await runBuild();

    // Phase 4: Compare
    const changes = await compareProviders();

    // Phase 5: Check if substantial
    if (!hasSubstantialChanges(changes)) {
      log('\nℹ️  No substantial changes detected (only timestamps updated)', 'yellow');
      log('   Skipping commit', 'blue');
      await cleanup();
      log('\n✨ Done! (no changes)', 'green');
      return;
    }

    // Phase 6: Generate commit message and commit
    const commitMessage = generateCommitMessage(changes);
    log('\n📝 Generated commit message:', 'blue');
    log('─'.repeat(50), 'blue');
    log(commitMessage);
    log('─'.repeat(50), 'blue');

    await gitCommitAndPush(commitMessage, branch);

    // Phase 7: Cleanup
    await cleanup();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`\n✨ Done! (${duration}s)`, 'green');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');

    // Try to restore backup on build/fetch failure
    if (error.message.includes('Build failed') || error.message.includes('fetch')) {
      await restoreBackup();
    }

    process.exit(1);
  }
}

// Run main
main();
