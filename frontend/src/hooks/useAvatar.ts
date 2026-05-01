import { useEffect, useState } from "react";
import {
  getAvatarOption,
  getStoredAvatarId,
  setStoredAvatarId,
} from "../lib/avatar";

export function useAvatar() {
  const [avatarId, setAvatarId] = useState(() => getStoredAvatarId());

  useEffect(() => {
    function syncAvatar() {
      setAvatarId(getStoredAvatarId());
    }

    window.addEventListener("storage", syncAvatar);
    window.addEventListener("yaobox-avatar-change", syncAvatar);

    return () => {
      window.removeEventListener("storage", syncAvatar);
      window.removeEventListener("yaobox-avatar-change", syncAvatar);
    };
  }, []);

  function updateAvatar(nextAvatarId: string) {
    setStoredAvatarId(nextAvatarId);
    setAvatarId(getStoredAvatarId());
  }

  return {
    avatarId,
    avatar: getAvatarOption(avatarId),
    setAvatarId: updateAvatar,
  };
}