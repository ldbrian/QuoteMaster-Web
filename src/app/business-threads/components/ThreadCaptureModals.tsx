"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";

type ManualSource = "WECHAT" | "WHATSAPP" | "EMAIL" | "OTHER";

export function OnboardingGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const steps = [
    "打开 Chrome 扩展管理页，开启开发者模式。",
    "选择加载已解压的扩展程序，目录选择 chromeextension/gmailcapture。",
    "回到 QuoteMaster 登录账号，进入业务线程页面完成账号绑定。",
    "打开 Gmail、163 邮箱或其他网页邮箱，进入具体邮件详情页后等待自动捕获。",
    "微信、电话纪要或其他渠道，使用右上角的手动录入。",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold text-slate-400">新手指引</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">安装插件并开始捕获</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-950"
            aria-label="关闭新手指引"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-6">
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-medium leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-900">使用原则</p>
            <p className="mt-2 text-sm leading-6 text-amber-800">
              插件只在识别到邮件或沟通正文时同步。若是微信、QQ、电话记录、展会名片等非网页邮箱内容，直接使用手动录入，系统会走同一套 AI 分拣和业务线程归并逻辑。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ManualCaptureModal({
  open,
  authToken,
  onClose,
  onSuccess,
}: {
  open: boolean;
  authToken: string | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [source, setSource] = useState<ManualSource>("WECHAT");
  const [contact, setContact] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const cleanedContact = contact.trim();
    const cleanedBody = messageBody.trim();

    if (!cleanedContact) {
      setError("请填写客户邮箱、微信名、手机号或其他身份线索。");
      return;
    }

    if (cleanedBody.length < 12) {
      setError("请粘贴一段完整的客户沟通内容，至少 12 个字符。");
      return;
    }

    if (!authToken) {
      setError("当前账号未完成登录，请刷新页面后重新登录。");
      return;
    }

    const sourceIdentity = cleanedContact.includes("@")
      ? cleanedContact
      : source.toLowerCase() + ":" + cleanedContact;

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/ingest/communication", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + authToken,
        },
        body: JSON.stringify({
          source_email: sourceIdentity,
          message_body: cleanedBody,
          timestamp: new Date().toISOString(),
          source,
          title: cleanedBody.slice(0, 80),
          capture_mode: "manual-paste",
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || "手动录入失败");
      }

      setContact("");
      setMessageBody("");
      await onSuccess();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "手动录入失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold text-slate-400">手动录入</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">粘贴微信或其他渠道沟通</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">这会进入同一套 AI 分拣链路，自动归并到业务线程。</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-950"
            aria-label="关闭手动录入"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="grid gap-4 md:grid-cols-[160px_1fr]">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">来源渠道</span>
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as ManualSource)}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors focus:border-slate-400"
              >
                <option value="WECHAT">微信</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">邮件</option>
                <option value="OTHER">其他</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-slate-500">客户身份线索</span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder="例如：客户邮箱、微信名、手机号、公司名"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-slate-400"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-slate-500">沟通原文</span>
            <textarea
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="粘贴客户发来的询盘、报价反馈、样品确认、付款或交期沟通内容..."
              rows={9}
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-slate-400"
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={15} />
              {isSubmitting ? "正在分拣" : "提交给 AI 分拣"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
