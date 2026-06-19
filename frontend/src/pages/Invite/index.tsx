// SPDX-License-Identifier: MIT
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FullScreenLoader } from "@/components/Preloader";
import Invite from "@/models/invite";
import NewUserModal from "./NewUserModal";
import ModalWrapper from "@/components/ModalWrapper";

export default function InvitePage() {
  const { code } = useParams();
  const [result, setResult] = useState({
    status: "loading",
    message: null as string | null,
  });

  useEffect(() => {
    let cancelled = false;
    async function checkInvite() {
      if (!code) {
        if (!cancelled)
          setResult({
            status: "invalid",
            message: "No invite code provided.",
          });
        return;
      }
      try {
        const { invite, error } = await Invite.checkInvite(code);
        if (cancelled) return;
        setResult({
          status: invite ? "valid" : "invalid",
          message: error,
        });
      } catch (err: any) {
        if (cancelled) return;
        setResult({
          status: "invalid",
          message:
            err?.message ||
            "Unable to verify invite code. Please try again later.",
        });
      }
    }
    checkInvite();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (result.status === "loading") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
        <FullScreenLoader />
      </div>
    );
  }

  if (result.status === "invalid") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex items-center justify-center">
        <p className="text-red-400 text-lg">{result.message}</p>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex items-center justify-center">
      <ModalWrapper isOpen={true}>
        <NewUserModal />
      </ModalWrapper>
    </div>
  );
}
