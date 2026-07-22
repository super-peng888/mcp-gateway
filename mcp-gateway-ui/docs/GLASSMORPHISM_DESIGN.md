# Glassmorphism Design System

一套面向现代 SaaS Dashboard 的玻璃拟态（Glassmorphism）设计系统，融合半透明材质美学与 Web 交互体验。

---

## 设计哲学

- **轻盈通透**：通过半透明与背景模糊，让界面元素仿佛浮于彩色背景之上。
- **层次纵深**：利用阴影、高光、模糊半径构建前后景关系，而非依赖纯色块。
- **动态氛围**：背景采用缓慢流动的多色渐变与漂移光斑，赋予界面生命感。
- **克制色彩**：以白色/浅灰为基底，用低饱和彩色点缀功能与状态。

---

## 核心技术栈

- **CSS 框架**：Tailwind CSS v4（CSS-first 配置）
- **组件库**：Ant Design v6（主题 token 深度定制）
- **字体**：Inter Variable
- **图标**：Lucide React
- **关键 CSS 特性**：`backdrop-filter`、`rgba()` 透明色、`inset` 定向受光描边、SVG 噪点纹理、CSS 动画

---

## 色彩系统

### 背景

```css
/* 页面级动态渐变背景 */
body {
  background: linear-gradient(
    135deg,
    #e0f2fe 0%,    /* 浅蓝 */
    #f5f3ff 20%,   /* 浅紫 */
    #ecfdf5 40%,   /* 浅绿 */
    #fdf2f8 60%,   /* 浅粉 */
    #e0f2fe 80%,   /* 浅蓝 */
    #f0f9ff 100%   /* 极浅蓝 */
  );
  background-size: 400% 400%;
  animation: gradient-shift 20s ease infinite;
}

@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### 装饰光斑

在页面根节点放置 4 个固定定位的模糊圆形，缓慢漂移增强氛围（动画类见「动画规范」）：

```tsx
<div className="pointer-events-none fixed inset-0 overflow-hidden">
  <div className="animate-orb-a absolute -left-40 -top-40 size-[520px] rounded-full bg-blue-400/30 blur-[100px]" />
  <div className="animate-orb-b absolute -right-40 top-1/4 size-[480px] rounded-full bg-violet-400/25 blur-[100px]" />
  <div className="animate-orb-c absolute -bottom-40 left-1/3 size-[460px] rounded-full bg-cyan-300/20 blur-[100px]" />
  <div className="animate-orb-d absolute bottom-1/4 right-1/4 size-96 rounded-full bg-rose-300/15 blur-[100px]" />
</div>
```

### 功能色

| 用途 | 色值 | 说明 |
|------|------|------|
| Primary | `#2563eb` | 皇家蓝，主要按钮、高亮 |
| Success | `#059669` | 翡翠绿，成功状态 |
| Warning | `#b45309` | 琥珀棕，警告状态 |
| Error | `#dc2626` | 红色，错误状态 |
| Violet | `#7c3aed` | 紫罗兰，AI/工具相关 |
| Amber | `#d97706` | 橙黄，提示/快捷操作 |

### 文字色

| 用途 | 色值 |
|------|------|
| 主文字 | `#0f172a` (slate-900) |
| 次要文字 | `#64748b` (slate-500) |
| 弱化文字 | `#94a3b8` (slate-400) |

---

## 玻璃材质规范

### 基础玻璃卡片

白色低透明对角渐变 + 大模糊，让背景光晕透出来；表面叠 3% 灰度噪点（`--glass-noise`）掩盖大模糊渐变的色带。描边不用 `border`，改用贴合圆角的 inset 定向受光模型：顶部一道细受光、两侧微光收边、底部一道折射暗线让玻璃“落地”；轮廓感来自贴边阴影 + 收紧的扩散阴影（收缩量 ≥ 模糊半径一半，水平零溢出，圆角外无阴影，只向正下方投射）与玻璃和背景的明度差。

```css
.glass {
  background-image: var(--glass-noise),
    linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.45) 100%);
  backdrop-filter: blur(36px) saturate(200%);
  -webkit-backdrop-filter: blur(36px) saturate(200%);
  box-shadow:
    var(--shadow-glass),      /* 贴边层勾轮廓 + 扩散层只向正下方投射 */
    var(--glass-highlight),   /* 顶部一道细受光 */
    var(--glass-edge);        /* 两侧微光 + 底部折射暗线 */
}
```

