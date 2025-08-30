# PublicProviderConf

自动化拉取各个AI模型提供商（PPInfra、OpenRouter、OpenAI、Google等）的模型接口信息，生成标准化的JSON文件，方便chatbot和其他应用直接使用。

## ✨ 特性

- 🤖 **标准化格式**: 统一的JSON输出格式，便于chatbot解析
- 🔄 **自动检测**: 智能识别模型的视觉、函数调用、推理能力
- 🌐 **多Provider支持**: 可扩展支持多个AI模型提供商
- ⚡ **并发获取**: 高效并发获取多个provider的数据
- 🎯 **聚合输出**: 生成单个provider文件和完整聚合文件
- 🚀 **GitHub Actions**: 自动化定时更新模型信息

## 📦 安装

### 前置要求
- Rust 1.70+ 
- Cargo

### 构建
```bash
git clone https://github.com/your-repo/PublicProviderConf.git
cd PublicProviderConf
cargo build --release
```

## 🚀 使用方法

### 基本用法

获取所有provider的模型信息：
```bash
cargo run -- fetch-all
```

指定输出目录：
```bash
cargo run -- fetch-all -o ./output
```

获取特定provider：
```bash
cargo run -- fetch-providers -p ppinfra,openai
```

### CLI选项

```bash
# 获取所有provider
cargo run -- fetch-all [OPTIONS]

# 获取特定provider
cargo run -- fetch-providers -p <PROVIDERS> [OPTIONS]

选项:
  -o, --output <OUTPUT>    输出目录 [默认: dist]
  -c, --config <CONFIG>    配置文件路径 [默认: config/providers.toml]
  -h, --help              显示帮助信息
```

## 📋 输出格式

### 单个Provider JSON
```json
{
  "provider": "ppinfra",
  "providerName": "PPInfra", 
  "lastUpdated": "2025-01-15T10:30:00Z",
  "models": [
    {
      "id": "deepseek/deepseek-v3.1",
      "name": "Deepseek V3.1",
      "contextLength": 163840,
      "maxTokens": 163840,
      "vision": false,
      "functionCall": true,
      "reasoning": true,
      "type": "chat",
      "description": "DeepSeek-V3.1 最新模型..."
    }
  ]
}
```

### 聚合JSON
```json
{
  "version": "1.0.0",
  "generatedAt": "2025-01-15T10:30:00Z",
  "providers": {
    "ppinfra": {
      "providerName": "PPInfra",
      "modelCount": 38,
      "lastUpdated": "2025-01-15T10:30:00Z"
    }
  },
  "totalModels": 38,
  "allModels": [
    // 所有模型的扁平列表，包含providerId
  ]
}
```

## 🔧 配置

### Provider配置（可选）
创建 `config/providers.toml` 文件：
```toml
[ppinfra]
api_url = "https://api.ppinfra.com/openai/v1/models"
rate_limit = 10
timeout = 30

[openrouter]
api_url = "https://openrouter.ai/api/v1/models"
api_key_env = "OPENROUTER_API_KEY"
rate_limit = 5

[openai]
api_url = "https://api.openai.com/v1/models" 
api_key_env = "OPENAI_API_KEY"
rate_limit = 20
```

### 环境变量
如果provider需要API密钥，设置相应环境变量：
```bash
export OPENAI_API_KEY="your-key-here"
export OPENROUTER_API_KEY="your-key-here"
```

## 🤖 GitHub Actions自动化

项目自带GitHub Actions工作流，支持：
- ⏰ 每日UTC 06:00自动运行
- 🖱️ 手动触发
- 📤 自动提交更新到 `provider_configs/`
- 🗜️ 创建打包的release

手动触发：
```bash
# 在GitHub仓库页面的Actions标签页中点击"Run workflow"
```

## 📁 项目结构

```
├── src/
│   ├── models/          # 数据结构定义
│   ├── providers/       # Provider实现
│   ├── fetcher/         # 数据获取逻辑
│   ├── output/          # 输出处理
│   └── config/          # 配置管理
├── dist/                # 生成的JSON文件
├── provider_configs/    # Git跟踪的JSON文件
├── docs/                # 详细文档
└── .claude/            # Claude Code配置
```

## 🔌 添加新Provider

1. 在 `src/providers/` 创建新文件（如 `openai.rs`）
2. 实现 `Provider` trait：
```rust
#[async_trait]
impl Provider for OpenAIProvider {
    async fn fetch_models(&self) -> Result<Vec<ModelInfo>> {
        // 实现API调用和数据转换
    }
    
    fn provider_id(&self) -> &str { "openai" }
    fn provider_name(&self) -> &str { "OpenAI" }
}
```
3. 在 `src/providers/mod.rs` 中添加模块
4. 在 `src/main.rs` 中注册provider

详细开发指南请参考 [架构文档](docs/architecture-overview.md)。

## 📊 当前支持的Provider

- ✅ **PPInfra** - 38个模型，包含推理、函数调用、视觉能力检测
- 🚧 **OpenRouter** - 计划中
- 🚧 **OpenAI** - 计划中  
- 🚧 **Google Gemini** - 计划中

## 🛠️ 开发

### 运行测试
```bash
cargo test
```

### 调试模式
```bash
RUST_LOG=debug cargo run -- fetch-all
```

### 代码格式化
```bash
cargo fmt
cargo clippy
```

## 📄 相关文档

- [架构设计](docs/architecture-overview.md) - 完整的架构说明
- [Claude Code配置](CLAUDE.md) - 开发环境配置
- [Provider实现指南](.claude/provider_implementer.md) - 新provider开发指南
- [数据转换规范](.claude/data_converter.md) - 数据标准化说明
- [格式验证标准](.claude/format_validator.md) - JSON格式验证

## 📈 示例用法

### Chatbot集成示例
```javascript
// 获取所有模型
const response = await fetch('https://your-domain.com/provider_configs/aggregated.json');
const data = await response.json();

// 筛选支持函数调用的模型
const toolModels = data.allModels.filter(model => model.functionCall);

// 按context长度排序
const sortedModels = data.allModels.sort((a, b) => b.contextLength - a.contextLength);

// 查找特定provider的模型
const ppinfraModels = data.allModels.filter(model => model.providerId === 'ppinfra');
```

### 数据分析
生成的JSON文件可用于：
- 📊 模型能力统计分析
- 🔍 模型搜索和筛选
- 💰 价格比较分析
- 📈 模型趋势追踪

## 🤝 贡献

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建feature分支
3. 实现新功能或修复
4. 提交Pull Request

## 📝 License

[MIT License](LICENSE)

## 🙏 致谢

感谢所有AI模型提供商提供开放的API接口，让这个项目成为可能。