await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' });
await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

const page = figma.currentPage;
page.name = 'Calm Product Direction';

for (const node of [...page.children]) node.remove();

const C = {
  canvas: { r: 0.94, g: 0.955, b: 0.965 },
  paper: { r: 0.992, g: 0.988, b: 0.976 },
  panel: { r: 1, g: 1, b: 1 },
  ink: { r: 0.075, g: 0.09, b: 0.125 },
  text: { r: 0.20, g: 0.235, b: 0.29 },
  muted: { r: 0.45, g: 0.50, b: 0.58 },
  line: { r: 0.84, g: 0.86, b: 0.88 },
  warm: { r: 0.965, g: 0.91, b: 0.79 },
  warmText: { r: 0.50, g: 0.33, b: 0.13 },
  sage: { r: 0.84, g: 0.92, b: 0.88 },
  sageText: { r: 0.10, g: 0.38, b: 0.30 },
  action: { r: 0.12, g: 0.31, b: 0.28 },
  actionSoft: { r: 0.86, g: 0.93, b: 0.91 },
};

const solid = (color) => [{ type: 'SOLID', color }];

function rect(parent, name, x, y, w, h, fill, radius = 8, stroke = null) {
  const node = figma.createRectangle();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.cornerRadius = radius;
  node.fills = solid(fill);
  if (stroke) {
    node.strokes = solid(stroke);
    node.strokeWeight = 1;
  } else {
    node.strokes = [];
  }
  parent.appendChild(node);
  return node;
}

function text(parent, name, value, x, y, size, style = 'Regular', color = C.text, width = null, line = 132) {
  const node = figma.createText();
  node.name = name;
  node.fontName = { family: 'Inter', style };
  node.fontSize = size;
  node.lineHeight = { unit: 'PERCENT', value: line };
  node.fills = solid(color);
  node.characters = value;
  node.x = x;
  node.y = y;
  if (width) node.resize(width, node.height);
  parent.appendChild(node);
  return node;
}

function frame(name, x, y, w, h, fill = C.canvas) {
  const node = figma.createFrame();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.fills = solid(fill);
  node.clipsContent = false;
  page.appendChild(node);
  return node;
}

function pill(parent, label, x, y, w, fill, color) {
  rect(parent, `Pill / ${label}`, x, y, w, 34, fill, 17);
  text(parent, `Pill Label / ${label}`, label, x + 14, y + 8, 13, 'Semi Bold', color);
}

function button(parent, label, x, y, w, h, fill, color, stroke = null) {
  rect(parent, `Button / ${label}`, x, y, w, h, fill, 8, stroke);
  text(parent, `Button Label / ${label}`, label, x + 18, y + Math.round((h - 18) / 2), 14, 'Semi Bold', color, w - 36);
}

function progress(parent, x, y, w) {
  rect(parent, 'Progress Track', x, y, w, 8, { r: 0.88, g: 0.90, b: 0.92 }, 4);
  rect(parent, 'Progress Value', x, y, w, 8, C.action, 4);
}

const desktop = frame('Desktop / Writing Workspace - calm', 80, 80, 1440, 940, C.canvas);
rect(desktop, 'Workspace Surface', 42, 36, 1356, 858, C.paper, 18, C.line);
text(desktop, 'Eyebrow', 'DAILY DISCOVERY', 78, 72, 12, 'Bold', C.muted);
text(desktop, 'Title', '今日发现', 78, 94, 40, 'Bold', C.ink);
text(desktop, 'Subtitle', '把今天看到的真实信号，沉淀成判断材料，再选择是否交给 AI 整理。', 78, 150, 16, 'Medium', C.muted, 600);
pill(desktop, '今日已完成', 1238, 78, 124, C.actionSoft, C.sageText);

rect(desktop, 'Daily State', 78, 220, 278, 158, C.panel, 10, C.line);
text(desktop, 'Daily Date', '7月2日 周四', 100, 244, 13, 'Semi Bold', C.muted);
text(desktop, 'Daily State Title', '素材已达标', 100, 272, 27, 'Bold', C.ink);
text(desktop, 'Daily State Hint', '今天可以进入成稿阶段。', 100, 312, 14, 'Medium', C.muted, 210);
progress(desktop, 100, 346, 210);

rect(desktop, 'Reminder', 78, 394, 278, 118, C.panel, 10, C.line);
text(desktop, 'Reminder Title', '每日提醒', 100, 420, 18, 'Semi Bold', C.ink);
text(desktop, 'Reminder Time', '21:30', 100, 456, 25, 'Bold', C.ink);
button(desktop, '开启通知', 220, 450, 104, 40, C.panel, C.text, C.line);

rect(desktop, 'Stats', 78, 528, 278, 88, C.panel, 10, C.line);
text(desktop, 'Stats A', '累计记录\\n1', 108, 552, 18, 'Semi Bold', C.ink, 88, 150);
text(desktop, 'Stats B', '累计字数\\n208', 218, 552, 18, 'Semi Bold', C.ink, 88, 150);
button(desktop, '商机发现', 78, 640, 278, 52, C.warm, C.warmText);
button(desktop, '人性发现', 78, 708, 278, 52, C.sage, C.sageText);