### 玻璃层级

| 层级 | 类名 | 白色渐变 | 模糊半径 | 用途 |
|------|------|-----------|---------|------|
| 轻玻璃 | `.glass-sm` | 55% → 40% | 24px | 小徽章、标签 |
| 标准玻璃 | `.glass` | 60% → 45% | 36px | 普通卡片、表格 |
| 强玻璃 | `.glass-lg` | 68% → 52% | 40px | 弹窗、下拉菜单 |
| 超重玻璃 | `.glass-xl` | 74% → 58% | 48px | 全局遮罩层 |
| 栏位玻璃 | `.glass-bar` | 55% 纯白 | 28px | 侧边栏、顶栏、面包屑（栏位自身描边方向各异，边框在 JSX 中单独声明） |

> 所有层级均无 `border`，边缘由 `--glass-highlight` + `--glass-edge` 的 inset 定向受光呈现；表面统一叠 `--glass-noise` 噪点；hover 只加深投影并上浮 1px。

### 彩色玻璃

用于区分功能模块的彩色玻璃变体，结构与 `.glass` 相同，仅渐变色不同：

```css
.glass-blue {
  background-image: var(--glass-noise),
    linear-gradient(135deg, rgba(239, 246, 255, 0.65) 0%, rgba(239, 246, 255, 0.48) 100%);
  backdrop-filter: blur(36px) saturate(200%);
  -webkit-backdrop-filter: blur(36px) saturate(200%);
  box-shadow: var(--shadow-glass), var(--glass-highlight), var(--glass-edge);
}
/* .glass-violet → rgba(245, 243, 255, …)
   .glass-green  → rgba(236, 253, 245, …)
   .glass-amber  → rgba(255, 251, 235, …) */
```

### 玻璃 hover 效果

```css
.glass-hover {
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}
.glass-hover:hover {
  box-shadow: var(--shadow-glass-lg), var(--glass-highlight-strong), var(--glass-edge);
  transform: translateY(-1px);
}
```

---

## 组件规范

### 页面容器

```tsx
<div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-5 overflow-hidden px-6 py-5">
  {children}
</div>
```

### 页头

```tsx
<div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
  <div className="flex flex-col gap-1">
    <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
    {description && <p className="text-sm text-slate-500">{description}</p>}
  </div>
  {extra && <div className="flex items-center gap-2">{extra}</div>}
</div>
```

### 侧边栏

```tsx
<aside className="glass-bar fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/40 px-3 py-5">
  {/* 品牌 */}
  <div className="flex items-center gap-3 px-2 pb-5">
    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_8px_24px_rgba(37,99,235,0.35)] ring-1 ring-white/30">
      <Globe className="size-5" />
    </div>
    <div className="flex flex-col">
      <span className="text-[15px] font-bold text-slate-900">MCP 网关</span>
      <span className="text-[10px] font-semibold tracking-[0.08em] text-slate-500">REST → MCP GATEWAY</span>
    </div>
  </div>

  {/* 导航：激活态为蓝色玻璃 tint + 左侧 3px 指示条 */}
  <nav className="flex flex-1 flex-col gap-1 pt-4">
    {items.map(item => (
      <NavLink
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all duration-200",
          isActive
            ? "bg-blue-500/10 text-blue-600 shadow-[inset_3px_0_0_#2563eb,0_4px_16px_rgba(37,99,235,0.12)] ring-1 ring-blue-500/20"
            : "text-slate-500 hover:bg-white/50 hover:text-slate-900"
        )}
      >
        {item.icon}{item.label}
      </NavLink>
    ))}
  </nav>
</aside>
```

### 顶栏

```tsx
<header className="glass-bar sticky top-0 z-40 flex items-center justify-end gap-3 border-b border-white/40 px-6" style={{ height: 56 }}>
  <button className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-white/60 hover:text-slate-900 hover:shadow-sm">
    <Maximize className="size-4" />
  </button>
  <div className="mx-1 h-6 w-px bg-white/50" />
  <div className="flex items-center gap-2.5 rounded-full bg-white/50 py-1 pl-1 pr-3 backdrop-blur-md ring-1 ring-white/50">
    <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md">
      <User className="size-3.5" />
    </div>
    <div className="flex flex-col">
      <span className="text-[13px] font-semibold text-slate-900">管理员</span>
      <span className="text-[11px] text-slate-500">admin@mcp.dev</span>
    </div>
  </div>
</header>
```

