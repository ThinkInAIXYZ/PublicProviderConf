# Auto-Update Script / 自动更新脚本

Automated script for periodically fetching latest AI model configurations and committing changes to Git repository.

定期拉取最新 AI 模型配置数据并自动提交到 Git 仓库的脚本。

---

## Features / 功能特性

**English:**
- **Smart Change Detection**: Only commits when substantial changes detected (new/removed models, price changes, feature updates)
- **Auto Backup & Restore**: Automatic backup before run, auto-restore on failure
- **Force Clean & Sync**: Discards local uncommitted changes and syncs to latest upstream before update
- **Detailed Commit Messages**: Generates conventional commit messages with change details
- **Timestamp Exclusion**: Automatically excludes timestamp-only changes (`all.json` and `dc_sync_version.json`)
- **One-Click Execution**: Single command for build, detect, and commit workflow

**中文：**
- **智能变更检测**: 仅当检测到实质性变更（新增/删除模型、价格变动、功能更新）时才提交
- **自动备份恢复**: 运行前自动备份，失败时自动恢复
- **强制清理并同步**: 更新前丢弃本地未提交改动并同步到上游最新提交
- **详细 Commit Message**: 生成包含变更详情的规范化提交信息
- **排除时间戳变更**: 自动排除仅时间戳变化的场景
- **一键执行**: 单条命令完成构建、检测、提交全流程

---

## Quick Start / 快速开始

### Manual Run / 手动运行

```bash
# Using pnpm script / 使用 pnpm 脚本
pnpm auto-update

# Direct run / 直接运行
node scripts/auto-update.mjs
```

### Schedule with Cron / 设置定时任务

#### Linux/macOS (Cron)

```bash
# Edit crontab / 编辑 crontab
crontab -e

# Daily at 3 AM / 每天凌晨 3 点执行
0 3 * * * cd /path/to/PublicProviderConf && node scripts/auto-update.mjs >> /var/log/provider-update.log 2>&1

# Hourly / 每小时执行
0 * * * * cd /path/to/PublicProviderConf && node scripts/auto-update.mjs >> /var/log/provider-update.log 2>&1
```

#### Windows (Task Scheduler / 任务计划程序)

1. Open Task Scheduler / 打开「任务计划程序」
2. Create Basic Task / 创建基本任务 → Name: "Update Provider Configs"
3. Trigger / 触发器: Daily / 每天（或自定义频率）
4. Action / 操作: Start Program / 启动程序
   - Program / 程序: `node`
   - Arguments / 参数: `scripts/auto-update.mjs`
   - Start in / 起始于: `C:\path\to\PublicProviderConf`

---

## Script Workflow / 脚本流程

```
1. Check git repo and current branch / 检查 Git 仓库与当前分支
2. Force clean working tree (reset + clean) / 强制清理工作目录（reset + clean）
3. Fetch remote and hard reset to upstream latest / 拉取远端并 hard reset 到上游最新
4. Backup current dist/ directory / 备份当前 dist/ 目录
5. Run pnpm install → pnpm build → pnpm start / 执行构建
6. Compare old vs new provider JSON files / 对比新旧文件
7. Detect substantial changes / 检测实质性变更
8. If changes exist → git add + commit + push / 有变更则提交
9. If no changes → cleanup and exit / 无变更则清理退出
10. Cleanup temporary backup / 清理临时备份
```

---

## Change Detection Rules / 变更检测规则

### Substantial Changes (Trigger Commit) / 实质性变更（会触发提交）

| Change Type / 变更类型 | Description / 说明 |
|------------------------|-------------------|
| New Model / 新增模型 | New model ID added / 新增 model ID |
| Removed Model / 删除模型 | Model ID removed / 移除 model ID |
| Status Change / 状态变更 | active ↔ deprecated |
| Price Change / 价格变更 | cost.input / cost.output changed |
| Context Length / 上下文长度 | limit.context changed |
| Feature Change / 功能变更 | tool_call, attachment, reasoning changed |

### Ignored Changes (No Commit) / 忽略的变更（不会触发提交）

