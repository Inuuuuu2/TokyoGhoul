import { useState, useMemo, useEffect, useRef } from 'react';
import type { ChatPreset } from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';
import { movePromptItem } from '../../sillytavern/editor-utils';
import { Settings, X, Upload, Download, Trash2, Plus, ChevronRight } from 'lucide-react';

const TABS = ['basic', 'prompts', 'params'] as const;
type Tab = typeof TABS[number];
const TAB_LABELS: Record<Tab, string> = {
  basic: '基本信息',
  prompts: '提示词块',
  params: '生成参数',
};

const CONTEXT_OPTIONS = [
  2048, 4096, 8192, 16384, 32768, 65536, 131072, 200000, 1000000, 2000000,
];

interface PromptItem {
  identifier: string;
  name?: string;
  role?: 'system' | 'user' | 'assistant';
  content?: string;
  enabled?: boolean;
}

interface OrderItem {
  identifier: string;
  name?: string;
  role?: 'system' | 'user' | 'assistant';
  enabled?: boolean;
}

/* ─────────── 子部件 ─────────── */

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-[13px] font-mono text-ghoul-text">{label}: <span className="text-ghoul-red">{value}</span></span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-ghoul-red"
      />
      {hint && <div className="text-[10px] text-ghoul-muted mt-1 font-mono">{hint}</div>}
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        on ? 'bg-ghoul-red' : 'bg-[#333]'
      }`}
      title={on ? '已启用' : '已禁用'}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          on ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

/* ─────────── 主组件 ─────────── */

export function PresetModal({ onClose }: { onClose: () => void }) {
  const {
    presets,
    settings,
    updateSettings,
    updatePreset,
    deletePreset,
    addPreset,
    addPresetFromDefault,
    showToast,
  } = useSillytavern();

  const [selectedId, setSelectedId] = useState<string | null>(
    settings?.activePresetId ?? presets[0]?.id ?? null,
  );
  const original = useMemo(
    () => presets.find((p) => p.id === selectedId) ?? null,
    [presets, selectedId],
  );
  const [draft, setDraft] = useState<ChatPreset | null>(original);
  const [tab, setTab] = useState<Tab>('basic');
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(original);
    setExpandedPromptId(null);
  }, [original?.id]);

  const dirty = useMemo(() => {
    if (!draft || !original) return false;
    return (
      draft.name !== original.name ||
      (draft.description ?? '') !== (original.description ?? '') ||
      JSON.stringify(draft.settings) !== JSON.stringify(original.settings)
    );
  }, [draft, original]);

  const patchSettings = (patch: Record<string, any>) => {
    if (!draft) return;
    setDraft({ ...draft, settings: { ...draft.settings, ...patch } });
  };

  const promptOrder = useMemo<OrderItem[]>(
    () => (draft?.settings.prompt_order ?? []) as OrderItem[],
    [draft],
  );
  const prompts = useMemo<PromptItem[]>(
    () => (draft?.settings.prompts ?? []) as PromptItem[],
    [draft],
  );

  const tryClose = () => {
    if (dirty && !confirm('放弃未保存的修改?')) return;
    onClose();
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      await updatePreset(draft);
      showToast('已保存');
    } catch (e) {
      alert('保存失败: ' + (e as Error).message);
    }
  };

  const handleSelectPreset = (id: string) => {
    if (dirty && !confirm('当前预设有未保存修改,确定切换?')) return;
    setSelectedId(id);
  };

  const handleActivate = async () => {
    if (!draft) return;
    await updateSettings({ activePresetId: draft.id });
    showToast(`已激活 ${draft.name}`);
  };

  const handleNew = async () => {
    const name = prompt('新预设名称', `新预设 ${new Date().toLocaleTimeString()}`);
    if (!name) return;
    const p = await addPresetFromDefault(name);
    setSelectedId(p.id);
  };

  const handleDelete = async () => {
    if (!draft) return;
    if (!confirm(`删除预设 "${draft.name}"?`)) return;
    await deletePreset(draft.id);
    const remaining = presets.filter((p) => p.id !== draft.id);
    setSelectedId(remaining[0]?.id ?? null);
  };

  const handleExport = () => {
    if (!draft) return;
    const json = { ...draft, _exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preset-${draft.name.replace(/[^\w一-龥]+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('已导出');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      // 接受两种格式：完整 ChatPreset 对象 或 裸 SillyTavern preset settings 对象
      let preset: ChatPreset;
      if (data && typeof data === 'object' && 'settings' in data && 'name' in data) {
        preset = {
          id: crypto.randomUUID(),
          name: String(data.name) || '导入的预设',
          description: typeof data.description === 'string' ? data.description : undefined,
          settings: data.settings,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else if (data && typeof data === 'object') {
        preset = {
          id: crypto.randomUUID(),
          name: file.name.replace(/\.json$/i, ''),
          description: undefined,
          settings: data,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else {
        throw new Error('不是有效的 JSON 对象');
      }
      await addPreset(preset);
      setSelectedId(preset.id);
      showToast(`已导入 ${preset.name}`);
    } catch (e) {
      alert('导入失败: ' + (e as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ─── 提示词块 操作 ─── */
  const setBlockEnabled = (idx: number, enabled: boolean) => {
    const next = promptOrder.slice();
    next[idx] = { ...next[idx], enabled };
    patchSettings({ prompt_order: next });
  };

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const next = movePromptItem(promptOrder, idx, idx + dir);
    if (next !== promptOrder) patchSettings({ prompt_order: next });
  };

  const deleteBlock = (idx: number) => {
    const item = promptOrder[idx];
    if (!confirm(`删除 "${item.name ?? item.identifier}" 这一条?`)) return;
    const nextOrder = promptOrder.filter((_, i) => i !== idx);
    const nextPrompts = prompts.filter((p) => p.identifier !== item.identifier);
    patchSettings({ prompt_order: nextOrder, prompts: nextPrompts });
    if (expandedPromptId === item.identifier) setExpandedPromptId(null);
  };

  const addNewBlock = () => {
    const name = prompt('新提示词块名称', '新条目');
    if (!name) return;
    const id = 'custom_' + Date.now().toString(36);
    patchSettings({
      prompt_order: [...promptOrder, { identifier: id, name, role: 'system', enabled: true }],
      prompts: [...prompts, { identifier: id, name, role: 'system', content: '' }],
    });
    setExpandedPromptId(id);
  };

  const updateBlockContent = (identifier: string, content: string) => {
    const idx = prompts.findIndex((p) => p.identifier === identifier);
    if (idx < 0) {
      // 内建条目（main / charDescription 等）：写入对应的 preset.settings 字段
      patchSettings({ [identifier]: content });
      return;
    }
    const next = prompts.slice();
    next[idx] = { ...next[idx], content };
    patchSettings({ prompts: next });
  };

  const updateBlockRole = (identifier: string, role: 'system' | 'user' | 'assistant') => {
    const idx = prompts.findIndex((p) => p.identifier === identifier);
    if (idx < 0) return;
    const next = prompts.slice();
    next[idx] = { ...next[idx], role };
    patchSettings({ prompts: next });
    const orderIdx = promptOrder.findIndex((o) => o.identifier === identifier);
    if (orderIdx >= 0) {
      const nextOrder = promptOrder.slice();
      nextOrder[orderIdx] = { ...nextOrder[orderIdx], role };
      patchSettings({ prompt_order: nextOrder });
    }
  };

  const updateBlockName = (identifier: string, name: string) => {
    const idx = prompts.findIndex((p) => p.identifier === identifier);
    if (idx >= 0) {
      const next = prompts.slice();
      next[idx] = { ...next[idx], name };
      patchSettings({ prompts: next });
    }
    const orderIdx = promptOrder.findIndex((o) => o.identifier === identifier);
    if (orderIdx >= 0) {
      const nextOrder = promptOrder.slice();
      nextOrder[orderIdx] = { ...nextOrder[orderIdx], name };
      patchSettings({ prompt_order: nextOrder });
    }
  };

  /* ─── 渲染 ─── */

  const activeId = settings?.activePresetId ?? null;

  return (
    <div
      onClick={tryClose}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => handleImportFile(e.target.files?.[0])}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ghoul-dark border border-ghoul-red/40 rounded-sm w-full max-w-[1100px] h-[88vh] flex flex-col overflow-hidden shadow-2xl shadow-black/80"
      >
        {/* 顶部标题栏 */}
        <header className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-[#222] bg-[#0a0a0c]">
          <Settings className="w-4 h-4 md:w-5 md:h-5 text-ghoul-red" />
          <h2 className="font-mono tracking-[0.3em] text-sm md:text-base text-ghoul-text">预设管理</h2>
          <span className="flex-1" />
          <button
            onClick={tryClose}
            className="text-ghoul-muted hover:text-ghoul-red transition-colors p-1"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 flex min-h-0">
          {/* 左侧：预设列表 */}
          <aside className="w-[220px] md:w-[260px] flex-shrink-0 border-r border-[#222] bg-[#070708] flex flex-col">
            <div className="p-3 flex gap-2 border-b border-[#222]">
              <button
                onClick={handleNew}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-mono border border-ghoul-red/60 text-ghoul-red hover:bg-ghoul-red hover:text-white transition-colors rounded-sm"
              >
                <Plus className="w-3 h-3" /> 新建预设
              </button>
              <button
                onClick={handleImportClick}
                className="px-3 py-1.5 text-xs font-mono border border-purple-400/60 text-purple-300 hover:bg-purple-500 hover:text-white transition-colors rounded-sm"
                title="从 JSON 文件导入"
              >
                <Upload className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {presets.length === 0 && (
                <div className="text-center text-ghoul-muted text-xs py-8 font-mono">
                  暂无预设
                </div>
              )}
              {presets.map((p) => {
                const isSelected = p.id === selectedId;
                const isActive = p.id === activeId;
                const temp = p.settings?.temp_openai ?? p.settings?.temperature ?? '?';
                const maxTok = p.settings?.openai_max_tokens ?? p.settings?.max_tokens ?? '?';
                const blockCount = Array.isArray(p.settings?.prompt_order)
                  ? p.settings.prompt_order.length
                  : Array.isArray(p.settings?.prompts)
                  ? p.settings.prompts.length
                  : 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`w-full text-left p-2.5 rounded-sm border transition-all ${
                      isSelected
                        ? 'border-ghoul-red bg-ghoul-red/10 shadow-inner shadow-ghoul-red/20'
                        : 'border-[#222] bg-[#0d0d0e] hover:border-[#444]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex-1 truncate text-sm font-mono text-ghoul-text">
                        {p.name}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-ghoul-red text-white tracking-wider font-mono">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-ghoul-muted mt-1 truncate">
                      T:{temp} · Max:{maxTok} · {blockCount} 块
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* 右侧：详情 */}
          <main className="flex-1 flex flex-col min-w-0">
            {!draft ? (
              <div className="flex-1 flex items-center justify-center text-ghoul-muted text-sm font-mono">
                请在左侧选择或新建一个预设
              </div>
            ) : (
              <>
                {/* 详情头部 */}
                <div className="px-4 md:px-6 py-3 border-b border-[#222] bg-[#0a0a0c] flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-base md:text-lg font-mono tracking-wider text-ghoul-red truncate">
                      {draft.name}
                    </div>
                    <div className="text-xs text-ghoul-muted truncate">
                      {draft.description?.trim() || '无描述'}
                    </div>
                  </div>
                  <button
                    onClick={handleActivate}
                    disabled={activeId === draft.id}
                    className="px-3 py-1.5 text-xs font-mono border border-ghoul-red/60 text-ghoul-red hover:bg-ghoul-red hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ghoul-red disabled:cursor-not-allowed transition-colors rounded-sm whitespace-nowrap"
                  >
                    {activeId === draft.id ? '当前已激活' : '设为当前'}
                  </button>
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 text-xs font-mono border border-purple-400/60 text-purple-300 hover:bg-purple-500 hover:text-white transition-colors rounded-sm flex items-center gap-1"
                    title="导出为 JSON"
                  >
                    <Download className="w-3 h-3" /> 导出
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1.5 text-xs font-mono border border-red-700/60 text-red-400 hover:bg-red-700 hover:text-white transition-colors rounded-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> 删除
                  </button>
                </div>

                {/* Tab 栏 */}
                <div className="flex gap-1 px-4 md:px-6 pt-3 border-b border-[#222]">
                  {TABS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-1.5 text-xs md:text-sm font-mono tracking-wider rounded-t-sm border-b-2 transition-all ${
                        tab === t
                          ? 'text-ghoul-red border-ghoul-red bg-ghoul-red/5'
                          : 'text-ghoul-muted border-transparent hover:text-ghoul-text'
                      }`}
                    >
                      {TAB_LABELS[t]}
                    </button>
                  ))}
                </div>

                {/* Tab 内容 */}
                <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
                  {tab === 'basic' && (
                    <div className="space-y-5 max-w-2xl">
                      <Field label="预设名称">
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                          className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-sm text-ghoul-text rounded-sm transition-colors"
                        />
                      </Field>

                      <Field label="描述">
                        <input
                          type="text"
                          value={draft.description ?? ''}
                          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                          placeholder="简短描述这个预设的用途"
                          className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-sm text-ghoul-text rounded-sm transition-colors placeholder:text-ghoul-muted/50"
                        />
                      </Field>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="上下文长度 (Context)">
                          <select
                            value={draft.settings.openai_max_context ?? 4096}
                            onChange={(e) =>
                              patchSettings({ openai_max_context: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-sm text-ghoul-text rounded-sm transition-colors"
                          >
                            {CONTEXT_OPTIONS.map((n) => (
                              <option key={n} value={n} className="bg-ghoul-dark">
                                {n.toLocaleString()}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="模型覆盖（可选）">
                          <input
                            type="text"
                            value={draft.settings.openai_model ?? ''}
                            onChange={(e) => patchSettings({ openai_model: e.target.value })}
                            placeholder="留空使用全局模型"
                            className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-sm text-ghoul-text rounded-sm transition-colors placeholder:text-ghoul-muted/50"
                          />
                        </Field>
                      </div>

                      <button
                        onClick={handleSave}
                        disabled={!dirty}
                        className="px-5 py-2 text-sm font-mono border border-ghoul-red/60 text-ghoul-red hover:bg-ghoul-red hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ghoul-red disabled:cursor-not-allowed transition-colors rounded-sm"
                      >
                        保存修改
                      </button>
                    </div>
                  )}

                  {tab === 'prompts' && (
                    <div className="space-y-3">
                      <div className="text-xs text-ghoul-muted font-mono">
                        提示词块按顺序组装成最终发送给 AI 的消息。点击条目展开详情。共 {promptOrder.length} 块。
                      </div>
                      {promptOrder.map((item, idx) => {
                        const promptDef = prompts.find((p) => p.identifier === item.identifier);
                        const name = promptDef?.name || item.name || item.identifier;
                        const enabled = item.enabled !== false;
                        const isExpanded = expandedPromptId === item.identifier;
                        const builtinContent =
                          !promptDef && typeof draft.settings[item.identifier] === 'string'
                            ? (draft.settings[item.identifier] as string)
                            : undefined;
                        const role = promptDef?.role ?? item.role ?? 'system';
                        return (
                          <div
                            key={item.identifier}
                            className={`border rounded-sm transition-colors ${
                              isExpanded
                                ? 'border-ghoul-red/60 bg-[#0d0d0e]'
                                : 'border-[#222] bg-[#0a0a0c] hover:border-[#444]'
                            }`}
                          >
                            <div
                              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                              onClick={() =>
                                setExpandedPromptId(isExpanded ? null : item.identifier)
                              }
                            >
                              <ChevronRight
                                className={`w-3.5 h-3.5 text-ghoul-red transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                              />
                              <span className="flex-1 truncate text-sm font-mono text-ghoul-text">
                                {name}
                              </span>
                              <span className="text-[10px] font-mono text-ghoul-muted/70 hidden md:inline">
                                {role}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteBlock(idx);
                                }}
                                className="text-red-400 hover:text-red-200 transition-colors p-1"
                                title="删除"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <Toggle on={enabled} onChange={(v) => setBlockEnabled(idx, v)} />
                            </div>
                            {isExpanded && (
                              <div className="border-t border-[#222] p-3 space-y-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => moveBlock(idx, -1)}
                                    disabled={idx === 0}
                                    className="px-2 py-1 text-xs border border-[#333] text-ghoul-muted hover:text-ghoul-red hover:border-ghoul-red disabled:opacity-30 disabled:cursor-not-allowed rounded-sm transition-colors"
                                    title="上移"
                                  >
                                    ↑
                                  </button>
                                  <button
                                    onClick={() => moveBlock(idx, 1)}
                                    disabled={idx === promptOrder.length - 1}
                                    className="px-2 py-1 text-xs border border-[#333] text-ghoul-muted hover:text-ghoul-red hover:border-ghoul-red disabled:opacity-30 disabled:cursor-not-allowed rounded-sm transition-colors"
                                    title="下移"
                                  >
                                    ↓
                                  </button>
                                  <span className="flex-1" />
                                  <code className="text-[10px] text-ghoul-muted/60 font-mono truncate max-w-[200px]">
                                    {item.identifier}
                                  </code>
                                </div>

                                <Field label="名称" inline>
                                  <input
                                    type="text"
                                    value={promptDef?.name ?? item.name ?? ''}
                                    onChange={(e) =>
                                      updateBlockName(item.identifier, e.target.value)
                                    }
                                    className="w-full px-2 py-1.5 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors"
                                  />
                                </Field>

                                <Field label="角色" inline>
                                  <select
                                    value={role}
                                    onChange={(e) =>
                                      updateBlockRole(
                                        item.identifier,
                                        e.target.value as 'system' | 'user' | 'assistant',
                                      )
                                    }
                                    className="w-full px-2 py-1.5 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors"
                                  >
                                    <option value="system" className="bg-ghoul-dark">
                                      system
                                    </option>
                                    <option value="user" className="bg-ghoul-dark">
                                      user
                                    </option>
                                    <option value="assistant" className="bg-ghoul-dark">
                                      assistant
                                    </option>
                                  </select>
                                </Field>

                                <Field label="内容">
                                  <textarea
                                    value={
                                      promptDef ? promptDef.content ?? '' : builtinContent ?? ''
                                    }
                                    onChange={(e) =>
                                      updateBlockContent(item.identifier, e.target.value)
                                    }
                                    rows={10}
                                    placeholder={
                                      !promptDef && builtinContent === undefined
                                        ? '（系统内建条目，内容由其他字段决定）'
                                        : '在这里填写本条提示词的内容…'
                                    }
                                    className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors font-mono resize-y placeholder:text-ghoul-muted/40"
                                  />
                                </Field>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button
                        onClick={addNewBlock}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-[#333] hover:border-ghoul-red text-ghoul-muted hover:text-ghoul-red transition-colors rounded-sm text-sm font-mono"
                      >
                        <Plus className="w-4 h-4" /> 新增提示词块
                      </button>

                      <div className="pt-3">
                        <button
                          onClick={handleSave}
                          disabled={!dirty}
                          className="px-5 py-2 text-sm font-mono border border-ghoul-red/60 text-ghoul-red hover:bg-ghoul-red hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ghoul-red disabled:cursor-not-allowed transition-colors rounded-sm"
                        >
                          保存修改
                        </button>
                      </div>
                    </div>
                  )}

                  {tab === 'params' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 max-w-3xl">
                      <Slider
                        label="Temperature"
                        value={Number(draft.settings.temp_openai ?? 1)}
                        onChange={(v) => patchSettings({ temp_openai: v })}
                        min={0}
                        max={2}
                        step={0.05}
                        hint="越低越保守，越高越创意"
                      />
                      <Slider
                        label="Max Tokens"
                        value={Number(draft.settings.openai_max_tokens ?? 2048)}
                        onChange={(v) => patchSettings({ openai_max_tokens: v })}
                        min={64}
                        max={32768}
                        step={64}
                      />
                      <Slider
                        label="Top P"
                        value={Number(draft.settings.top_p_openai ?? 0.95)}
                        onChange={(v) => patchSettings({ top_p_openai: v })}
                        min={0}
                        max={1}
                        step={0.01}
                      />
                      <Slider
                        label="Frequency Penalty"
                        value={Number(draft.settings.freq_pen_openai ?? 0)}
                        onChange={(v) => patchSettings({ freq_pen_openai: v })}
                        min={-2}
                        max={2}
                        step={0.05}
                      />
                      <Slider
                        label="Presence Penalty"
                        value={Number(draft.settings.pres_pen_openai ?? 0)}
                        onChange={(v) => patchSettings({ pres_pen_openai: v })}
                        min={-2}
                        max={2}
                        step={0.05}
                      />
                      <Slider
                        label="Top K"
                        value={Number(draft.settings.top_k_openai ?? 0)}
                        onChange={(v) => patchSettings({ top_k_openai: v })}
                        min={0}
                        max={200}
                        step={1}
                      />

                      <div className="md:col-span-2 pt-2">
                        <button
                          onClick={handleSave}
                          disabled={!dirty}
                          className="px-5 py-2 text-sm font-mono border border-ghoul-red/60 text-ghoul-red hover:bg-ghoul-red hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ghoul-red disabled:cursor-not-allowed transition-colors rounded-sm"
                        >
                          保存修改
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  inline,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <label className={inline ? 'block' : 'block'}>
      <span className="block text-[11px] font-mono uppercase tracking-wider text-ghoul-muted mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
