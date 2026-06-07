// SPDX-License-Identifier: MIT
export default function OpencodeZenOptions({ settings }) {
  return (
    <div className="flex flex-col gap-y-7">
      <div className="flex gap-[36px] mt-1.5 flex-wrap">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            Base URL
          </label>
          <input
            type="url"
            name="OpencodeZenBasePath"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="https://opencode.ai/zen/v1"
            defaultValue={
              settings?.OpencodeZenBasePath || "https://opencode.ai/zen/v1"
            }
            onChange={() => {}}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            API Key
          </label>
          <input
            type="password"
            name="OpencodeZenApiKey"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="OpenCode Zen API Key"
            defaultValue={settings?.OpencodeZenApiKey ? "*".repeat(20) : ""}
            onChange={() => {}}
            required={false}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            Model ID
          </label>
          <input
            type="text"
            name="OpencodeZenModelPref"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="e.g. nemotron-3-ultra-free"
            defaultValue={
              settings?.OpencodeZenModelPref || "nemotron-3-ultra-free"
            }
            onChange={() => {}}
            required={true}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="flex gap-[36px] flex-wrap">
        <div className="flex flex-col w-60">
          <label className="text-white text-sm font-semibold block mb-3">
            Model context window
          </label>
          <input
            type="number"
            name="OpencodeZenTokenLimit"
            className="border-none bg-theme-settings-input-bg text-white placeholder:text-theme-settings-input-placeholder text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5"
            placeholder="Content window limit (eg: 1000000)"
            min={1}
            onScroll={(e) => e.target.blur()}
            defaultValue={settings?.OpencodeZenTokenLimit || 1000000}
            required={true}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  );
}
