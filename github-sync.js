/* Private GitHub snapshots. No credentials are written to GitHub or backups. */
'use strict';
const GitHubSync = (() => {
  const KEY = 'cuotiben.github.v1';
  let token = '', busy = false;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const save = c => localStorage.setItem(KEY, JSON.stringify(c));
  const encode = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192)); return btoa(s); };
  const decode = s => Uint8Array.from(atob(s.replace(/\s/g, '')), c => c.charCodeAt(0));
  const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), x => x.toString(16).padStart(2, '0')).join('');
  const status = text => { const el = document.getElementById('githubStatus'); if (el) el.textContent = text; };
  function form() {
    const repo = document.getElementById('githubRepo').value.trim();
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw Error('仓库请填写为 用户名/私有仓库名');
    token = document.getElementById('githubToken').value.trim() || token;
    if (!token) throw Error('请填写专用于数据仓库的 GitHub 令牌');
    const old = read(); return { repo, branch: old.repo === repo ? old.branch : undefined, seen: old.repo === repo ? old.seen : undefined };
  }
  async function api(c, path, options = {}) {
    const {allowMissing, ...requestOptions} = options;
    const response = await fetch(`https://api.github.com/repos/${c.repo}${path}`, {
      ...requestOptions, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(options.body ? { 'Content-Type': 'application/json' } : {}) }
    });
    if (response.status === 404 && allowMissing) return null;
    if (!response.ok) {
      const messages = {401:'令牌无效或已过期',403:'权限不足或 GitHub 请求额度受限',404:'仓库不存在、分支不存在，或令牌没有访问权限',409:'仓库为空或版本冲突，请先初始化仓库',422:'远端已更新或请求被拒绝，请先下载远端版本再重试'};
      throw Error(messages[response.status] || `GitHub 请求失败（${response.status}）`);
    }
    return response.json();
  }
  async function connect(c) {
    if (S.cloud) throw Error('请在独立网页中使用 GitHub 同步');
    if (!S.idb) throw Error('浏览器本地存储不可用，请使用普通浏览窗口');
    const repo = await api(c, '');
    if (!repo.private) throw Error('为保护记录和图片，只允许连接私有仓库');
    c.branch = repo.default_branch;
    await applySavedCorrections(c);
    return api(c, `/git/ref/heads/${encodeURIComponent(c.branch)}`);
  }
  async function applySavedCorrections(c) {
    const file = await api(c, `/contents/cuotiben-corrections.json?ref=${encodeURIComponent(c.branch)}`, {allowMissing:true});
    if (!file) return false;
    const patch = JSON.parse(new TextDecoder().decode(decode(file.content)));
    return applyDataCorrections(patch);
  }
  async function corrections() {
    const c=form(); await connect(c); render(); status('云端用时与模块修订已核对并应用，作答与图片保留');
  }
  async function remote(c, head) {
    const commit = await api(c, `/git/commits/${head}`);
    const tree = await api(c, `/git/trees/${commit.tree.sha}`);
    const entry = tree.tree.find(x => x.path === 'cuotiben-data.json');
    if (!entry) return { manifest: null, sha: null, tree: commit.tree.sha };
    const blob = await api(c, `/git/blobs/${entry.sha}`);
    const manifest = JSON.parse(new TextDecoder().decode(decode(blob.content)));
    if (manifest.format !== 'cuotiben-github-v1' || !Array.isArray(manifest.parts) || !/^[a-f0-9]{64}$/.test(manifest.digest)) throw Error('远端数据格式无效');
    return { manifest, sha: entry.sha, tree: commit.tree.sha };
  }
  async function snapshot() {
    if (WQ.running || WQ.list.length || (typeof P !== 'undefined' && P && document.querySelector('.prac'))) throw Error('请先退出做题界面，并等待本地保存完成');
    await regradeCompletedAttempts();
    const collections = Object.fromEntries(await Promise.all(COLS.map(async col => [col, await dbAll(col)])));
    const images = {};
    const keys = await idbReq('blobs', 'readonly', s => s.getAllKeys());
    const refs = new Set(keys.map(k => 'i:' + k));
    function visit(v) { if (typeof v === 'string' && /^[ia]:[^\s]+$/.test(v)) refs.add(v); else if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === 'object') Object.values(v).forEach(visit); }
    visit(collections);
    for (const ref of refs) {
      const blob = await loadBlob(ref); if (!blob) throw Error('图片无法读取，已停止上传以免生成不完整备份');
      images[ref] = { type: blob.type, data: encode(new Uint8Array(await blob.arrayBuffer())) };
    }
    return { format: 'cuotiben-snapshot-v1', createdAt: new Date().toISOString(), collections, images };
  }
  async function upload() {
    const c = form(), ref = await connect(c), head = ref.object.sha, state = await remote(c, head);
    if (state.sha !== (c.seen || null)) throw Error('远端已有未读取的数据。请先下载远端版本；若本机也有记录，请先导出备份以便合并');
    const bytes = new TextEncoder().encode(JSON.stringify(await snapshot()));
    const entries = [], parts = [];
    const batch = crypto.randomUUID();
    for (let i = 0; i < bytes.length; i += 384 * 1024) {
      status(`上传数据和图片：${Math.min(100, Math.round(i / bytes.length * 100))}%`);
      const blob = await api(c, '/git/blobs', { method:'POST', body:JSON.stringify({content:encode(bytes.subarray(i, i + 384 * 1024)), encoding:'base64'}) });
      const path = `cuotiben-snapshots/${batch}/${parts.length}.bin`;
      parts.push(blob.sha); entries.push({path, mode:'100644', type:'blob', sha:blob.sha});
    }
    const manifest = {format:'cuotiben-github-v1', createdAt:new Date().toISOString(), bytes:bytes.length, digest:await hash(bytes), parts};
    const mb = await api(c, '/git/blobs', {method:'POST',body:JSON.stringify({content:JSON.stringify(manifest),encoding:'utf-8'})});
    entries.push({path:'cuotiben-data.json',mode:'100644',type:'blob',sha:mb.sha});
    const tree = await api(c, '/git/trees', {method:'POST',body:JSON.stringify({base_tree:state.tree,tree:entries})});
    const commit = await api(c, '/git/commits', {method:'POST',body:JSON.stringify({message:'保存错题本私人快照',tree:tree.sha,parents:[head]})});
    // A concurrent commit makes this non-fast-forward update fail; never force-push.
    await api(c, `/git/refs/heads/${encodeURIComponent(c.branch)}`, {method:'PATCH',body:JSON.stringify({sha:commit.sha,force:false})});
    save({...c,seen:mb.sha,lastSaved:manifest.createdAt});
    status('已完整保存到 GitHub 私有仓库：' + new Date(manifest.createdAt).toLocaleString());
  }
  async function download() {
    const c = form(), ref = await connect(c), state = await remote(c, ref.object.sha);
    if (!state.manifest) throw Error('该仓库尚未保存错题本数据，请先从有记录的设备上传');
    const chunks = [];
    for (let i = 0; i < state.manifest.parts.length; i++) {
      const sha = state.manifest.parts[i]; if (!/^[a-f0-9]{40}$/.test(sha)) throw Error('远端分块无效');
      status(`下载数据和图片：${i + 1}/${state.manifest.parts.length}`);
      chunks.push(decode((await api(c, `/git/blobs/${sha}`)).content));
    }
    const length = chunks.reduce((n, x) => n + x.length, 0), bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (length !== state.manifest.bytes || await hash(bytes) !== state.manifest.digest) throw Error('数据校验失败，未修改本机记录');
    const data = JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(bytes));
    await restore(data); await applySavedCorrections(c);
    save({...c,seen:state.sha,lastSaved:state.manifest.createdAt}); render(); status('已恢复全部记录和图片');
  }
  async function restore(data) {
    if (data.format !== 'cuotiben-snapshot-v1' || !data.collections || !data.images) throw Error('备份格式无效');
    for (const col of COLS) if (!Array.isArray(data.collections[col]) || data.collections[col].some(x => !x || typeof x.id !== 'string')) throw Error('记录格式无效');
    const blobs = Object.entries(data.images).map(([key, value]) => {
      if (!/^i:/.test(key)) throw Error('该快照包含无法恢复的云端图片');
      return [key.slice(2),new Blob([decode(value.data)], {type:value.type})];
    });
    if (!confirm('恢复会用备份替换本机所有记录和图片。请先导出本机完整备份。是否继续？')) throw Error('已取消，本机数据未变');
    if (WQ.running || WQ.list.length) throw Error('本地仍在保存，请稍后再试');
    // One transaction: a failed import leaves all original stores intact.
    await new Promise((resolve,reject) => {
      const tx = S.idb.transaction([...COLS,'blobs'],'readwrite');
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error || Error('恢复已中止')); tx.onerror = () => {};
      try { for (const col of COLS) { const store = tx.objectStore(col); store.clear(); for (const row of data.collections[col]) { const body = {...row}; delete body.id; store.put(body,row.id); } }
      const store = tx.objectStore('blobs'); store.clear(); for (const [key,blob] of blobs) store.put(blob,key);
      } catch(e) { tx.abort(); reject(e); }
    });
    S.urlCache.clear(); await loadData(); await regradeCompletedAttempts(); D.meta = Object.fromEntries((await dbAll('meta')).map(x => [x.id,x]));
    render();
  }
  async function exportAll() { await saveFile(`错题本完整备份-${Date.now()}.json`,JSON.stringify(await snapshot())); status('完整备份已导出，包含笔记、待办和所有图片'); }
  function card() {
    const c = read();
    return `<h2 class="section-title">GitHub 私人同步</h2><div class="card pad"><p class="small muted">记录和图片仅上传到你指定的私有仓库。做题后请点“上传全部”；更换设备时先“下载恢复”。同步不包含 AI 密钥，也不会自动取回 Claude 历史记录。</p><label class="small">私有数据仓库<input id="githubRepo" placeholder="用户名/仓库名" value="${esc(c.repo || 'kaledink/dataofxingce')}"></label><label class="small">专用访问令牌<input id="githubToken" type="password" autocomplete="off" placeholder="仅用于本次打开的页面，不会持久保存"></label><p class="small muted">令牌仅需该私有仓库的 Contents 读写权限；仓库需先创建 README 完成初始化。请勿填写你的 GitHub 登录密码。</p><div class="row"><button class="btn" data-github="export">导出完整备份</button><button class="btn" data-github="corrections">应用云端修订</button><button class="btn" data-github="download">下载恢复</button><button class="btn primary" data-github="upload">上传全部</button><button class="btn" data-github="forget">断开连接</button></div><p class="small" id="githubStatus" role="status">${c.lastSaved ? '上次同步：'+esc(new Date(c.lastSaved).toLocaleString()) : '尚未同步；当前改动先保存在本机'}</p></div>`;
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest('[data-github]'); if (!button || busy) return;
    busy = true; document.querySelectorAll('[data-github]').forEach(x => x.disabled = true);
    try {
      if (button.dataset.github === 'forget') { token = ''; localStorage.removeItem(KEY); render(); status('连接已断开，本机记录保留'); }
      else if (button.dataset.github === 'export') await exportAll();
      else if (button.dataset.github === 'corrections') await corrections();
      else if (button.dataset.github === 'upload') await upload();
      else await download();
    } catch(e) { status('操作未完成：' + e.message); }
    finally { busy = false; document.querySelectorAll('[data-github]').forEach(x => x.disabled = false); }
  });
  return {card,snapshot,restore};
})();
function githubSyncCard() { return GitHubSync.card(); }
