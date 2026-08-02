# 随机睡前放送 🌙 · Sleepy Randomizer

> 一个睡前放松工具：维护一份舒缓视频列表，随机抽取播放。
> A bedtime wind-down tool — maintain a list of relaxing videos and randomly pick one to play.

---

## 技术栈 · Tech Stack

- 单文件 HTML + 原生 JS，无框架无构建
  Single HTML file, vanilla JavaScript — no framework, no build step
- [Tailwind CSS](https://tailwindcss.com) (CDN)
- [Lucide Icons](https://lucide.dev) (CDN)
- Node.js 服务器用于 B站 API 代理，零依赖，仅用内置模块
  Node.js server for Bilibili API proxy — zero dependencies, built-in modules only

## 功能 · Features

| 功能 | 说明 |
|---|---|
| 随机播放 | Fisher-Yates 洗牌队列，播完一轮才重复 |
| Bilibili + YouTube | 自动解析链接，获取标题和封面 |
| 编辑模式 | 多选、拖拽排序、批量删除 |
| 分享导出 | 生成独立 HTML 页面 |
| 响应式 | 桌面端和移动端适配 |
| 收起动效 | 平滑的 `max-height` 过渡动画 |

## 项目结构 · Project Structure

```
index.html          # 整个应用
server.js           # 静态服务 + B站 API 代理
data/
  recommended-videos.js   # 初始视频列表
resources/
  fallback-cover.png      # 封面占位图
```
