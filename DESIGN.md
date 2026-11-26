# 《紫微斗数 · 观星阁》设计系统规范（DESIGN.md）

> 审美方向：**方案 A ·「观星阁 · 深空浑天铜仪」（暗色默认） ×「素笺青铜」（浅色双态）**
> 标杆参考：Igloo Inc. / Unseen Studio / Linear / Stripe Press

---

## 一、核心色彩体系（1 强调色 + 4 东方矿物四化功能色）

### 1. 暗色默认态：`[data-theme="dark"]`（观星阁 · 子夜浑天）
- `--bg-0`: `#070B12`（子夜墨蓝主画布）
- `--bg-1`: `#0D131F`（玄石次画布 / 侧栏）
- `--bg-2`: `#141C2B`（悬浮 / 交互表面）
- `--bg-card`: `rgba(14, 21, 34, 0.86)`
- `--tx-0`: `#EDE9DF`（月白宣纸主标题与主文，对比度 > 14:1）
- `--tx-1`: `#D9D4C8`（常规正文）
- `--tx-2`: `#9CA6B8`（银灰副文，对比度 > 6.5:1）
- `--tx-3`: `#6D788D`（辅助刻度和标注）
- `--ac`: `#C9A45C`（古铜赤金，唯一主强调色）
- `--ac-dim`: `#E0BF7A`（古铜亮金 hover 态）
- **四化东方矿物功能色**（仅用于四化徽章与飞星轨迹）：
  - 化禄 `--lu`: `#4E9A84`（青玉）
  - 化权 `--quan`: `#C87D4B`（赤铜）
  - 化科 `--ke`: `#5C8FB8`（天青）
  - 化忌 `--ji`: `#C4534D`（暗朱砂）

### 2. 浅色双态：`:root` / `[data-theme="light"]`（素笺青铜）
- `--bg-0`: `#F5F1E8`（温润竹纸宣白）
- `--bg-1`: `#EDE7DA`（素笺次层）
- `--bg-2`: `#E4DCCB`（交互悬停底色）
- `--bg-card`: `rgba(252, 249, 242, 0.92)`
- `--tx-0`: `#1A1815`（徽墨主标题与主文）
- `--tx-1`: `#2A2620`（正文）
- `--tx-2`: `#585146`（副文）
- `--tx-3`: `#7A7163`（辅助标注）
- `--ac`: `#9A742B`（深青铜金）
- `--ac-dim`: `#7A591B`
- **四化浅色高对比版**：`--lu: #2A705B`、`--quan: #A85B2A`、`--ke: #2D628C`、`--ji: #A8342E`

---

## 二、字体排印系统

- **展示衬线体 `--font-serif`**：`'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', 'STSong', Georgia, serif`
  - 用于 Hero 主标题、十四主星名、古籍标题与章节正文。
- **界面无衬线体 `--font`**：`'Inter', -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`
  - 用于按钮、表单控件、导航、AI 深度解读。
- **星历等宽体 `--font-mono`**：`'JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', monospace`
  - 配合 `font-variant-numeric: tabular-nums`，用于大限年龄、干支坐标、真太阳时校准、四化徽记。

---

## 三、禁用与可访问性边界

1. 严禁大标题 `background-clip: text` 金属渐变字（`.grad-text`）。
2. 严禁 `inset 3px 0 0` 左侧粗竖条边框、Tailwind 高饱和紫 (`purple-400/500`) / 电光蓝 (`#2563EB`) 混搭与首屏旋转 Emoji 便利贴。
3. 十二宫微文字最低保持 10px（主星 14px，宫名 11px），正文与背景对比度 ≥ 4.5:1。
4. 全站组件共享 `--t-*`、`--bg-*`、`--tx-*`、`--ac*` 单一真实来源 Token。

---

## 四、Three.js 场景规格与性能底线

| 组件 | 路由 | 演出内容 | 工程红线 |
| :--- | :--- | :--- | :--- |
| `HeroArmillary3D` | `/` | 单 DrawCall 1400+ `InstancedMesh` 星辰 + 3D 赤道/黄道铜环浑天仪 + 北斗星轨 + 鼠标视差与滚动推近 | `ssr: false` 懒加载、`DPR <= 1.75`、`IntersectionObserver` 离屏暂停、`prefers-reduced-motion` 静态 SVG 降级、卸载 `dispose()` |
| `CelestialChart3D` | `/chart` | 3D 十二宫黄道星仪、按星曜亮度分级发光与海拔映射、拖拽阻尼旋转、点击宫位触发 3D 三方四正光束与四化飞星抛物弧 | 按需切换懒加载，点击同步驱动 `InsightPanel` |
| `HemingResonance3D` | `/heming` | 双星轨交错微倾 3D 共振环，渲染双方互飞四化光弧，AI 解读中轻度加速流转 | 高度 240px 轻画布，共享工具库与内存回收 |
| `ClassicBook3DCard` | `/library` | Stripe Press 风格典籍封面微 3D 倾斜与 Shader 箔金反光 | 仅作用于书目卡片，正文零 WebGL 干扰 |
