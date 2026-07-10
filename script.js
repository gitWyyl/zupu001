// 配置
const CONFIG = {
    owner: 'gitWyyl',           // 你的 GitHub 用户名
    repo: 'zupu001',            // 仓库名
    path: 'data/note.txt',        // 文件路径
    branch: 'main'              // 分支
};

// 页面加载时自动读取
window.onload = loadNote;

// 读取 note.txt        
async function loadNote() {
    const display = document.getElementById('note-display');
    const token = document.getElementById('token-input').value.trim();
    display.textContent = '加载中...';
    
    try {
        let text;
        
        if (token) {
            // 有 Token：用 API 实时读取
            const apiUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}&t=${Date.now()}`;
            const res = await fetch(apiUrl, {
                headers: { 'Authorization': `token ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                text = decodeURIComponent(escape(atob(data.content)));
            }
        }
        
        // 无 Token 或 API 失败：用 raw
        if (!text) {
            const rawUrl = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/${CONFIG.branch}/${CONFIG.path}?_=${Date.now()}`;
            const res = await fetch(rawUrl, { cache: 'no-store' });
            text = await res.text();
        }
        
        display.textContent = text || '(文件为空)';
        
    } catch (err) {
        display.textContent = '读取失败：' + err.message;
    }
}

// 上传新内容到 note.txt
async function uploadNote() {
    const token = document.getElementById('token-input').value.trim();
    const content = document.getElementById('new-content').value;
    const status = document.getElementById('status');
    const btn = event.target;

    if (!token) { showStatus('请输入 GitHub Token', 'error'); return; }
    if (!content) { showStatus('请输入内容', 'error'); return; }

    btn.disabled = true;
    showStatus('上传中...', 'loading');

    try {
        // 1. 获取最新 SHA（只用时间戳防缓存，不加 Cache-Control 头）
        const getUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}?ref=${CONFIG.branch}&t=${Date.now()}`;
        const getRes = await fetch(getUrl, {
            headers: { 'Authorization': `token ${token}` }
        });
        
        let sha = '';
        if (getRes.status === 200) {
            const fileInfo = await getRes.json();
            sha = fileInfo.sha;
        } else if (getRes.status === 404) {
            sha = '';
        } else {
            throw new Error(`获取文件信息失败: ${getRes.status}`);
        }

        // 2. 上传
        const putUrl = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${CONFIG.path}`;
        const body = {
            message: '更新 note.txt - ' + new Date().toLocaleString('zh-CN'),
            content: btoa(unescape(encodeURIComponent(content))),
            branch: CONFIG.branch
        };
        if (sha) body.sha = sha;

        const putRes = await fetch(putUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!putRes.ok) {
            const err = await putRes.json();
            throw new Error(err.message || `HTTP ${putRes.status}`);
        }

        showStatus('✅ 上传成功！', 'success');
        document.getElementById('new-content').value = '';
        setTimeout(loadNote, 1000);

    } catch (err) {
        showStatus('❌ 失败：' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}


// 显示状态消息
function showStatus(msg, type) {
    const status = document.getElementById('status');
    status.textContent = msg;
    status.className = type;
    status.style.display = 'block';
}
