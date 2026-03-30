"use client";

import { useEffect } from "react";
import {
  GUARDIAN_REQUEST_DEFAULTS_EVENT,
  type GuardianRequestSheetHostProps,
} from "@/components/guardians/guardian-request-sheet";

export function GuardianRequestDefaultsPublisher(props: GuardianRequestSheetHostProps) {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(GUARDIAN_REQUEST_DEFAULTS_EVENT, { detail: props }));
    return () => {
      window.dispatchEvent(new CustomEvent(GUARDIAN_REQUEST_DEFAULTS_EVENT, { detail: null }));
    };
  }, [
    props.guardianUserId,
    props.displayName,
    props.headline,
    props.avatarUrl,
    props.suggestedRegionSlug ?? "",
  ]);
  return null;
}