rect(desktop, 'Editor Surface', 384, 220, 610, 650, C.panel, 10, C.line);
pill(desktop, '商机', 420, 252, 70, C.warm, C.warmText);
text(desktop, 'Entry Date', '7月2日 周四', 876, 260, 13, 'Semi Bold', C.muted);
text(desktop, 'Title Label', '标题', 420, 306, 12, 'Semi Bold', C.muted);
rect(desktop, 'Title Field', 420, 331, 538, 52, C.panel, 8, C.line);
text(desktop, 'Title Value', '线下门店的私域复购机会', 436, 347, 18, 'Semi Bold', C.ink);
text(desktop, 'Content Label', '原始发现', 420, 410, 12, 'Semi Bold', C.muted);
rect(desktop, 'Content Field', 420, 435, 538, 230, C.panel, 8, C.line);
text(desktop, 'Content Value', '今天观察到一家社区咖啡店把新品试喝和会员群结合起来，用户在店内扫码后会收到第二天的限时复购券。这个动作不复杂，但把到店体验、微信群运营和复购激励连在了一起。真正的商机可能不在咖啡本身，而在帮助小店主把一次性客流转成可持续触达的关系资产。', 436, 454, 17, 'Regular', C.ink, 506, 158);
progress(desktop, 420, 690, 430);
text(desktop, 'Word Count', '208 / 200', 868, 680, 22, 'Bold', C.ink);
text(desktop, 'Output Mode', '生成方式', 420, 734, 17, 'Semi Bold', C.ink);
button(desktop, '口播稿', 420, 770, 150, 44, C.ink, { r: 1, g: 1, b: 1 });
button(desktop, '研究文档', 586, 770, 150, 44, C.panel, C.text, C.line);
button(desktop, '行动清单', 752, 770, 150, 44, C.panel, C.text, C.line);
button(desktop, '整理成稿', 420, 830, 538, 52, C.action, { r: 1, g: 1, b: 1 });

rect(desktop, 'Generated Preview', 1024, 220, 338, 310, C.panel, 10, C.line);
text(desktop, 'Preview Title', '成稿预览', 1052, 248, 18, 'Semi Bold', C.ink);
text(desktop, 'Preview Body', 'AI 不抢主流程，只在素材达标后提供整理。这里展示口播稿、研究文档或行动清单的预览。', 1052, 292, 16, 'Regular', C.muted, 276, 155);
rect(desktop, 'Library', 1024, 554, 338, 164, C.panel, 10, C.line);
text(desktop, 'Library Title', '发现库', 1052, 584, 20, 'Bold', C.ink);
rect(desktop, 'Library Item Active', 1052, 626, 282, 52, { r: 0.945, g: 0.955, b: 0.985 }, 8, { r: 0.70, g: 0.75, b: 0.92 });
text(desktop, 'Library Item Title', '线下门店的私域复购机会', 1068, 642, 15, 'Semi Bold', C.ink, 210);
text(desktop, 'Library Item Count', '208字', 1290, 642, 12, 'Semi Bold', C.muted);

const mobile = frame('Mobile / Same functions - single column', 1580, 80, 390, 1180, C.paper);
text(mobile, 'Mobile Title', '今日发现', 24, 52, 36, 'Bold', C.ink);
text(mobile, 'Mobile Subtitle', '记录真实发现，再选择是否整理成稿。', 24, 108, 15, 'Medium', C.muted, 260);
pill(mobile, '今日已完成', 258, 34, 108, C.actionSoft, C.sageText);
rect(mobile, 'Mobile Mission', 24, 166, 342, 128, C.panel, 10, C.line);
text(mobile, 'Mobile State', '素材已达标', 46, 218, 26, 'Bold', C.ink);
progress(mobile, 46, 268, 298);
rect(mobile, 'Mobile Editor', 24, 488, 342, 468, C.panel, 10, C.line);
text(mobile, 'Mobile Editor Title', '线下门店的私域复购机会', 46, 548, 20, 'Bold', C.ink, 298);
text(mobile, 'Mobile Editor Body', '今天观察到一家社区咖啡店把新品试喝和会员群结合起来，用户在店内扫码后会收到第二天的限时复购券。这个动作不复杂，但把到店体验、微信群运营和复购激励连在了一起。', 46, 620, 17, 'Regular', C.ink, 298, 158);
progress(mobile, 46, 858, 230);
text(mobile, 'Mobile Count', '208/200', 286, 848, 19, 'Bold', C.ink);
button(mobile, '整理成稿', 46, 948, 298, 52, C.action, { r: 1, g: 1, b: 1 });

return {
  fileUrl: 'https://www.figma.com/design/ENvaDCLPgyB9wsIuItujNq',
  createdNodeIds: [desktop.id, mobile.id],
};
