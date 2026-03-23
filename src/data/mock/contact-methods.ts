import type { ContactMethod } from "@/types/domain";

export const mockContactMethods: ContactMethod[] = [
  {
    id: "c1",
    user_id: "g1",
    channel: "telegram",
    handle: "@minseo_ksm",
    is_preferred: true,
    verified: true,
  },
  {
    id: "c1b",
    user_id: "g1",
    channel: "kakao",
    handle: "minseo.ksm",
    is_preferred: false,
    verified: true,
  },
  {
    id: "c1c",
    user_id: "g1",
    channel: "whatsapp",
    handle: "+82-10-xxxx-xxxx",
    is_preferred: false,
    verified: false,
  },
  {
    id: "c1d",
    user_id: "g1",
    channel: "email",
    handle: "minseo@example.com",
    is_preferred: false,
    verified: false,
  },
  {
    id: "c2",
    user_id: "g2",
    channel: "kakao",
    handle: "daniel.r.gsm",
    is_preferred: true,
    verified: false,
  },
];
