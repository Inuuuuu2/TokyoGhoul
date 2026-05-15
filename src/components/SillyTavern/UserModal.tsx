import { useState, useMemo, useEffect } from 'react';
import type { UserProfile } from '../../sillytavern/types';
import { useSillytavern } from '../../hooks/useSillytavern';

type DraftUser = UserProfile & { _variablesText: string };

function toDraft(u: UserProfile): DraftUser {
  return {
    ...u,
    _variablesText: u.initialVariables ? JSON.stringify(u.initialVariables, null, 2) : '',
  };
}

export function UserModal({ onClose }: { onClose: () => void }) {
  const { users, settings, addUser, updateUser, removeUser, switchUser } = useSillytavern();
  const activeUserId = settings?.activeUserId ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(activeUserId ?? users[0]?.id ?? null);
  const original = useMemo(() => users.find((u) => u.id === selectedId) ?? null, [users, selectedId]);
  const [draft, setDraft] = useState<DraftUser | null>(original ? toDraft(original) : null);
  const [varsError, setVarsError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(original ? toDraft(original) : null);
    setVarsError(null);
  }, [original?.id]);

  const dirty = useMemo(() => {
    if (!draft || !original) return false;
    if (draft.name !== original.name) return true;
    if ((draft.description ?? '') !== (original.description ?? '')) return true;
    const originalVars = original.initialVariables ? JSON.stringify(original.initialVariables) : '';
    const draftVars = (() => {
      try {
        return draft._variablesText.trim() ? JSON.stringify(JSON.parse(draft._variablesText)) : '';
      } catch {
        return '__INVALID__';
      }
    })();
    if (originalVars !== draftVars) return true;
    return false;
  }, [draft, original]);

  const tryClose = () => {
    if (dirty && !confirm('放弃未保存的修改?')) return;
    onClose();
  };

  const handleSave = async () => {
    if (!draft) return;
    let initialVariables: Record<string, string | number> | undefined = undefined;
    const txt = draft._variablesText.trim();
    if (txt) {
      try {
        const parsed = JSON.parse(txt);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          initialVariables = parsed;
        } else {
          setVarsError('必须是一个 JSON 对象');
          return;
        }
      } catch (e) {
        setVarsError('JSON 解析失败：' + (e as Error).message);
        return;
      }
    }
    setVarsError(null);
    const next: UserProfile = {
      id: draft.id,
      name: draft.name.trim() || '未命名用户',
      description: draft.description?.trim() ? draft.description : undefined,
      initialVariables,
      createdAt: draft.createdAt,
      updatedAt: Date.now(),
    };
    await updateUser(next);
  };

  const handleNew = async () => {
    const name = prompt('新用户名称', '新用户');
    if (!name) return;
    const u = await addUser({ name });
    setSelectedId(u.id);
  };

  const handleDelete = async () => {
    if (!draft) return;
    if (!confirm(`删除用户 "${draft.name}"?`)) return;
    await removeUser(draft.id);
    const remaining = users.filter((u) => u.id !== draft.id);
    setSelectedId(remaining[0]?.id ?? null);
  };

  const handleActivate = async () => {
    if (!draft) return;
    await switchUser(draft.id);
  };

  const handleSelectUser = (id: string) => {
    if (dirty && !confirm('当前用户有未保存修改，确定切换?')) return;
    setSelectedId(id);
  };

  return (
    <div
      onClick={tryClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          width: 'min(900px, 95vw)',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <strong>用户管理</strong>
          <button onClick={handleNew}>+ 新建用户</button>
          {draft && (
            <>
              <button onClick={handleActivate} disabled={activeUserId === draft.id}>
                {activeUserId === draft.id ? '当前已激活' : '设为激活'}
              </button>
              <button onClick={handleDelete} style={{ color: '#c00' }}>
                删除
              </button>
            </>
          )}
          <span style={{ flex: 1 }} />
          <button
            onClick={handleSave}
            disabled={!dirty || !draft}
            style={{
              padding: '6px 14px',
              background: dirty ? '#2c8' : '#bbb',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: dirty ? 'pointer' : 'not-allowed',
            }}
          >
            保存
          </button>
          <button onClick={tryClose}>×</button>
        </header>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <aside
            style={{
              width: 220,
              borderRight: '1px solid #eee',
              overflowY: 'auto',
              padding: 8,
            }}
          >
            {users.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: 24, fontSize: 13 }}>
                暂无用户。点上方 "+ 新建用户" 开始。
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {users.map((u) => (
                  <li
                    key={u.id}
                    onClick={() => handleSelectUser(u.id)}
                    style={{
                      padding: '6px 8px',
                      cursor: 'pointer',
                      background: u.id === selectedId ? '#e6f0ff' : 'transparent',
                      borderRadius: 4,
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={u.name}
                  >
                    {activeUserId === u.id ? '★ ' : ''}
                    {u.name}
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <main style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {!draft ? (
              <div style={{ textAlign: 'center', color: '#888', padding: 60 }}>
                选择左侧用户或新建一个
              </div>
            ) : (
              <>
                <label style={{ display: 'block', marginBottom: 12 }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
                    名称（会用作对话里 {'{{user}}'} 的展开值）
                  </span>
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    style={{ padding: 8, width: '100%', boxSizing: 'border-box' }}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
                    角色描述（作为 personaDescription 注入到 AI 上下文）
                  </span>
                  <textarea
                    value={draft.description ?? ''}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={8}
                    placeholder={'例：' + '\n姓名：金木研\n年龄：18\n身份：上井大学文学院新生，意外被嫁接喰种器官的"半喰种"……'}
                    style={{
                      padding: 8,
                      width: '100%',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      resize: 'vertical',
                    }}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: 12 }}>
                  <span style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>
                    初始变量（JSON 对象。新建对话时作为初始 variables 注入）
                  </span>
                  <textarea
                    value={draft._variablesText}
                    onChange={(e) => {
                      setDraft({ ...draft, _variablesText: e.target.value });
                      setVarsError(null);
                    }}
                    rows={8}
                    placeholder={'{\n  "hp": 100,\n  "rcLevel": 45,\n  "location": "20区"\n}'}
                    style={{
                      padding: 8,
                      width: '100%',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                      fontSize: 12,
                      resize: 'vertical',
                      borderColor: varsError ? '#c00' : undefined,
                    }}
                  />
                  {varsError && (
                    <div style={{ color: '#c00', fontSize: 12, marginTop: 4 }}>{varsError}</div>
                  )}
                </label>

                <div style={{ color: '#666', fontSize: 11, lineHeight: 1.6, marginTop: 8 }}>
                  <div>· 切换激活用户后，新建的对话默认使用该用户的名称与初始变量。</div>
                  <div>· 已存在的对话不会自动改名/改变量；如需调整，可在 VARS 面板中编辑。</div>
                  <div>· 角色描述会替换 preset 的 persona_description；留空则回退到 preset 的值。</div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
