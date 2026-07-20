# Glassmorphism Design System

一套面向现代 SaaS Dashboard 的玻璃拟态（Glassmorphism）设计系统，融合半透明材质美学与 Web 交互体验。

---

## 设计哲学

- **轻盈通透**：通过半透明与背景模糊，让界面元素仿佛浮于彩色背景之上。
- **层次纵深**：利用阴影、高光、模糊半径构建前后景关系，而非依赖纯色块。
- **动态氛围**：背景采用缓慢流动的多色渐变与光斑，赋予界面生命感。
- **克制色彩**：以白色/浅灰为基底，用低饱和彩色点缀功能与状态。

---

## 核心技术栈

- **CSS 框架**：Tailwind CSS v4（CSS-first 配置）
- **组件库**：Ant Design v6（主题 token 深度定制）
- **字体**：Inter Variable
- **图标**：Lucide React
- **关键 CSS 特性**：`backdrop-filter`、`rgba()` 透明色、`inset` 高光阴影、CSS 动画

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

在页面根节点放置 4 个固定定位的模糊圆形，增强氛围：

```tsx
<div className="pointer-events-none fixed inset-0 overflow-hidden">
  <div className="absolute -left-40 -top-40 size-96 rounded-full bg-blue-400/20 blur-3xl" />
  <div className="absolute -right-40 top-1/4 size-96 rounded-full bg-violet-400/20 blur-3xl" />
  <div className="absolute -bottom-40 left-1/3 size-96 rounded-full bg-emerald-400/15 blur-3xl" />
  <div className="absolute bottom-1/4 right-1/4 size-80 rounded-full bg-amber-400/15 blur-3xl" />
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

```css
.glass {
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow:
    0 8px 32px rgba(16, 24, 40, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
```

### 玻璃层级

| 层级 | 类名 | 背景透明度 | 模糊半径 | 用途 |
|------|------|-----------|---------|------|
| 轻玻璃 | `.glass-sm` | 60% | 16px | 小徽章、标签 |
| 标准玻璃 | `.glass` | 65% | 20px | 普通卡片、表格 |
| 强玻璃 | `.glass-lg` | 70% | 24px | 弹窗、下拉菜单 |
| 超重玻璃 | `.glass-xl` | 75% | 32px | 全局遮罩层 |

### 彩色玻璃

用于区分功能模块的彩色玻璃变体：

```css
.glass-blue   { background: rgba(239, 246, 255, 0.65); border-color: rgba(191, 219, 254, 0.6); }
.glass-violet { background: rgba(245, 243, 255, 0.65); border-color: rgba(221, 214, 254, 0.6); }
.glass-green  { background: rgba(236, 253, 245, 0.65); border-color: rgba(167, 243, 208, 0.6); }
.glass-amber  { background: rgba(255, 251, 235, 0.65); border-color: rgba(253, 230, 138, 0.6); }
```

### 玻璃 hover 效果

```css
.glass-hover {
  transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease;
}
.glass-hover:hover {
  box-shadow: 0 16px 48px rgba(16, 24, 40, 0.12);
  border-color: rgba(255, 255, 255, 0.8);
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
<aside className="fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/40 bg-white/60 px-3 py-5 backdrop-blur-2xl">
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

  {/* 导航 */}
  <nav className="flex flex-1 flex-col gap-1 pt-4">
    {items.map(item => (
      <NavLink
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all",
          isActive
            ? "bg-white/80 text-blue-600 shadow-[0_4px_16px_rgba(37,99,235,0.15)] ring-1 ring-white/60 backdrop-blur-md"
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
<header className="sticky top-0 z-40 flex items-center justify-end gap-3 border-b border-white/40 bg-white/50 px-6 backdrop-blur-2xl" style={{ height: 56 }}>
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
<div className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_8px_32px_rgba(16,24,40,0.08)] backdrop-blur-xl transition-all hover:shadow-[0_12px_40px_rgba(16,24,40,0.12)] hover:-translate-y-0.5">
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
<div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/50 bg-white/60 shadow-[0_8px_32px_rgba(16,24,40,0.08)] backdrop-blur-xl">
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
  {/* 表格 */}
  <div className="data-table min-h-0 flex-1 overflow-hidden px-4">
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
  background: rgba(248, 250, 252, 0.6) !important;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important;
  color: #64748b !important;
  font-weight: 600 !important;
  font-size: 12px !important;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.data-table .ant-table-tbody > tr > td {
  border-bottom: 1px solid rgba(238, 241, 246, 0.6) !important;
  background: transparent !important;
}
.data-table .ant-table-tbody > tr:hover > td {
  background: rgba(37, 99, 235, 0.05) !important;
}
```

### 弹窗（Ant Design Modal）

```css
.ant-modal-content {
  background: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(24px) saturate(200%);
  border-radius: 12px !important;
  box-shadow: 0 24px 64px rgba(16, 24, 40, 0.16) !important;
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
<div className="rounded-2xl border border-white/50 bg-white/60 p-5 shadow-[0_8px_32px_rgba(16,24,40,0.08)] backdrop-blur-xl">
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
      colorText: "#0f172a",
      colorTextSecondary: "#64748b",
      colorBgLayout: "#f0f4f8",
    },
    components: {
      Table: {
        headerBg: "rgba(248, 250, 252, 0.6)",
        headerColor: "#64748b",
        headerSplitColor: "rgba(226, 232, 240, 0.6)",
        rowHoverBg: "rgba(37, 99, 235, 0.05)",
        rowSelectedBg: "rgba(37, 99, 235, 0.08)",
        borderColor: "rgba(238, 241, 246, 0.6)",
      },
      Modal: {
        borderRadiusLG: 12,
      },
      Button: {
        borderRadius: 8,
        fontWeight: 500,
      },
      Input: {
        borderRadius: 8,
      },
    },
  }}
>
  <App />
</ConfigProvider>
```

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

- [ ] 页面背景使用动态渐变 + 装饰光斑
- [ ] 所有卡片使用 `.glass` 或等效 Tailwind 类
- [ ] 弹窗/下拉使用 `.glass-lg` 或等效
- [ ] 按钮、输入框、表格背景透明，依赖玻璃容器
- [ ] 图标背景使用 `bg-{color}-500/10` + `ring-1 ring-white/50`
- [ ] 徽章使用 `bg-{color}-500/10` + `border-{color}-500/20`
- [ ] hover 效果统一为 `translateY(-1px)` + 阴影加深
- [ ] 文字颜色使用 `text-slate-900/500/400` 层级

---

## 文件结构参考

```
src/
├── index.css                 # 设计 token、玻璃工具类、antd 覆盖
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
