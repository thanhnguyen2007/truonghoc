(() => {
    const API_URL     = 'api.php';
    const STORAGE_KEY = 'copilot_chat_history_v1';
    const MAX_LEN     = 200;
    const WELCOME_MSG = 'Xin chào bạn! Tôi là Trợ lý AI của nhà trường. Bạn cần tra cứu thông tin gì về học phí, lịch thi, học bổng hay thủ tục sinh viên?';

    const widget      = document.getElementById('ai-copilot-widget');
    const toggleBtn   = document.getElementById('copilot-toggle');
    const box         = document.getElementById('copilot-box');
    const closeBtn    = document.getElementById('copilot-close');
    const clearBtn    = document.getElementById('copilot-clear');
    const sendBtn     = document.getElementById('copilot-send');
    const input       = document.getElementById('copilot-input');
    const messages    = document.getElementById('copilot-messages');
    const suggestions = document.getElementById('copilot-suggestions');

    if (!widget || !toggleBtn || !box || !closeBtn || !sendBtn || !input || !messages) {
        console.error('[Copilot] Thiếu phần tử HTML: kiểm tra lại index.php.');
        return;
    }

    // Style cho khung chi tiết, được chèn bằng JS để không phải sửa copilot.css
    const detailStyle = document.createElement('style');
    detailStyle.textContent = `
        .detail-toggle {
            margin-top: 8px;
            padding: 2px 0;
            border: 0;
            background: none;
            color: #4f46e5;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }
        .detail-toggle:hover { text-decoration: underline; }
        .detail-box {
            margin-top: 8px;
            padding: 10px 12px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.6;
            color: #1e293b;
        }
        .detail-box[hidden] { display: none; }
        .detail-content {
            white-space: pre-wrap;
            word-break: break-word;
        }
        .detail-source {
            display: inline-block;
            margin-top: 8px;
            font-size: 12px;
            font-weight: 600;
            color: #4f46e5;
            text-decoration: none;
        }
        .detail-source:hover { text-decoration: underline; }
    `;
    document.head.append(detailStyle);

    let busy = false;
    let chatHistory = [];

    // ---------- Khởi tạo & Lưu trữ lịch sử ----------
    function loadHistory() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            if (Array.isArray(saved) && saved.length > 0) {
                chatHistory = saved;
                messages.innerHTML = '';
                for (const entry of chatHistory) {
                    if (entry.type === 'user') {
                        renderText(entry.text, 'user');
                    } else if (entry.type === 'ai_text') {
                        renderText(entry.text, 'ai');
                    } else if (entry.type === 'ai_answer') {
                        renderAnswer(entry.data, entry.voted || 0);
                    }
                }
                return;
            }
        } catch (e) {
            console.warn('[Copilot] Không đọc được lịch sử:', e);
        }
        resetChat(false);
    }

    function saveHistory() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-30)));
        } catch (e) {
            console.warn('[Copilot] Không lưu được lịch sử:', e);
        }
    }

    function resetChat(clearStorage = true) {
        chatHistory = [];
        if (clearStorage) localStorage.removeItem(STORAGE_KEY);
        messages.innerHTML = '';
        renderText(WELCOME_MSG, 'ai');
    }

    // ---------- Mở / đóng / xóa lịch sử ----------
    function setOpen(open) {
        box.classList.toggle('active', open);
        toggleBtn.setAttribute('aria-expanded', String(open));
        if (open) input.focus();
    }

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!box.classList.contains('active'));
    });

    closeBtn.addEventListener('click', () => setOpen(false));

    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetChat(true);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setOpen(false);
    });

    // ---------- Gợi ý câu hỏi nhanh ----------
    suggestions?.addEventListener('click', (e) => {
        const chip = e.target.closest('.suggestion-chip');
        if (!chip || busy) return;

        const queryText = chip.getAttribute('data-query') || chip.textContent.replace(/[\p{Emoji}\p{Other_Symbol}]/gu, '').trim();

        if (queryText) {
            input.value = queryText;
            send();
        }
    });

    // ---------- Gửi câu hỏi ----------
    sendBtn.addEventListener('click', send);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            send();
        }
    });

    async function send() {
        if (busy) return;
        const query = input.value.trim();
        if (!query) return;
        if (query.length > MAX_LEN) {
            addText(`Câu hỏi quá dài (tối đa ${MAX_LEN} ký tự).`, 'ai');
            return;
        }

        busy = true;
        sendBtn.disabled = true;
        input.value = '';
        addText(query, 'user');
        const loading = renderText('🤖 Đang tìm kiếm dữ liệu nội bộ...', 'ai');

        try {
            const url = new URL(API_URL, window.location.href).href;
            let res;
            try {
                res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'search', query }),
                    cache: 'no-store',
                });
            } catch (netErr) {
                console.error('[Copilot] Lỗi mạng:', netErr);
                return finish(loading, `Không kết nối được tới ${url}. Kiểm tra Apache và file api.php.`);
            }

            const raw = await res.text();
            let data = null;
            try {
                data = JSON.parse(raw);
            } catch {
                console.error('[Copilot] Phản hồi không phải JSON:', raw.slice(0, 500));
                return finish(loading, `Máy chủ trả về lỗi HTTP ${res.status}. Kiểm tra cấu hình CSDL trong api.php.`);
            }

            if (!res.ok || data.status !== 'success') {
                return finish(loading, data.message || `Có lỗi xảy ra (HTTP ${res.status}).`);
            }

            finish(loading, null, data);
        } catch (err) {
            console.error('[Copilot] Lỗi không mong muốn:', err);
            finish(loading, 'Có lỗi phía trình duyệt. Mở F12 → Console để xem chi tiết.');
        } finally {
            busy = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    function finish(loadingEl, errorText, data = null) {
        loadingEl.remove();
        if (errorText) {
            addText(errorText, 'ai');
        } else {
            chatHistory.push({ type: 'ai_answer', data, voted: 0 });
            saveHistory();
            renderAnswer(data, 0);
        }
    }

    // ---------- Hiển thị & Tô sáng từ khóa an toàn ----------
    function appendHighlightedText(container, text, query) {
        const str = String(text ?? '');
        const keywords = String(query || '')
            .split(/\s+/)
            .filter(w => w.length >= 2)
            .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        if (keywords.length === 0) {
            container.textContent = str;
            return;
        }

        // split có nhóm bắt → phần tử ở vị trí lẻ là từ khóa khớp.
        const parts = str.split(new RegExp(`(${keywords.join('|')})`, 'gi'));
        parts.forEach((part, i) => {
            if (!part) return;
            if (i % 2 === 1) {
                const mark = document.createElement('mark');
                mark.className = 'hl-keyword';
                mark.textContent = part;
                container.append(mark);
            } else {
                container.append(document.createTextNode(part));
            }
        });
    }

    function renderAnswer(data, initialVote = 0) {
        const bubble = renderText(data.answer, 'ai');

        if (Array.isArray(data.results) && data.results.length > 0) {
            const label = document.createElement('div');
            label.className = 'source-label';
            label.textContent = 'Nguồn dữ liệu nội bộ:';
            bubble.append(label);

            for (const item of data.results) {
                const card = document.createElement('div');
                card.className = 'result-card';

                if (item.category) {
                    const cat = document.createElement('span');
                    cat.className = 'result-category';
                    cat.textContent = item.category;
                    card.append(cat);
                }

                const title = document.createElement('div');
                const strong = document.createElement('strong');
                appendHighlightedText(strong, item.title, data.query);
                title.append(strong);

                const snippet = document.createElement('div');
                appendHighlightedText(snippet, item.snippet, data.query);

                // Nút mở rộng: hiện toàn bộ nội dung ngay trong thẻ
                const detail = document.createElement('div');
                detail.className = 'detail-box';
                detail.hidden = true;

                const fullText = document.createElement('div');
                fullText.className = 'detail-content';
                appendHighlightedText(fullText, item.content || item.snippet || '', data.query);
                detail.append(fullText);

                if (/^(https?:\/\/|\/)/i.test(String(item.url || ''))) {
                    const source = document.createElement('a');
                    source.className = 'detail-source';
                    source.href = item.url;
                    source.target = '_blank';
                    source.rel = 'noopener noreferrer';
                    source.textContent = 'Mở liên kết gốc →';
                    detail.append(source);
                }

                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.className = 'detail-toggle';
                toggle.setAttribute('aria-expanded', 'false');
                toggle.textContent = 'Xem chi tiết ▾';
                toggle.addEventListener('click', () => {
                    const opening = detail.hidden;
                    detail.hidden = !opening;
                    toggle.setAttribute('aria-expanded', String(opening));
                    toggle.textContent = opening ? 'Thu gọn ▴' : 'Xem chi tiết ▾';
                });

                card.append(title, snippet, toggle, detail);
                bubble.append(card);
            }
        }

        // Thanh đánh giá kết quả (Like / Dislike)
        if (data.log_id) {
            const fbBar = document.createElement('div');
            fbBar.className = 'feedback-bar';

            const fbText = document.createElement('span');
            fbText.textContent = initialVote !== 0 ? 'Cảm ơn đánh giá của bạn!' : 'Kết quả này có hữu ích?';

            const btnUp = document.createElement('button');
            btnUp.type = 'button';
            btnUp.className = 'feedback-btn' + (initialVote === 1 ? ' active' : '');
            btnUp.textContent = '👍';

            const btnDown = document.createElement('button');
            btnDown.type = 'button';
            btnDown.className = 'feedback-btn' + (initialVote === -1 ? ' active' : '');
            btnDown.textContent = '👎';

            if (initialVote !== 0) {
                btnUp.disabled = true;
                btnDown.disabled = true;
            }

            const handleVote = async (vote) => {
                btnUp.disabled = true;
                btnDown.disabled = true;
                (vote === 1 ? btnUp : btnDown).classList.add('active');
                fbText.textContent = 'Cảm ơn đánh giá của bạn!';

                const record = chatHistory.find(h => h.type === 'ai_answer' && h.data?.log_id === data.log_id);
                if (record) {
                    record.voted = vote;
                    saveHistory();
                }

                try {
                    await fetch(new URL(API_URL, window.location.href).href, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'feedback', log_id: data.log_id, vote }),
                    });
                } catch (e) {
                    console.warn('[Copilot] Gửi feedback thất bại:', e);
                }
            };

            btnUp.addEventListener('click', () => handleVote(1));
            btnDown.addEventListener('click', () => handleVote(-1));

            fbBar.append(fbText, btnUp, btnDown);
            bubble.append(fbBar);
        }

        messages.scrollTop = messages.scrollHeight;
    }

    function addText(text, sender) {
        chatHistory.push({ type: sender === 'user' ? 'user' : 'ai_text', text });
        saveHistory();
        return renderText(text, sender);
    }

    function renderText(text, sender) {
        const el = document.createElement('div');
        el.className = 'msg ' + (sender === 'user' ? 'msg-user' : 'msg-ai');
        el.textContent = text;
        messages.append(el);
        messages.scrollTop = messages.scrollHeight;
        return el;
    }

    function safeHref(url) {
        return /^(https?:\/\/|\/|#)/i.test(String(url)) ? url : '#';
    }

    loadHistory();
})();