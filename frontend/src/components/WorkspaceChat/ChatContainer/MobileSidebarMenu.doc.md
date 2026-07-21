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

## Docs

Uses `ChatSidebar` context. Desktop is unchanged (`RightSidebarIconBar`).
