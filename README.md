# 今日发现

手机优先的每日发现记录工具。用户每天记录不少于 200 字的发现，并按「商机发现」和「人性发现」归档。完成记录后，可以将原始素材交给 AI 完善为口播稿、研究文档或行动清单。

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
- Pages Functions：`functions/api/polish.js`

CLI 部署：

```bash
npm run build
npx --yes wrangler pages deploy dist --project-name discovery-journal --branch main
```

可选环境变量：

- `OPENAI_API_KEY`：启用真实 AI 成稿
- `OPENAI_MODEL`：默认 `gpt-4.1-mini`

未配置 `OPENAI_API_KEY` 时，前端会自动使用本地模板生成示例文稿。
