"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GuardianApplyForm() {
  const [open, setOpen] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO(prod): Persist `guardian_profiles` draft + document uploads to Supabase Storage.
    setOpen(true);
  }

  return (
    <>
      <p className="text-muted-foreground mx-auto mb-6 max-w-xl text-sm leading-relaxed">
        지원 후에는 <span className="text-foreground font-medium">Contributor</span> 단계로 시작합니다. 이후
        승인된 포스트 기여와 운영 검토를 바탕으로 단계가 확장되며, 매칭 활성화는 별도 기준으로만 진행됩니다.
      </p>
      <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="g-name">실명 (법적 성명)</Label>
            <Input id="g-name" required placeholder="신분증/서류 기준 성명" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-display">활동명 (프로필에 표시될 이름)</Label>
            <Input id="g-display" required placeholder="여행자에게 보이는 이름" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-email">이메일</Label>
          <Input id="g-email" type="email" required autoComplete="email" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-lang">지원 가능 언어</Label>
          <Input
            id="g-lang"
            required
            placeholder="예: English (fluent), 日本語 (conversational), 한국어 (native)"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="g-bio">소개 및 경험 (간략하게)</Label>
          <Textarea
            id="g-bio"
            rows={5}
            required
            placeholder="잘 아는 지역, 서울 거주 기간, 안내 범위/경계 등"
          />
        </div>
        <label className="text-muted-foreground flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" required className="border-input text-primary mt-1 size-4 rounded" />
          <span>
            저는 의료·법률·긴급 구조 서비스를 대행하지 않으며, 가디언 활동이 정해진 범위 내의 실무 동행
            지원임을 확인합니다.
          </span>
        </label>
        <Button type="submit" size="lg" className="rounded-xl">
          지원서 제출
        </Button>
      </form>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>지원서가 접수되었습니다 (MVP)</DialogTitle>
            <DialogDescription>
              운영 환경에서는 대기 상태의 프로필을 생성하고, 운영팀 검토를 위해 알림이 전송됩니다.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setOpen(false)} className="rounded-xl">
            닫기
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
