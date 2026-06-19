// SPDX-License-Identifier: MIT
// Purpose: Mobile device row display and management
// Docs: DeviceRow/index.doc.md
import showToast from "@/utils/toast";
import MobileConnection from "@/models/mobile";
import { useState } from "react";
import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);
import { BugDroid } from "@phosphor-icons/react/dist/csr/BugDroid";
import { AppleLogo } from "@phosphor-icons/react/dist/csr/AppleLogo";
import { Link } from "react-router-dom";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";

const LLL_FORMAT = "lll";

interface Device {
  id: string;
  approved: boolean;
  deviceOs: string;
  deviceName: string;
  createdAt: string;
  user?: {
    username: string;
  };
}

interface DeviceRowProps {
  device: Device;
  removeDevice: (id: string) => void;
}

export default function DeviceRow({
  device,
  removeDevice,
}: DeviceRowProps): React.ReactElement {
  const { t } = useTranslation();
  const [status, setStatus] = useState<boolean>(device.approved);

  const handleApprove = async (): Promise<void> => {
    await MobileConnection.updateDevice(device.id, { approved: true });
    showToast(t("deviceRow.accessGranted"), "info");
    setStatus(true);
  };

  const handleDeny = async (): Promise<void> => {
    await MobileConnection.deleteDevice(device.id);
    showToast(t("deviceRow.accessDenied"), "info");
    setStatus(false);
    removeDevice(device.id);
  };

  return (
    <>
      <tr className="bg-transparent text-white text-opacity-80 text-xs font-medium border-b border-white/10 h-10">
        <td scope="row" className="px-6 whitespace-nowrap">
          <div className="flex items-center gap-x-2">
            {device.deviceOs === "ios" ? (
              <AppleLogo
                weight="fill"
                size={16}
                className="fill-theme-text-primary"
              />
            ) : (
              <BugDroid
                weight="fill"
                size={16}
                className="fill-theme-text-primary"
              />
            )}
            <span className="text-sm">{device.deviceName}</span>
          </div>
        </td>
        <td className="px-6">
          <div className="flex items-center gap-x-2">
            {device.createdAt
              ? dayjs(device.createdAt).format(LLL_FORMAT)
              : "—"}
            {device.user && (
              <div className="flex items-center gap-x-1">
                <span className="text-xs text-theme-text-secondary">
                  {t("deviceRow.by")}
                </span>
                <Link
                  to={paths.settings.users()}
                  className="text-xs text-theme-text-secondary hover:underline hover:text-cta-button"
                >
                  {device.user.username}
                </Link>
              </div>
            )}
          </div>
        </td>
        <td className="px-6 flex items-center gap-x-6 h-full mt-1">
          {status ? (
            <button
              type="button"
              onClick={handleDeny}
              className={`border-none flex items-center justify-center text-xs font-medium text-white/80 light:text-black/80 rounded-lg p-1 hover:bg-white hover:light:bg-red-50 hover:bg-opacity-10`}
            >
              {t("deviceRow.revoke")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleApprove}
                className={`border-none flex items-center justify-center text-xs font-medium text-white/80 light:text-black/80 rounded-lg p-1 hover:bg-white hover:bg-opacity-10 hover:light:bg-green-50 hover:light:text-green-500 hover:text-green-300`}
              >
                {t("deviceRow.approveAccess")}
              </button>
              <button
                type="button"
                onClick={handleDeny}
                className={`border-none flex items-center justify-center text-xs font-medium text-white/80 light:text-black/80 rounded-lg p-1 hover:bg-white hover:bg-opacity-10 hover:light:bg-red-50 hover:light:text-red-500 hover:text-red-300`}
              >
                {t("deviceRow.deny")}
              </button>
            </>
          )}
        </td>
      </tr>
    </>
  );
}
