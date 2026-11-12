<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cổng Tra Cứu Thông Tin Nội Bộ - Nhà Trường</title>
    <link rel="stylesheet" href="copilot.css">
</head>
<body>

    <div class="container">
        <h1>🎓 Cổng Tra Cứu Nội Bộ Nhà Trường</h1>
        <p>Hệ thống hỗ trợ sinh viên và giảng viên tra cứu nhanh quy chế đào tạo, lịch thi, học phí, học bổng và thủ tục hành chính.</p>
    </div>

    <div id="ai-copilot-widget">
        <div class="copilot-box" id="copilot-box" role="dialog" aria-label="Trợ lý Tra cứu Học vụ">
         <div class="copilot-header">
    <h4>🎓 Trợ Lý Học Vụ AI</h4>
    <div class="copilot-header-actions">
        <!-- Thêm sự kiện onclick trực tiếp vào đây -->
        <button class="copilot-icon-btn" id="copilot-clear" type="button" title="Xóa lịch sử chat" aria-label="Xóa lịch sử chat" onclick="localStorage.removeItem('copilot_chat_history_v1'); document.getElementById('copilot-messages').innerHTML = 'Xin chào bạn! Tôi là Trợ lý AI của nhà trường. Bạn cần tra cứu thông tin gì về học phí, lịch thi, học bổng hay thủ tục sinh viên?';">🗑️</button>
        <button class="copilot-close" id="copilot-close" type="button" aria-label="Đóng">&times;</button>
    </div>
</div>

            <div class="copilot-messages" id="copilot-messages" aria-live="polite"></div>

            <!-- Thanh gợi ý câu hỏi nhanh đã được bổ sung data-query chuẩn xác -->
            <div class="copilot-suggestions" id="copilot-suggestions">
                <button type="button" class="suggestion-chip" data-query="học phí">💰 Đóng học phí</button>
                <button type="button" class="suggestion-chip" data-query="lịch thi">📅 Lịch thi</button>
                <button type="button" class="suggestion-chip" data-query="học bổng">🏆 Học bổng</button>
                <button type="button" class="suggestion-chip" data-query="thẻ sinh viên">🪪 Cấp lại thẻ SV</button>
                <button type="button" class="suggestion-chip" data-query="thư viện">📚 Thư viện</button>
            </div>

            <div class="copilot-input-area">
                <input type="text" id="copilot-input" maxlength="200"
                       placeholder="Nhập câu hỏi (vd: học phí, lịch thi)..." autocomplete="off"
                       aria-label="Câu hỏi tìm kiếm">
                <button id="copilot-send" type="button">Gửi</button>
            </div>
        </div>

        <button class="copilot-btn" id="copilot-toggle" type="button"
                title="Mở Trợ lý Học vụ" aria-label="Mở Trợ lý Học vụ"
                aria-controls="copilot-box" aria-expanded="false">🎓</button>
    </div>

    <script src="copilot.js" defer></script>
</body>
</html>