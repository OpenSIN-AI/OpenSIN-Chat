# MobileSidebarMenu

## Purpose

SOTA mobile/tablet access to right-rail tools when `RightSidebarIconBar` is
hidden (`md` and below).

## Pattern

| State | UI |
|---|---|
| Panel closed | Floating action button (bottom-right, safe-area aware) |
| FAB open | Bottom sheet grid of tools (backdrop + Escape / outside close) |
| Panel open | Horizontal tool dock at bottom + close — switch tools without reopening the sheet |

Mounted once from `Sidebars` portal (Home + Workspace), so tools stay reachable
even when `ChatHeader` is not on screen.

## Fullscreen panel shell (critical)

On mobile the `Sidebars` host is `inset-0` + `w-full` + `h-[100dvh]`, and
`ActiveSidebarPanel` / `ChatSidebar` use `w-full flex-1` — **never** animate
via `width: 0` on mobile. A percentage width on an auto-sized flex parent
collapses every right-rail panel to a blank canvas.

## Docs

Uses `ChatSidebar` context. Desktop is unchanged (`RightSidebarIconBar`).
