import { useRef, useState } from 'react';
import { useSillytavern } from '../../hooks/useSillytavern';
import { isDisplayRule, isPromptRule } from '../../sillytavern/regex-engine';
import type { RegexScript } from '../../sillytavern/types';
import { X, Upload, Download, Trash2, Plus } from 'lucide-react';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
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
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          on ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function classifyRule(r: RegexScript): { label: string; color: string; effective: boolean } {
  if (isPromptRule(r)) {
    const placement = r.placement.includes(1) && r.placement.includes(2)
      ? 'U+A'
      : r.placement.includes(1)
      ? 'USER'
      : r.placement.includes(2)
      ? 'AI'
      : '?';
    return { label: `Prompt · ${placement}`, color: 'text-ghoul-red', effective: true };
  }
  if (isDisplayRule(r)) {
    return { label: 'Display', color: 'text-purple-300', effective: true };
  }
  return { label: '其它', color: 'text-ghoul-muted', effective: false };
}

export function RegexModal({ onClose }: { onClose: () => void }) {
  const { regexes, updateRegex, addRegex, removeRegex, importRegexes, showToast } = useSillytavern();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleImportClick = () => {
    console.log('[RegexModal] open file picker');
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    console.log('[RegexModal] handleFile called, file:', file);
    if (!file) {
      console.warn('[RegexModal] no file selected');
      return;
    }
    try {
      const text = await file.text();
      console.log('[RegexModal] file size:', text.length);
      const data = JSON.parse(text);
      console.log('[RegexModal] parsed, rules:', Array.isArray(data) ? data.length : 'NOT ARRAY');
      const n = await importRegexes(data);
      console.log('[RegexModal] imported', n);
      showToast(`已导入 ${n} 条正则脚本`);
    } catch (e) {
      console.error('[RegexModal] import error:', e);
      alert('导入失败：' + (e as Error).message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    if (regexes.length === 0) {
      showToast('当前没有正则脚本可导出');
      return;
    }
    const blob = new Blob([JSON.stringify(regexes, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regex-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('已导出');
  };

  const handleNew = async () => {
    const name = prompt('新建脚本名称', '新正则');
    if (!name) return;
    const r: RegexScript = {
      id: crypto.randomUUID(),
      scriptName: name,
      disabled: false,
      findRegex: '',
      replaceString: '',
      trimStrings: [],
      placement: [2],
      promptOnly: true,
      markdownOnly: false,
      minDepth: null,
      maxDepth: null,
    };
    const saved = await addRegex(r);
    setExpandedId(saved.id);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`删除正则 "${name}"?`)) return;
    await removeRegex(id);
    if (expandedId === id) setExpandedId(null);
  };

  const promptCount = regexes.filter((r) => !r.disabled && isPromptRule(r)).length;
  const displayCount = regexes.filter((r) => !r.disabled && isDisplayRule(r)).length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-ghoul-dark border border-ghoul-red/40 rounded-sm w-full max-w-[900px] h-[85vh] flex flex-col overflow-hidden shadow-2xl shadow-black/80"
      >
        {/* 隐藏 file 输入框必须在 stopPropagation 容器内，
            否则合成 click 会冒泡到 backdrop 把 modal 关掉。 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <header className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-[#222] bg-[#0a0a0c]">
          <span className="text-ghoul-red font-mono text-sm md:text-base">🔧</span>
          <h2 className="font-mono tracking-[0.3em] text-sm md:text-base text-ghoul-text">正则脚本</h2>
          <span className="text-[10px] font-mono text-ghoul-muted">
            生效 Prompt: {promptCount} · Display: {displayCount}
          </span>
          <span className="flex-1" />
          <button
            onClick={handleNew}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-ghoul-red/60 text-ghoul-red hover:bg-ghoul-red hover:text-white transition-colors rounded-sm"
          >
            <Plus className="w-3 h-3" /> 新建
          </button>
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-purple-400/60 text-purple-300 hover:bg-purple-500 hover:text-white transition-colors rounded-sm"
          >
            <Upload className="w-3 h-3" /> 导入
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-purple-400/60 text-purple-300 hover:bg-purple-500 hover:text-white transition-colors rounded-sm"
          >
            <Download className="w-3 h-3" /> 导出
          </button>
          <button
            onClick={onClose}
            className="text-ghoul-muted hover:text-ghoul-red transition-colors p-1"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
          {regexes.length === 0 && (
            <div className="text-center text-ghoul-muted text-sm font-mono py-20">
              暂无正则脚本。点上方 "导入" 加载 SillyTavern 正则 JSON。
            </div>
          )}
          {regexes.map((r) => {
            const enabled = !r.disabled;
            const meta = classifyRule(r);
            const isExpanded = expandedId === r.id;
            return (
              <div
                key={r.id}
                className={`border rounded-sm ${
                  isExpanded
                    ? 'border-ghoul-red/60 bg-[#0d0d0e]'
                    : 'border-[#222] bg-[#0a0a0c] hover:border-[#444]'
                }`}
              >
                <div
                  className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                >
                  <span className="flex-1 truncate text-sm font-mono text-ghoul-text">
                    {r.scriptName}
                  </span>
                  <span className={`text-[10px] font-mono ${meta.color} whitespace-nowrap`}>
                    {meta.label}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(r.id, r.scriptName);
                    }}
                    className="text-red-400 hover:text-red-200 transition-colors p-1"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <Toggle
                    on={enabled}
                    onChange={(v) => updateRegex({ ...r, disabled: !v })}
                  />
                </div>
                {isExpanded && (
                  <div className="border-t border-[#222] p-3 space-y-3 text-xs font-mono">
                    <Field label="脚本名称">
                      <input
                        type="text"
                        value={r.scriptName}
                        onChange={(e) => updateRegex({ ...r, scriptName: e.target.value })}
                        className="w-full px-2 py-1.5 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors"
                      />
                    </Field>
                    <Field label="findRegex">
                      <textarea
                        value={r.findRegex}
                        onChange={(e) => updateRegex({ ...r, findRegex: e.target.value })}
                        rows={3}
                        placeholder="/pattern/flags  或  bare pattern"
                        className="w-full px-2 py-1.5 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors resize-y"
                      />
                    </Field>
                    <Field label="replaceString">
                      <textarea
                        value={r.replaceString}
                        onChange={(e) => updateRegex({ ...r, replaceString: e.target.value })}
                        rows={2}
                        className="w-full px-2 py-1.5 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors resize-y"
                      />
                    </Field>
                    <Field label="trimStrings（每行一个，去除后再做匹配）">
                      <textarea
                        value={(r.trimStrings ?? []).join('\n')}
                        onChange={(e) =>
                          updateRegex({
                            ...r,
                            trimStrings: e.target.value
                              .split(/\r?\n/)
                              .map((s) => s)
                              .filter((s) => s.length > 0),
                          })
                        }
                        rows={3}
                        className="w-full px-2 py-1.5 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors resize-y"
                      />
                    </Field>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <label className="flex items-center gap-2 text-ghoul-muted">
                        <input
                          type="checkbox"
                          checked={r.placement?.includes(1) ?? false}
                          onChange={(e) => {
                            const set = new Set(r.placement ?? []);
                            if (e.target.checked) set.add(1);
                            else set.delete(1);
                            updateRegex({ ...r, placement: Array.from(set).sort() });
                          }}
                        />
                        <span>USER (1)</span>
                      </label>
                      <label className="flex items-center gap-2 text-ghoul-muted">
                        <input
                          type="checkbox"
                          checked={r.placement?.includes(2) ?? false}
                          onChange={(e) => {
                            const set = new Set(r.placement ?? []);
                            if (e.target.checked) set.add(2);
                            else set.delete(2);
                            updateRegex({ ...r, placement: Array.from(set).sort() });
                          }}
                        />
                        <span>AI (2)</span>
                      </label>
                      <label className="flex items-center gap-2 text-ghoul-muted">
                        <input
                          type="checkbox"
                          checked={!!r.promptOnly}
                          onChange={(e) => updateRegex({ ...r, promptOnly: e.target.checked })}
                        />
                        <span>promptOnly</span>
                      </label>
                      <label className="flex items-center gap-2 text-ghoul-muted">
                        <input
                          type="checkbox"
                          checked={!!r.markdownOnly}
                          onChange={(e) => updateRegex({ ...r, markdownOnly: e.target.checked })}
                        />
                        <span>markdownOnly</span>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="minDepth（留空 = 不限）">
                        <input
                          type="number"
                          value={r.minDepth ?? ''}
                          onChange={(e) =>
                            updateRegex({
                              ...r,
                              minDepth: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors"
                        />
                      </Field>
                      <Field label="maxDepth（留空 = 不限）">
                        <input
                          type="number"
                          value={r.maxDepth ?? ''}
                          onChange={(e) =>
                            updateRegex({
                              ...r,
                              maxDepth: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          className="w-full px-2 py-1.5 bg-[#0a0a0c] border border-[#333] focus:border-ghoul-red outline-none text-xs text-ghoul-text rounded-sm transition-colors"
                        />
                      </Field>
                    </div>
                    {!meta.effective && (
                      <div className="text-[11px] text-yellow-500/80 leading-relaxed">
                        ⚠ 当前规则既不是 Prompt 类也不是 Display 类（placement 或开关未勾选），
                        请检查 promptOnly / markdownOnly / placement 设置。
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-ghoul-muted mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