### 统计卡片

```tsx
<div className="glass glass-hover flex items-center justify-between rounded-2xl p-5">
  <div>
    <p className="text-sm font-medium text-slate-500">接口分组</p>
    <p className="mt-1 text-2xl font-bold text-slate-900">12</p>
  </div>
  <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 ring-1 ring-white/50">
    <Library className="size-5" />
  </div>
</div>
```

### 数据表格

```tsx
<div className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
  {/* 搜索区 */}
  <div className="shrink-0 border-b border-white/40 px-4 py-3">
    <SearchForm ... />
  </div>
  {/* 工具栏 */}
  <div className="flex flex-col gap-2 border-b border-white/40 px-4 py-3">
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-slate-900">接口列表</h3>
      <Button type="primary">新增</Button>
    </div>
  </div>
  {/* 表格：与容器同宽，首尾列自身 padding 保持 16px 内缩 */}
  <div className="data-table min-h-0 flex-1 overflow-hidden">
    <Table ... />
  </div>
</div>
```

### 表格样式覆盖（Ant Design）

```css
.data-table .ant-table {
  background: transparent !important;
}
.data-table .ant-table-thead > tr > th {
  background: transparent !important;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important;
  color: #475569 !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 12px 16px !important;
}
.data-table .ant-table-tbody > tr > td {
  border-bottom: 1px solid rgba(238, 241, 246, 0.6) !important;
  background: transparent !important;
}
.data-table .ant-table-tbody > tr:hover > td {
  background: rgba(37, 99, 235, 0.05) !important;
}

/* 分页器：容器去 padding 后保持 16px 内缩 */
.data-table .ant-table-pagination {
  padding-inline: 16px;
}

/* 隐藏表格滚动条（保留滚动能力） */
.data-table .ant-table-body,
.data-table .ant-table-content {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.data-table .ant-table-body::-webkit-scrollbar,
.data-table .ant-table-content::-webkit-scrollbar {
  display: none;
}
```

### 弹窗（Ant Design Modal）

```css
/* 遮罩：浅色磨砂替代默认暗灰，保持玻璃氛围连续 */
.ant-modal-mask {
  background: rgba(226, 232, 240, 0.55) !important;
  backdrop-filter: blur(8px) saturate(150%);
}

.ant-modal-content {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(24px) saturate(200%);
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-glass-xl), var(--glass-highlight-strong) !important;
  border: 1px solid rgba(255, 255, 255, 0.6);
}
```

### 空状态

```tsx
<div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
  <span className="flex size-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 shadow-[0_8px_24px_rgba(37,99,235,0.15)] ring-1 ring-white/50 backdrop-blur-sm">
    <Library className="size-6" />
  </span>
  <div className="flex flex-col gap-1.5">
    <p className="text-base font-semibold text-slate-900">暂无数据</p>
    <p className="text-sm text-slate-500">导入文档后数据将展示在这里</p>
  </div>
  <Button type="primary">立即导入</Button>
</div>
```

### 徽章/标签

```tsx
// 彩色玻璃徽章
<span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-600 ring-1 ring-white/50 backdrop-blur-sm">
  GET
</span>
```

### 快捷操作列表

```tsx
<div className="glass rounded-2xl p-5">
  <h3 className="text-base font-semibold text-slate-900">快捷操作</h3>
  <div className="mt-3 flex flex-col gap-1">
    <NavLink className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-all hover:bg-white/50">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 ring-1 ring-white/50">
        <Upload className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-900">导入接口文档</span>
        <span className="block truncate text-xs text-slate-500">OpenAPI / Swagger JSON</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
    </NavLink>
  </div>
</div>
```

---

## Ant Design 主题配置

