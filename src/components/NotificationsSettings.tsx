"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  ModalOverlay,
  ModalPanel,
  FieldLabel,
  FieldError,
  ModalActions,
  CheckboxField,
  useConfirm,
} from "@/components/Modal";
import {
  formatReminderSchedule,
  getClientTimezone,
  type ReminderInterval,
  type ReminderRecord,
} from "@/lib/reminder-schedule";
import {
  getPushSupport,
  subscribeToWebPush,
  type PushPermissionState,
} from "@/lib/push-client";

const INTERVALS: ReminderInterval[] = ["once", "daily", "weekly", "monthly"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function ensurePhonePush(): Promise<boolean> {
  const result = await subscribeToWebPush();
  return result.ok;
}

function notifyRemindersUpdated() {
  window.dispatchEvent(new CustomEvent("reminders-updated"));
}

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

export function NotificationsSettings({ expanded, onToggle }: Props) {
  const { t } = useLanguage();
  const [reminders, setReminders] = useState<ReminderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<ReminderRecord | null>(null);
  const [form, setForm] = useState({
    message: "",
    time: "10:00",
    startDate: todayIso(),
    interval: "daily" as ReminderInterval,
    enabled: true,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pushState, setPushState] = useState<PushPermissionState>("default");
  const [pushEnabling, setPushEnabling] = useState(false);
  const [pushError, setPushError] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();

  const intervalLabels: Record<ReminderInterval, string> = {
    once: t("settings_notifOnce"),
    daily: t("settings_notifDaily"),
    weekly: t("settings_notifWeekly"),
    monthly: t("settings_notifMonthly"),
  };

  const loadReminders = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders");
      if (!res.ok) return;
      const data = (await res.json()) as ReminderRecord[];
      setReminders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    setPushState(getPushSupport());
  }, [expanded]);

  async function handleEnablePush() {
    setPushError("");
    setPushEnabling(true);
    try {
      const result = await subscribeToWebPush();
      setPushState(getPushSupport());
      if (!result.ok) {
        if (result.reason === "denied") setPushError(t("settings_pushDenied"));
        else if (result.reason === "unsupported") setPushError(t("settings_pushUnsupported"));
        else if (result.reason === "no-vapid") setPushError(t("settings_pushNotConfigured"));
        else setPushError(t("settings_pushError"));
      }
    } catch {
      setPushError(t("settings_pushError"));
    } finally {
      setPushEnabling(false);
    }
  }

  function openCreate() {
    setEditItem(null);
    setError("");
    setForm({ message: "", time: "10:00", startDate: todayIso(), interval: "daily", enabled: true });
    setModal(true);
  }

  function openEdit(item: ReminderRecord) {
    setEditItem(item);
    setError("");
    setForm({
      message: item.message,
      time: item.time,
      startDate: item.startDate,
      interval: item.interval,
      enabled: item.enabled,
    });
    setModal(true);
  }

  function closeModal() {
    setModal(false);
    setEditItem(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.message.trim()) {
      setError(t("settings_notifErrorMessage"));
      return;
    }

    setSubmitting(true);
    try {
      const pushOk = await ensurePhonePush();
      if (!pushOk) {
        setError(t("settings_pushRequired"));
        return;
      }

      const payload = {
        message: form.message.trim(),
        time: form.time,
        startDate: form.startDate,
        interval: form.interval,
        timezone: getClientTimezone(),
        enabled: form.enabled,
      };

      const res = await fetch(editItem ? `/api/reminders/${editItem.id}` : "/api/reminders", {
        method: editItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("settings_notifErrorGeneric"));
        return;
      }

      closeModal();
      await loadReminders();
      notifyRemindersUpdated();
    } catch {
      setError(t("auth_errorConnection"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleEnabled(item: ReminderRecord) {
    const res = await fetch(`/api/reminders/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !item.enabled }),
    });
    if (res.ok) {
      await loadReminders();
      notifyRemindersUpdated();
    }
  }

  async function handleDelete(item: ReminderRecord) {
    const ok = await confirm(t("settings_notifConfirmDelete", item.message));
    if (!ok) return;
    const res = await fetch(`/api/reminders/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      await loadReminders();
      notifyRemindersUpdated();
    }
  }

  const activeCount = reminders.filter((r) => r.enabled).length;

  return (
    <>
      <div className="card overflow-hidden !p-0 opacity-0 animate-slide-up animate-stagger-4">
        <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 transition-colors">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-red)] flex items-center justify-center">
            <Bell className="w-4 h-4 text-white" strokeWidth={2} />
          </span>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-medium">{t("settings_notifications")}</p>
            <p className="text-[12px] text-[var(--text-tertiary)]">
              {loading
                ? t("settings_notifLoading")
                : activeCount > 0
                  ? t("settings_notifActiveCount", String(activeCount))
                  : t("settings_notifHint")}
            </p>
          </div>
          <ChevronRight className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        </button>

        {expanded && (
          <div className="px-5 pb-4 animate-slide-up border-t border-[var(--border)]">
            <p className="text-[12px] text-[var(--text-tertiary)] pt-4 pb-3">{t("settings_notifDescription")}</p>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--input-bg)] p-4 mb-4">
              <p className="text-[14px] font-medium">{t("settings_pushTitle")}</p>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{t("settings_pushHint")}</p>
              {pushState === "granted" ? (
                <p className="mt-3 text-[13px] font-medium text-[var(--accent-green)]">{t("settings_pushEnabled")}</p>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushEnabling || pushState === "unsupported"}
                  className="mt-3 w-full rounded-xl bg-[var(--accent-blue)] text-white py-2.5 text-[14px] font-semibold hover:brightness-110 disabled:opacity-60 transition"
                >
                  {pushEnabling ? t("settings_pushEnabling") : t("settings_pushEnable")}
                </button>
              )}
              {pushError && <p className="mt-2 text-[12px] text-[var(--accent-red)]">{pushError}</p>}
              <p className="mt-3 text-[11px] text-[var(--text-tertiary)] leading-relaxed">{t("settings_pushInstallHint")}</p>
            </div>

            {!loading && reminders.length === 0 && (
              <p className="text-[13px] text-[var(--text-secondary)] py-4 text-center">{t("settings_notifEmpty")}</p>
            )}

            {reminders.length > 0 && (
              <ul className="space-y-2 mb-4">
                {reminders.map((item) => (
                  <li
                    key={item.id}
                    className={`rounded-xl border px-4 py-3 transition-colors ${
                      item.enabled
                        ? "border-[var(--border)] bg-[var(--input-bg)]"
                        : "border-[var(--border)]/60 bg-[var(--input-bg)]/50 opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(item)}
                        className={`mt-0.5 w-10 h-6 rounded-full relative transition-colors shrink-0 ${
                          item.enabled ? "bg-[var(--accent-green)]" : "bg-[var(--surface-tertiary)]"
                        }`}
                        aria-label={item.enabled ? t("settings_notifDisable") : t("settings_notifEnable")}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            item.enabled ? "translate-x-[18px]" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[var(--text)]">{item.message}</p>
                        <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                          {formatReminderSchedule(item, intervalLabels)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/10 transition-colors"
                          title={t("settings_notifEdit")}
                        >
                          <Pencil className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors"
                          title={t("modal_delete")}
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={openCreate}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-strong)] py-3 text-[14px] font-medium text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/5 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2} />
              {t("settings_notifAdd")}
            </button>
          </div>
        )}
      </div>

      {confirmDialog}

      {modal && (
        <ModalOverlay onClose={closeModal}>
          <ModalPanel
            title={editItem ? t("settings_notifEdit") : t("settings_notifAdd")}
            onClose={closeModal}
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <FieldLabel>{t("settings_notifMessage")}</FieldLabel>
                <input
                  type="text"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder={t("settings_notifMessagePlaceholder")}
                  required
                  maxLength={500}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>{t("settings_notifTime")}</FieldLabel>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <FieldLabel>{t("settings_notifDate")}</FieldLabel>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <FieldLabel>{t("settings_notifInterval")}</FieldLabel>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVALS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, interval: value }))}
                      className={`py-2.5 px-3 rounded-xl text-[13px] font-medium transition-all border ${
                        form.interval === value
                          ? "border-[var(--accent-blue)] bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"
                          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                      }`}
                    >
                      {intervalLabels[value]}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-2">{t(`settings_notifIntervalHint_${form.interval}`)}</p>
              </div>

              <CheckboxField
                checked={form.enabled}
                onChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
                label={t("settings_notifEnabled")}
              />

              {error && <FieldError message={error} />}
              <ModalActions
                onCancel={closeModal}
                submitLabel={submitting ? t("modal_save") + "…" : editItem ? t("modal_save") : t("modal_add")}
                submitDisabled={submitting}
              />
            </form>
          </ModalPanel>
        </ModalOverlay>
      )}
    </>
  );
}
