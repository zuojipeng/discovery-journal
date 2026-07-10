# 今日发现

每日发现记录工具。用户每天记录不少于 200 字的发现，并按「商机发现」和「人性发现」归档。完成记录后，先让 AI 基于原始发现做研究，再继续对话讨论，最后生成完整口播稿。

## 本地开发

```bash
npm install
npm run dev -- --port 3100
```

## 构建

```bash
npm run build
```

## 线上部署

项目可部署到 Cloudflare Pages：

- 构建命令：`npm run build`
- 输出目录：`dist`
- Pages Functions：`functions/api/*.js`

CLI 部署：

```bash
npm run build
npx --yes wrangler pages deploy dist --project-name discovery-journal --branch main
```

## AI 配置

应用通过环境变量切换模型供应商：

- `AI_PROVIDER`：`openai`、`qwen` 或 `deepseek`，默认 `openai`
- `AI_MODEL`：模型名。OpenAI 默认 `gpt-4.1-mini`，Qwen 默认 `qwen-plus`，DeepSeek 默认 `deepseek-chat`
- `AI_BASE_URL`：可选，覆盖默认兼容接口地址

OpenAI：

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

阿里百炼 / Qwen：

- `AI_PROVIDER=qwen`
- `DASHSCOPE_API_KEY` 或 `QWEN_API_KEY`
- `QWEN_MODEL` 或 `AI_MODEL`

DeepSeek：

- `AI_PROVIDER=deepseek`
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_MODEL` 或 `AI_MODEL`

## 搜索配置

国产模型通常只负责推理，不一定自带可控联网搜索。为了让“研究报告”真正带来源，需要额外配置搜索 API：

- `SEARCH_PROVIDER`：`tavily` 或 `brave`
- `TAVILY_API_KEY`
- `BRAVE_SEARCH_API_KEY`

未配置模型 Key 时，前端会使用本地兜底文本。未配置搜索 Key 时，研究结果会明确标记为“未确认联网”，不会伪装成实时调研。
