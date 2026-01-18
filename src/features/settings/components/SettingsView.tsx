import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ChevronDown,
  ChevronUp,
  Cloud,
  LayoutGrid,
  SlidersHorizontal,
  Mic,
  Stethoscope,
  TerminalSquare,
  Trash2,
  X,
  FlaskConical,
} from "lucide-react";
import type {
  AppSettings,
  CodexDoctorResult,
  CloudKitStatus,
  CloudKitTestResult,
  DictationModelStatus,
  NatsStatus,
  WorkspaceInfo,
} from "../../../types";
import { formatDownloadSize } from "../../../utils/formatting";
import { isAppleMobileDevice } from "../../../utils/platform";
import { clampUiScale } from "../../../utils/uiScale";

const DICTATION_MODELS = [
  { id: "tiny", label: "Tiny", size: "75 MB", note: "Fastest, least accurate." },
  { id: "base", label: "Base", size: "142 MB", note: "Balanced default." },
  { id: "small", label: "Small", size: "466 MB", note: "Better accuracy." },
  { id: "medium", label: "Medium", size: "1.5 GB", note: "High accuracy." },
  { id: "large-v3", label: "Large V3", size: "3.0 GB", note: "Best accuracy, heavy download." },
];

type SettingsViewProps = {
  workspaces: WorkspaceInfo[];
  onClose: () => void;
  onMoveWorkspace: (id: string, direction: "up" | "down") => void;
  onDeleteWorkspace: (id: string) => void;
  reduceTransparency: boolean;
  onToggleTransparency: (value: boolean) => void;
  appSettings: AppSettings;
  onUpdateAppSettings: (next: AppSettings) => Promise<void>;
  onRunDoctor: (codexBin: string | null) => Promise<CodexDoctorResult>;
  onNatsStatus: () => Promise<NatsStatus>;
  onCloudKitStatus: () => Promise<CloudKitStatus>;
  onCloudKitTest: () => Promise<CloudKitTestResult>;
  onUpdateWorkspaceCodexBin: (id: string, codexBin: string | null) => Promise<void>;
  scaleShortcutTitle: string;
  scaleShortcutText: string;
  onTestNotificationSound: () => void;
  dictationModelStatus?: DictationModelStatus | null;
  onDownloadDictationModel?: () => void;
  onCancelDictationDownload?: () => void;
  onRemoveDictationModel?: () => void;
  initialSection?: CodexSection;
};

type SettingsSection = "projects" | "cloud" | "display" | "dictation";
type CodexSection = SettingsSection | "codex" | "experimental";

function orderValue(workspace: WorkspaceInfo) {
  const value = workspace.settings.sortOrder;
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER;
}