```tsx
import { ConfigProvider } from "antd"

<ConfigProvider
  theme={{
    token: {
      colorPrimary: "#2563eb",
      borderRadius: 8,
      fontSize: 14,
      colorBgContainer: "#ffffff",
      colorBorder: "#d5dbe7",
      colorBorderSecondary: "#e3e7ef",
      colorText: "#111827",
      colorTextSecondary: "#6b7280",
      colorBgLayout: "#f5f7fa",
      boxShadow:
        "0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)",
      boxShadowSecondary:
        "0 12px 32px rgba(16, 24, 40, 0.12), 0 4px 8px rgba(16, 24, 40, 0.04)",
    },
    components: {
      Table: {
        headerBg: "#f8fafc",
        headerColor: "#6b7280",
        headerSplitColor: "#e3e7ef",
        rowHoverBg: "rgba(37, 99, 235, 0.04)",
        rowSelectedBg: "rgba(37, 99, 235, 0.08)",
        borderColor: "#eef1f6",
      },
      Modal: {
        borderRadiusLG: 12,
        boxShadow:
          "0 12px 32px rgba(16, 24, 40, 0.12), 0 4px 8px rgba(16, 24, 40, 0.04)",
      },
      Select: {
        optionSelectedBg: "#dbeafe",
        optionActiveBg: "rgba(37, 99, 235, 0.08)",
      },
      Button: {
        borderRadius: 8,
        fontWeight: 500,
      },
      Input: {
        borderRadius: 8,
      },
      Tag: {
        borderRadiusSM: 999,
      },
    },
  }}
>
  <App />
</ConfigProvider>
```

> 表格、弹窗等组件的透明化与玻璃化由 `index.css` 中的覆盖样式完成（优先级高于 token），token 只负责基础色与圆角。

---

## 动画规范

### 背景流动

```css
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### 光斑漂移

四个光斑各配一组 44~62s 的缓慢位移动画，让玻璃透出的光晕随时间变化：

```css
@keyframes orb-drift-a {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(64px, 40px, 0) scale(1.08); }
}
/* orb-drift-b / c / d 方向与时长各异 */

.animate-orb-a { animation: orb-drift-a 44s ease-in-out infinite; }
```

### Reduced motion

`prefers-reduced-motion: reduce` 时关闭背景渐变、光斑漂移与卡片浮动反馈：

```css
@media (prefers-reduced-motion: reduce) {
  body { animation: none; }
  .animate-orb-a, .animate-orb-b, .animate-orb-c, .animate-orb-d { animation: none; }
  .glass-hover { transition: none; }
  .glass-hover:hover { transform: none; }
}
```

### 卡片 hover

```css
transition: box-shadow 0.25s ease, transform 0.25s ease;
hover:translateY(-1px);
```

### 导航激活

```css
transition: all 0.2s ease;
```

### 状态呼吸灯

```tsx
<span className="relative flex size-2">
  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
</span>
```

---

## 使用检查清单

- [ ] 页面背景使用动态渐变 + 漂移光斑
- [ ] 卡片使用 `.glass` 等工具类（描边、噪点、投影已内置，勿再叠加 `border` / `backdrop-blur`）
- [ ] 侧边栏 / 顶栏 / 面包屑统一使用 `.glass-bar`
- [ ] 弹窗 / 下拉使用 `.glass-lg` 或等效
- [ ] 玻璃容器内的次级元素只用半透明白 + `ring`，不嵌套 `backdrop-blur`
- [ ] 按钮、输入框、表格背景透明，依赖玻璃容器
- [ ] 图标背景使用 `bg-{color}-500/10` + `ring-1 ring-white/50`
- [ ] 徽章使用 `bg-{color}-500/10` + `border-{color}-500/20`
- [ ] hover 效果统一为 `translateY(-1px)` + 阴影加深
- [ ] 文字颜色使用 `text-slate-900/500/400` 层级

---

## 文件结构参考

```
src/
├── index.css                 # 设计 token、玻璃工具类、antd 覆盖、动画
├── main.tsx                  # ConfigProvider 主题配置
├── App.tsx                   # 页面背景光斑、布局
├── components/
│   ├── PageContainer.tsx     # 页面容器
│   ├── PageHeader.tsx        # 页头
│   ├── Sidebar.tsx           # 玻璃侧边栏
│   ├── TopBar.tsx            # 玻璃顶栏
│   ├── Breadcrumb.tsx        # 面包屑
│   ├── DataTable.tsx         # 玻璃数据表格
│   ├── SearchForm.tsx        # 搜索表单
│   ├── EmptyState.tsx        # 空状态
│   └── StatChip.tsx          # 统计徽章
└── views/                    # 各业务页面
```