| Field / 字段 | Description / 说明 |
|--------------|-------------------|
| `updated_at` | Global timestamp / 全局更新时间戳 |
| `last_updated` | Model timestamp / 模型更新时间戳 |
| `all.json` | Aggregated file (always changes) / 聚合文件 |
| `dc_sync_version.json` | Sync version file / 同步版本文件 |

---

## Commit Message Format / 提交信息格式

```
feat: update groq, openai, anthropic (3 providers)

- groq: +3/-1 models
  - added: Llama 4 Scout, Llama 4 Maverick, GPT OSS 20B
  - deprecated: Qwen QwQ 32B
- openai: +2 models, 1 price update
  - added: GPT-4.1 Mini, GPT-4.1 Nano
  - price updated: GPT-4o
- anthropic: +1 model
  - added: Claude 3.5 Sonnet

Total: 5 models added, 1 model deprecated, 1 price change
```

---

## Error Handling / 错误处理

| Scenario / 场景 | Behavior / 行为 |
|-----------------|-----------------|
| pnpm install failed / 安装失败 | Exit 1, keep original dist |
| pnpm build failed / 构建失败 | Exit 1, keep original dist |
| fetch-all failed / 获取失败 | Exit 1, **auto-restore backup** |
| No substantial changes / 无实质变更 | Exit 0, normal exit |
| git push failed / 推送失败 | Exit 1, commit exists locally |
| Dirty working tree / 工作目录不干净 | Auto reset + clean, then continue |
| Detached HEAD / 非分支状态 | Exit 1, checkout a branch first |

---

## Debugging / 调试与排查

### View Detailed Logs / 查看详细日志

```bash
# Run and save full output / 运行并保存完整输出
node scripts/auto-update.mjs 2>&1 | tee update.log
```

### Manual Test Change Detection / 手动测试变更检测

```bash
# 1. Backup current dist / 备份当前 dist
cp -r dist dist-backup

# 2. Modify a provider file for testing / 修改某个 provider 文件测试
# ...

# 3. Run script / 运行脚本
node scripts/auto-update.mjs

# 4. Restore test data / 恢复测试数据
rm -rf dist
mv dist-backup dist
```

### FAQ / 常见问题

**Q: What if there are uncommitted local changes? / 有未提交本地改动怎么办？**

**A:** The script will discard them automatically before update.
脚本会在更新前自动丢弃这些改动（`git reset --hard` + `git clean -fd`）。

**Q: Push failed but commit created / Push 失败但 commit 已创建**

**A:** Push manually / 手动推送：
```bash
git push origin $(git branch --show-current)
```

**Q: How to skip auto-update for specific provider? / 如何跳过某个 provider？**

**A:** Not supported yet, please open an issue / 当前版本不支持，请在 Issue 中提出。

---

## Environment Variables / 环境变量

The script reads API Keys from `.env` or environment variables (e.g., `GROQ_API_KEY`), consistent with normal build process.

脚本会自动读取 `.env` 或环境变量中的 API Keys（如 `GROQ_API_KEY`），与正常构建流程一致。

---

## File Structure / 文件结构

```
scripts/
└── auto-update.mjs          # Main script / 主脚本
docs/
└── auto-update.md           # This documentation / 本文档
dist/                        # Output directory / 输出目录
.auto-update-backup/         # Temporary backup (auto-created, gitignored) / 临时备份
```

---

## Security Notes / 安全注意事项

1. **Don't expose API Keys in public / 不要在公共环境暴露 API Keys**: Ensure `.env` is in `.gitignore`
2. **This script is destructive to local changes / 脚本会清理本地改动**: It force-runs `git reset --hard` and `git clean -fd`
3. **Check cron logs regularly / 定期检查定时任务日志**: Ensure automation runs properly
4. **Backup important configs / 备份重要配置**: Manual backup recommended before critical changes

---

## Related Commands / 相关命令

- `pnpm build` - Build project / 构建项目
- `pnpm start` - Fetch data / 运行数据获取
- `pnpm auto-update` - Full automation / 完整自动更新流程

---

## Changelog / 更新日志

- **2025-02**: Initial release / 初始版本发布
- **2026-02**: Force-clean and upstream sync behavior added / 增加强制清理与上游同步行为
