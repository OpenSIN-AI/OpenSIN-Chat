// SPDX-License-Identifier: MIT
import RemoteNvidiaNimOptions from "./remote";
import ManagedNvidiaNimOptions from "./managed";

export default function NvidiaNimOptions({ settings }: any): JSX.Element {
  const version = "remote"; // static to "remote" when in docker version.
  return version === "remote" ? (
    <RemoteNvidiaNimOptions settings={settings} />
  ) : (
    <ManagedNvidiaNimOptions settings={settings} />
  );
}