export function SettingsView({
  workspaces,
  onClose,
  onMoveWorkspace,
  onDeleteWorkspace,
  reduceTransparency,
  onToggleTransparency,
  appSettings,
  onUpdateAppSettings,
  onRunDoctor,
  onNatsStatus,
  onCloudKitStatus,
  onCloudKitTest,
  onUpdateWorkspaceCodexBin,
  scaleShortcutTitle,
  scaleShortcutText,
  onTestNotificationSound,
  dictationModelStatus,
  onDownloadDictationModel,
  onCancelDictationDownload,
  onRemoveDictationModel,
  initialSection,
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<CodexSection>(
    isAppleMobileDevice() ? "cloud" : "projects",
  );
  const [codexPathDraft, setCodexPathDraft] = useState(appSettings.codexBin ?? "");
  const [natsUrlDraft, setNatsUrlDraft] = useState(appSettings.natsUrl ?? "");
  const [cloudKitContainerDraft, setCloudKitContainerDraft] = useState(
    appSettings.cloudKitContainerId ?? "",
  );
  const [telegramTokenDraft, setTelegramTokenDraft] = useState(
    appSettings.telegramBotToken ?? "",
  );
  const [scaleDraft, setScaleDraft] = useState(
    `${Math.round(clampUiScale(appSettings.uiScale) * 100)}%`,
  );
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, string>>({});
  const [doctorState, setDoctorState] = useState<{
    status: "idle" | "running" | "done";
    result: CodexDoctorResult | null;
  }>({ status: "idle", result: null });
  const [natsStatusState, setNatsStatusState] = useState<{
    status: "idle" | "running" | "done";
    result: NatsStatus | null;
  }>({ status: "idle", result: null });
  const [cloudKitStatusState, setCloudKitStatusState] = useState<{
    status: "idle" | "running" | "done";
    result: CloudKitStatus | null;
    error: string | null;
  }>({ status: "idle", result: null, error: null });
  const [cloudKitTestState, setCloudKitTestState] = useState<{
    status: "idle" | "running" | "done";
    result: CloudKitTestResult | null;
    error: string | null;
  }>({ status: "idle", result: null, error: null });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const dictationReady = dictationModelStatus?.state === "ready";
  const dictationProgress = dictationModelStatus?.progress ?? null;
  const selectedDictationModel = useMemo(() => {
    return (
      DICTATION_MODELS.find(
        (model) => model.id === appSettings.dictationModelId,
      ) ?? DICTATION_MODELS[1]
    );
  }, [appSettings.dictationModelId]);

  const projects = useMemo(() => {
    return workspaces
      .filter((entry) => (entry.kind ?? "main") !== "worktree")
      .slice()
      .sort((a, b) => {
        const orderDiff = orderValue(a) - orderValue(b);
        if (orderDiff !== 0) {
          return orderDiff;
        }
        return a.name.localeCompare(b.name);
      });
  }, [workspaces]);

  useEffect(() => {
    setCodexPathDraft(appSettings.codexBin ?? "");
  }, [appSettings.codexBin]);

  useEffect(() => {
    setNatsUrlDraft(appSettings.natsUrl ?? "");
  }, [appSettings.natsUrl]);

  useEffect(() => {
    setCloudKitContainerDraft(appSettings.cloudKitContainerId ?? "");
  }, [appSettings.cloudKitContainerId]);

  useEffect(() => {
    setTelegramTokenDraft(appSettings.telegramBotToken ?? "");
  }, [appSettings.telegramBotToken]);

  useEffect(() => {
    setScaleDraft(`${Math.round(clampUiScale(appSettings.uiScale) * 100)}%`);
  }, [appSettings.uiScale]);

  useEffect(() => {
    setOverrideDrafts((prev) => {
      const next: Record<string, string> = {};
      projects.forEach((workspace) => {
        next[workspace.id] =
          prev[workspace.id] ?? workspace.codex_bin ?? "";
      });
      return next;
    });
  }, [projects]);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const codexDirty =
    (codexPathDraft.trim() || null) !== (appSettings.codexBin ?? null);

  const trimmedScale = scaleDraft.trim();
  const parsedPercent = trimmedScale
    ? Number(trimmedScale.replace("%", ""))
    : Number.NaN;
  const parsedScale = Number.isFinite(parsedPercent) ? parsedPercent / 100 : null;

  const handleSaveCloudSettings = async (patch: Partial<AppSettings>) => {
    setIsSavingSettings(true);
    try {
      await onUpdateAppSettings({
        ...appSettings,
        ...patch,
      });
      setNatsStatusState({ status: "idle", result: null });
      setCloudKitStatusState({ status: "idle", result: null, error: null });
      setCloudKitTestState({ status: "idle", result: null, error: null });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveCodexSettings = async () => {
    setIsSavingSettings(true);
    try {
      await onUpdateAppSettings({
        ...appSettings,
        codexBin: codexPathDraft.trim() ? codexPathDraft.trim() : null,
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCommitScale = async () => {
    if (parsedScale === null) {
      setScaleDraft(`${Math.round(clampUiScale(appSettings.uiScale) * 100)}%`);
      return;
    }
    const nextScale = clampUiScale(parsedScale);
    setScaleDraft(`${Math.round(nextScale * 100)}%`);
    if (nextScale === appSettings.uiScale) {
      return;
    }
    await onUpdateAppSettings({
      ...appSettings,
      uiScale: nextScale,
    });
  };

  const handleResetScale = async () => {
    if (appSettings.uiScale === 1) {
      setScaleDraft("100%");
      return;
    }
    setScaleDraft("100%");
    await onUpdateAppSettings({
      ...appSettings,
      uiScale: 1,
    });
  };

  const handleBrowseCodex = async () => {
    const selection = await open({ multiple: false, directory: false });
    if (!selection || Array.isArray(selection)) {
      return;
    }
    setCodexPathDraft(selection);
  };

  const handleRunDoctor = async () => {
    setDoctorState({ status: "running", result: null });
    try {
      const result = await onRunDoctor(
        codexPathDraft.trim() ? codexPathDraft.trim() : null,
      );
      setDoctorState({ status: "done", result });
    } catch (error) {
      setDoctorState({
        status: "done",
        result: {
          ok: false,
          codexBin: codexPathDraft.trim() ? codexPathDraft.trim() : null,
          version: null,
          appServerOk: false,
          details: error instanceof Error ? error.message : String(error),
          path: null,
          nodeOk: false,
          nodeVersion: null,
          nodeDetails: null,
        },
      });
    }
  };

  const handleTestNats = async () => {
    setNatsStatusState({ status: "running", result: null });
    try {
      const url = natsUrlDraft.trim();
      if (url !== (appSettings.natsUrl ?? "")) {
        await handleSaveCloudSettings({ natsUrl: url.length ? url : null });
      }
      const res = await onNatsStatus();
      setNatsStatusState({ status: "done", result: res });
    } catch (error) {
      setNatsStatusState({
        status: "done",
        result: { ok: false, server: null, error: String(error) },
      });
    }
  };

  const handleCloudKitStatus = async () => {
    setCloudKitStatusState({ status: "running", result: null, error: null });
    try {
      const container = cloudKitContainerDraft.trim();
      if (container !== (appSettings.cloudKitContainerId ?? "")) {
        await handleSaveCloudSettings({
          cloudKitContainerId: container.length ? container : null,
        });
      }
      const res = await onCloudKitStatus();
      setCloudKitStatusState({ status: "done", result: res, error: null });
    } catch (error) {
      setCloudKitStatusState({
        status: "done",
        result: null,
        error: String(error),
      });
    }
  };

  const handleCloudKitTest = async () => {
    setCloudKitTestState({ status: "running", result: null, error: null });
    try {
      const container = cloudKitContainerDraft.trim();
      if (container !== (appSettings.cloudKitContainerId ?? "")) {
        await handleSaveCloudSettings({
          cloudKitContainerId: container.length ? container : null,
        });
      }
      const res = await onCloudKitTest();
      setCloudKitTestState({ status: "done", result: res, error: null });
    } catch (error) {
      setCloudKitTestState({ status: "done", result: null, error: String(error) });
    }
  };

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <div className="settings-backdrop" onClick={onClose} />
      <div className="settings-window">
        <div className="settings-titlebar">
          <div className="settings-title">Settings</div>
          <button
            type="button"
            className="ghost icon-button settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X aria-hidden />
          </button>
        </div>
        <div className="settings-body">
          <aside className="settings-sidebar">
            <button
              type="button"
              className={`settings-nav ${activeSection === "cloud" ? "active" : ""}`}
              onClick={() => setActiveSection("cloud")}
            >
              <Cloud aria-hidden />
              Cloud
            </button>
            <button
              type="button"
              className={`settings-nav ${activeSection === "projects" ? "active" : ""}`}
              onClick={() => setActiveSection("projects")}
            >
              <LayoutGrid aria-hidden />
              Projects
            </button>
            <button
              type="button"
              className={`settings-nav ${activeSection === "display" ? "active" : ""}`}
              onClick={() => setActiveSection("display")}
            >
              <SlidersHorizontal aria-hidden />
              Display &amp; Sound
            </button>
            <button
              type="button"
              className={`settings-nav ${activeSection === "dictation" ? "active" : ""}`}
              onClick={() => setActiveSection("dictation")}
            >
              <Mic aria-hidden />
              Dictation
            </button>
            <button
              type="button"
              className={`settings-nav ${activeSection === "codex" ? "active" : ""}`}
              onClick={() => setActiveSection("codex")}
            >
              <TerminalSquare aria-hidden />
              Codex
            </button>
            <button
              type="button"
              className={`settings-nav ${activeSection === "experimental" ? "active" : ""}`}
              onClick={() => setActiveSection("experimental")}
            >
              <FlaskConical aria-hidden />
              Experimental
            </button>
          </aside>
          <div className="settings-content">
            {activeSection === "projects" && (
              <section className="settings-section">
                <div className="settings-section-title">Projects</div>
                <div className="settings-section-subtitle">
                  Reorder your projects and remove unused workspaces.
                </div>
                <div className="settings-projects">
                  {projects.map((workspace, index) => (
                    <div key={workspace.id} className="settings-project-row">
                      <div className="settings-project-info">
                        <div className="settings-project-name">{workspace.name}</div>
                        <div className="settings-project-path">{workspace.path}</div>
                      </div>
                      <div className="settings-project-actions">
                        <button
                          type="button"
                          className="ghost icon-button"
                          onClick={() => onMoveWorkspace(workspace.id, "up")}
                          disabled={index === 0}
                          aria-label="Move project up"
                        >
                          <ChevronUp aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="ghost icon-button"
                          onClick={() => onMoveWorkspace(workspace.id, "down")}
                          disabled={index === projects.length - 1}
                          aria-label="Move project down"
                        >
                          <ChevronDown aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="ghost icon-button"
                          onClick={() => onDeleteWorkspace(workspace.id)}
                          aria-label="Delete project"
                        >
                          <Trash2 aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))}
                  {projects.length === 0 && (
                    <div className="settings-empty">No projects yet.</div>
                  )}
                </div>
              </section>
            )}
            {activeSection === "cloud" && (
              <section className="settings-section">
                <div className="settings-section-title">Cloud</div>
                <div className="settings-section-subtitle">
                  Sync and remote control transport. Only one of NATS or CloudKit can be active.
                </div>
                {isAppleMobileDevice() && appSettings.cloudProvider !== "local" ? (
                  <div className="settings-notice" role="status">
                    <div className="settings-notice-title">macOS runner required</div>
                    <div className="settings-notice-subtitle">
                      Start CodexMonitor on macOS (runner) using the same Cloud provider settings. This
                      iPad client will discover and control your projects remotely.
                    </div>
                  </div>
                ) : null}

                <div className="settings-field">
                  <div className="settings-field-label">Runner ID</div>
                  <div className="settings-help">{appSettings.runnerId}</div>
                </div>

                <div className="settings-field">
                  <div className="settings-field-label">Provider</div>
                  <div className="settings-field-row">
                    <button
                      type="button"
                      className={`${appSettings.cloudProvider === "local" ? "primary" : "ghost"} settings-button-compact`}
                      onClick={() => void handleSaveCloudSettings({ cloudProvider: "local" })}
                      disabled={isSavingSettings}
                    >
                      Local
                    </button>
                    <button
                      type="button"
                      className={`${appSettings.cloudProvider === "nats" ? "primary" : "ghost"} settings-button-compact`}
                      onClick={() => void handleSaveCloudSettings({ cloudProvider: "nats" })}
                      disabled={isSavingSettings}
                    >
                      NATS
                    </button>
                    <button
                      type="button"
                      className={`${appSettings.cloudProvider === "cloudkit" ? "primary" : "ghost"} settings-button-compact`}
                      onClick={() => void handleSaveCloudSettings({ cloudProvider: "cloudkit" })}
                      disabled={isSavingSettings}
                    >
                      CloudKit
                    </button>
                  </div>
                </div>

                {appSettings.cloudProvider === "nats" && (
                  <>
                    <div className="settings-section-title">NATS</div>
                    <div className="settings-field">
                      <label className="settings-field-label" htmlFor="nats-url">
                        NATS URL
                      </label>
                      <div className="settings-field-row">
                        <input
                          id="nats-url"
                          className="settings-input"
                          value={natsUrlDraft}
                          onChange={(event) => setNatsUrlDraft(event.target.value)}
                          placeholder="nats://user:pass@host:4222"
                          disabled={isSavingSettings}
                        />
                        <button
                          type="button"
                          className="ghost settings-button-compact"
                          onClick={() =>
                            void handleSaveCloudSettings({
                              natsUrl: natsUrlDraft.trim() ? natsUrlDraft.trim() : null,
                            })
                          }
                          disabled={isSavingSettings}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="primary settings-button-compact"
                          onClick={() => void handleTestNats()}
                          disabled={isSavingSettings || natsStatusState.status === "running"}
                        >
                          {natsStatusState.status === "running" ? "Testing..." : "Test"}
                        </button>
                      </div>
                      {natsStatusState.status === "done" && natsStatusState.result && (
                        <div className="settings-help">
                          {natsStatusState.result.ok
                            ? `OK (${natsStatusState.result.server ?? "connected"})`
                            : `Error: ${natsStatusState.result.error ?? "unknown"}`}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {appSettings.cloudProvider === "cloudkit" && (
                  <>
                    <div className="settings-section-title">CloudKit</div>
                    <div className="settings-field">
                      <label className="settings-field-label" htmlFor="cloudkit-container">
                        Container ID
                      </label>
                      <div className="settings-field-row">
                        <input
                          id="cloudkit-container"
                          className="settings-input"
                          value={cloudKitContainerDraft}
                          onChange={(event) => setCloudKitContainerDraft(event.target.value)}
                          placeholder="iCloud.com.example.app"
                          disabled={isSavingSettings}
                        />
                        <button
                          type="button"
                          className="ghost settings-button-compact"
                          onClick={() =>
                            void handleSaveCloudSettings({
                              cloudKitContainerId: cloudKitContainerDraft.trim()
                                ? cloudKitContainerDraft.trim()
                                : null,
                            })
                          }
                          disabled={isSavingSettings}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="primary settings-button-compact"
                          onClick={() => void handleCloudKitStatus()}
                          disabled={isSavingSettings || cloudKitStatusState.status === "running"}
                        >
                          {cloudKitStatusState.status === "running" ? "Checking..." : "Status"}
                        </button>
                        <button
                          type="button"
                          className="ghost settings-button-compact"
                          onClick={() => void handleCloudKitTest()}
                          disabled={isSavingSettings || cloudKitTestState.status === "running"}
                        >
                          {cloudKitTestState.status === "running" ? "Testing..." : "Test"}
                        </button>
                      </div>
                      {cloudKitStatusState.status === "done" &&
                        (cloudKitStatusState.error || cloudKitStatusState.result) && (
                          <div className="settings-help">
                            {cloudKitStatusState.error
                              ? `Error: ${cloudKitStatusState.error}`
                              : cloudKitStatusState.result
                                ? `${cloudKitStatusState.result.status} (available: ${cloudKitStatusState.result.available ? "yes" : "no"})`
                                : ""}
                          </div>
                        )}
                      {cloudKitTestState.status === "done" &&
                        (cloudKitTestState.error || cloudKitTestState.result) && (
                          <div className="settings-help">
                            {cloudKitTestState.error
                              ? `Error: ${cloudKitTestState.error}`
                              : cloudKitTestState.result
                                ? `OK (${cloudKitTestState.result.recordName}, ${cloudKitTestState.result.durationMs}ms)`
                                : ""}
                          </div>
                        )}
                    </div>
                  </>
                )}

                <div className="settings-section-title">Telegram (optional)</div>
                <div className="settings-section-subtitle">
                  Can be enabled independently from NATS/CloudKit.
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-title">Enable Telegram</div>
                    <div className="settings-toggle-subtitle">
                      Requires a bot token (paired clients enforced in backend).
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle ${appSettings.telegramEnabled ? "on" : ""}`}
                    onClick={() =>
                      void handleSaveCloudSettings({
                        telegramEnabled: !appSettings.telegramEnabled,
                      })
                    }
                    aria-pressed={appSettings.telegramEnabled}
                    disabled={isSavingSettings}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>

                <div className="settings-field">
                  <label className="settings-field-label" htmlFor="telegram-token">
                    Bot token
                  </label>
                  <div className="settings-field-row">
                    <input
                      id="telegram-token"
                      className="settings-input"
                      value={telegramTokenDraft}
                      onChange={(event) => setTelegramTokenDraft(event.target.value)}
                      placeholder="123456:ABCDEF..."
                      disabled={isSavingSettings}
                    />
                    <button
                      type="button"
                      className="ghost settings-button-compact"
                      onClick={() =>
                        void handleSaveCloudSettings({
                          telegramBotToken: telegramTokenDraft.trim()
                            ? telegramTokenDraft.trim()
                            : null,
                        })
                      }
                      disabled={isSavingSettings}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </section>
            )}
            {activeSection === "display" && (
              <section className="settings-section">
                <div className="settings-section-title">Display &amp; Sound</div>
                <div className="settings-section-subtitle">
                  Tune visuals and audio alerts to your preferences.
                </div>
                <div className="settings-subsection-title">Display</div>
                <div className="settings-subsection-subtitle">
                  Adjust how the window renders backgrounds and effects.
                </div>
                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-title">Reduce transparency</div>
                    <div className="settings-toggle-subtitle">
                      Use solid surfaces instead of glass.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle ${reduceTransparency ? "on" : ""}`}
                    onClick={() => onToggleTransparency(!reduceTransparency)}
                    aria-pressed={reduceTransparency}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>
                <div className="settings-toggle-row settings-scale-row">
                  <div>
                    <div className="settings-toggle-title">Interface scale</div>
                    <div
                      className="settings-toggle-subtitle"
                      title={scaleShortcutTitle}
                    >
                      {scaleShortcutText}
                    </div>
                  </div>
                  <div className="settings-scale-controls">
                    <input
                      id="ui-scale"
                      type="text"
                      inputMode="decimal"
                      className="settings-input settings-input--scale"
                      value={scaleDraft}
                      aria-label="Interface scale"
                      onChange={(event) => setScaleDraft(event.target.value)}
                      onBlur={() => {
                        void handleCommitScale();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleCommitScale();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="ghost settings-scale-reset"
                      onClick={() => {
                        void handleResetScale();
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="settings-subsection-title">Sounds</div>
                <div className="settings-subsection-subtitle">
                  Control notification audio alerts.
                </div>
                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-title">Notification sounds</div>
                    <div className="settings-toggle-subtitle">
                      Play a sound when a long-running agent finishes while the window is unfocused.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle ${appSettings.notificationSoundsEnabled ? "on" : ""}`}
                    onClick={() =>
                      void onUpdateAppSettings({
                        ...appSettings,
                        notificationSoundsEnabled: !appSettings.notificationSoundsEnabled,
                      })
                    }
                    aria-pressed={appSettings.notificationSoundsEnabled}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>
                <div className="settings-sound-actions">
                  <button
                    type="button"
                    className="ghost settings-button-compact"
                    onClick={onTestNotificationSound}
                  >
                    Test sound
                  </button>
                </div>
              </section>
            )}
            {activeSection === "dictation" && (
              <section className="settings-section">
                <div className="settings-section-title">Dictation</div>
                <div className="settings-section-subtitle">
                  Enable microphone dictation with on-device transcription.
                </div>
                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-title">Enable dictation</div>
                    <div className="settings-toggle-subtitle">
                      Downloads the selected Whisper model on first use.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle ${appSettings.dictationEnabled ? "on" : ""}`}
                    onClick={() => {
                      const nextEnabled = !appSettings.dictationEnabled;
                      void onUpdateAppSettings({
                        ...appSettings,
                        dictationEnabled: nextEnabled,
                      });
                      if (
                        !nextEnabled &&
                        dictationModelStatus?.state === "downloading" &&
                        onCancelDictationDownload
                      ) {
                        onCancelDictationDownload();
                      }
                      if (
                        nextEnabled &&
                        dictationModelStatus?.state === "missing" &&
                        onDownloadDictationModel
                      ) {
                        onDownloadDictationModel();
                      }
                    }}
                    aria-pressed={appSettings.dictationEnabled}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label" htmlFor="dictation-model">
                    Dictation model
                  </label>
                  <select
                    id="dictation-model"
                    className="settings-select"
                    value={appSettings.dictationModelId}
                    onChange={(event) =>
                      void onUpdateAppSettings({
                        ...appSettings,
                        dictationModelId: event.target.value,
                      })
                    }
                  >
                    {DICTATION_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label} ({model.size})
                      </option>
                    ))}
                  </select>
                  <div className="settings-help">
                    {selectedDictationModel.note} Download size: {selectedDictationModel.size}.
                  </div>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label" htmlFor="dictation-language">
                    Preferred dictation language
                  </label>
                  <select
                    id="dictation-language"
                    className="settings-select"
                    value={appSettings.dictationPreferredLanguage ?? ""}
                    onChange={(event) =>
                      void onUpdateAppSettings({
                        ...appSettings,
                        dictationPreferredLanguage: event.target.value || null,
                      })
                    }
                  >
                    <option value="">Auto-detect only</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="nl">Dutch</option>
                    <option value="sv">Swedish</option>
                    <option value="no">Norwegian</option>
                    <option value="da">Danish</option>
                    <option value="fi">Finnish</option>
                    <option value="pl">Polish</option>
                    <option value="tr">Turkish</option>
                    <option value="ru">Russian</option>
                    <option value="uk">Ukrainian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                  </select>
                  <div className="settings-help">
                    Auto-detect stays on; this nudges the decoder toward your preference.
                  </div>
                </div>
                <div className="settings-field">
                  <label className="settings-field-label" htmlFor="dictation-hold-key">
                    Hold-to-dictate key
                  </label>
                  <select
                    id="dictation-hold-key"
                    className="settings-select"
                    value={appSettings.dictationHoldKey ?? ""}
                    onChange={(event) =>
                      void onUpdateAppSettings({
                        ...appSettings,
                        dictationHoldKey: event.target.value,
                      })
                    }
                  >
                    <option value="">Off</option>
                    <option value="alt">Option / Alt</option>
                    <option value="shift">Shift</option>
                    <option value="control">Control</option>
                    <option value="meta">Command / Meta</option>
                  </select>
                  <div className="settings-help">
                    Hold the key to start dictation, release to stop and process.
                  </div>
                </div>
                {dictationModelStatus && (
                  <div className="settings-field">
                    <div className="settings-field-label">
                      Model status ({selectedDictationModel.label})
                    </div>
                    <div className="settings-help">
                      {dictationModelStatus.state === "ready" && "Ready for dictation."}
                      {dictationModelStatus.state === "missing" && "Model not downloaded yet."}
                      {dictationModelStatus.state === "downloading" &&
                        "Downloading model..."}
                      {dictationModelStatus.state === "error" &&
                        (dictationModelStatus.error ?? "Download error.")}
                    </div>
                    {dictationProgress && (
                      <div className="settings-download-progress">
                        <div className="settings-download-bar">
                          <div
                            className="settings-download-fill"
                            style={{
                              width: dictationProgress.totalBytes
                                ? `${Math.min(
                                    100,
                                    (dictationProgress.downloadedBytes /
                                      dictationProgress.totalBytes) *
                                      100,
                                  )}%`
                                : "0%",
                            }}
                          />
                        </div>
                        <div className="settings-download-meta">
                          {formatDownloadSize(dictationProgress.downloadedBytes)}
                        </div>
                      </div>
                    )}
                    <div className="settings-field-actions">
                      {dictationModelStatus.state === "missing" && (
                        <button
                          type="button"
                          className="primary"
                          onClick={onDownloadDictationModel}
                          disabled={!onDownloadDictationModel}
                        >
                          Download model
                        </button>
                      )}
                      {dictationModelStatus.state === "downloading" && (
                        <button
                          type="button"
                          className="ghost settings-button-compact"
                          onClick={onCancelDictationDownload}
                          disabled={!onCancelDictationDownload}
                        >
                          Cancel download
                        </button>
                      )}
                      {dictationReady && (
                        <button
                          type="button"
                          className="ghost settings-button-compact"
                          onClick={onRemoveDictationModel}
                          disabled={!onRemoveDictationModel}
                        >
                          Remove model
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}
            {activeSection === "codex" && (
              <section className="settings-section">
                <div className="settings-section-title">Codex</div>
                <div className="settings-section-subtitle">
                  Configure the Codex CLI used by CodexMonitor and validate the install.
                </div>
                <div className="settings-field">
                  <label className="settings-field-label" htmlFor="codex-path">
                    Default Codex path
                  </label>
                  <div className="settings-field-row">
                    <input
                      id="codex-path"
                      className="settings-input"
                      value={codexPathDraft}
                      placeholder="codex"
                      onChange={(event) => setCodexPathDraft(event.target.value)}
                    />
                    <button type="button" className="ghost" onClick={handleBrowseCodex}>
                      Browse
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setCodexPathDraft("")}
                    >
                      Use PATH
                    </button>
                  </div>
                  <div className="settings-help">
                    Leave empty to use the system PATH resolution.
                  </div>
                <div className="settings-field-actions">
                  {codexDirty && (
                    <button
                      type="button"
                      className="primary"
                      onClick={handleSaveCodexSettings}
                      disabled={isSavingSettings}
                    >
                      {isSavingSettings ? "Saving..." : "Save"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="ghost settings-button-compact"
                    onClick={handleRunDoctor}
                    disabled={doctorState.status === "running"}
                  >
                    <Stethoscope aria-hidden />
                    {doctorState.status === "running" ? "Running..." : "Run doctor"}
                  </button>
                </div>

                {doctorState.result && (
                  <div
                    className={`settings-doctor ${doctorState.result.ok ? "ok" : "error"}`}
                  >
                    <div className="settings-doctor-title">
                      {doctorState.result.ok ? "Codex looks good" : "Codex issue detected"}
                    </div>
                    <div className="settings-doctor-body">
                      <div>
                        Version: {doctorState.result.version ?? "unknown"}
                      </div>
                      <div>
                        App-server: {doctorState.result.appServerOk ? "ok" : "failed"}
                      </div>
                      <div>
                        Node:{" "}
                        {doctorState.result.nodeOk
                          ? `ok (${doctorState.result.nodeVersion ?? "unknown"})`
                          : "missing"}
                      </div>
                      {doctorState.result.details && (
                        <div>{doctorState.result.details}</div>
                      )}
                      {doctorState.result.nodeDetails && (
                        <div>{doctorState.result.nodeDetails}</div>
                      )}
                      {doctorState.result.path && (
                        <div className="settings-doctor-path">
                          PATH: {doctorState.result.path}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

                <div className="settings-field">
                  <label className="settings-field-label" htmlFor="default-access">
                    Default access mode
                  </label>
                  <select
                    id="default-access"
                    className="settings-select"
                    value={appSettings.defaultAccessMode}
                    onChange={(event) =>
                      void onUpdateAppSettings({
                        ...appSettings,
                        defaultAccessMode: event.target.value as AppSettings["defaultAccessMode"],
                      })
                    }
                  >
                    <option value="read-only">Read only</option>
                    <option value="current">On-request</option>
                    <option value="full-access">Full access</option>
                  </select>
                </div>

                <div className="settings-field">
                  <div className="settings-field-label">Workspace overrides</div>
                  <div className="settings-overrides">
                    {projects.map((workspace) => (
                      <div key={workspace.id} className="settings-override-row">
                        <div className="settings-override-info">
                          <div className="settings-project-name">{workspace.name}</div>
                          <div className="settings-project-path">{workspace.path}</div>
                        </div>
                        <div className="settings-override-actions">
                          <input
                            className="settings-input settings-input--compact"
                            value={overrideDrafts[workspace.id] ?? ""}
                            placeholder="Use default"
                            onChange={(event) =>
                              setOverrideDrafts((prev) => ({
                                ...prev,
                                [workspace.id]: event.target.value,
                              }))
                            }
                            onBlur={async () => {
                              const draft = overrideDrafts[workspace.id] ?? "";
                              const nextValue = draft.trim() || null;
                              if (nextValue === (workspace.codex_bin ?? null)) {
                                return;
                              }
                              await onUpdateWorkspaceCodexBin(workspace.id, nextValue);
                            }}
                          />
                          <button
                            type="button"
                            className="ghost"
                            onClick={async () => {
                              setOverrideDrafts((prev) => ({
                                ...prev,
                                [workspace.id]: "",
                              }));
                              await onUpdateWorkspaceCodexBin(workspace.id, null);
                            }}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                    ))}
                    {projects.length === 0 && (
                      <div className="settings-empty">No projects yet.</div>
                    )}
                  </div>
                </div>

              </section>
            )}
            {activeSection === "experimental" && (
              <section className="settings-section">
                <div className="settings-section-title">Experimental</div>
                <div className="settings-section-subtitle">
                  Preview features that may change or be removed.
                </div>
                <div className="settings-toggle-row">
                  <div>
                    <div className="settings-toggle-title">Steer mode</div>
                    <div className="settings-toggle-subtitle">
                      Send messages immediately. Use Tab to queue while a run is active.
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`settings-toggle ${appSettings.experimentalSteerEnabled ? "on" : ""}`}
                    onClick={() =>
                      void onUpdateAppSettings({
                        ...appSettings,
                        experimentalSteerEnabled: !appSettings.experimentalSteerEnabled,
                      })
                    }
                    aria-pressed={appSettings.experimentalSteerEnabled}
                  >
                    <span className="settings-toggle-knob" />
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
