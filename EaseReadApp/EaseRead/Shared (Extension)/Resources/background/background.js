/* global importScripts, browser, chrome, EaseReadConfig */
"use strict";

try {
  importScripts("../shared/settings.js");
} catch (_) {
  // Fallback if loaded outside standard service worker context
}

const api =
  typeof browser !== "undefined" && browser
    ? browser
    : typeof chrome !== "undefined"
      ? chrome
      : null;

function extractHost(urlString) {
  try {
    const u = new URL(urlString);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return EaseReadConfig.normalizeHost(u.hostname);
    }
    return "";
  } catch (_) {
    return "";
  }
}

async function updateBadgeForTab(tabId, url) {
  if (!api || !api.action || tabId == null) return;
  try {
    const settings = await EaseReadConfig.loadSettings();
    const host = extractHost(url);
    const active = host
      ? EaseReadConfig.isSiteActive(settings, host)
      : Boolean(settings.enabled && settings.autoApply);

    await api.action.setBadgeText({
      tabId,
      text: active ? "ON" : "",
    });
    if (active && api.action.setBadgeBackgroundColor) {
      await api.action.setBadgeBackgroundColor({
        tabId,
        color: "#1E5C58",
      });
    }
  } catch (_) {
    // Ignore tabs where badge cannot be set (e.g., Safari start page)
  }
}

async function refreshActiveTabBadge() {
  if (!api || !api.tabs) return;
  try {
    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      await updateBadgeForTab(tabs[0].id, tabs[0].url || "");
    }
  } catch (_) {}
}

if (api) {
  if (api.runtime && api.runtime.onInstalled) {
    api.runtime.onInstalled.addListener(async () => {
      const existing = await EaseReadConfig.loadSettings();
      await EaseReadConfig.saveSettings(existing);
      await refreshActiveTabBadge();
    });
  }

  if (api.tabs && api.tabs.onActivated) {
    api.tabs.onActivated.addListener(async (info) => {
      try {
        const tab = await api.tabs.get(info.tabId);
        if (tab) await updateBadgeForTab(tab.id, tab.url || "");
      } catch (_) {}
    });
  }

  if (api.tabs && api.tabs.onUpdated) {
    api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab) {
        updateBadgeForTab(tabId, tab.url || "");
      }
    });
  }

  if (api.storage && api.storage.onChanged) {
    api.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes[EaseReadConfig.STORAGE_KEY]) {
        refreshActiveTabBadge();
      }
    });
  }

  if (api.commands && api.commands.onCommand) {
    api.commands.onCommand.addListener(async (command) => {
      try {
        const tabs = await api.tabs.query({ active: true, currentWindow: true });
        const tab = tabs && tabs[0];
        if (!tab || tab.id == null) return;

        let type = null;
        if (command === "toggle-easeread") type = "EASEREAD_TOGGLE_SITE";
        else if (command === "toggle-ruler") type = "EASEREAD_TOGGLE_RULER";
        else if (command === "toggle-reader") type = "EASEREAD_TOGGLE_READER";
        if (!type) return;

        await api.tabs.sendMessage(tab.id, { type });
        await updateBadgeForTab(tab.id, tab.url || "");
      } catch (_) {}
    });
  }
}
