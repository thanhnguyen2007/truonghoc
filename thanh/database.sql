USE site;

DROP TABLE IF EXISTS articles;

CREATE TABLE articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'Thông báo chung',
  content TEXT NOT NULL,
  url VARCHAR(500) NOT NULL,
  FULLTEXT KEY ft_search (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO articles (title, category, content, url) VALUES
('Quy định đóng học phí học kỳ 1', 'Phòng Tài vụ',
 'Sinh viên hoàn thành đóng học phí qua cổng thanh toán trực tuyến hoặc chuyển khoản ngân hàng trước ngày 25/11. Quá hạn sẽ bị tạm khóa quyền đăng ký môn học.',
 '#hoc-phi'),
('Lịch thi kết thúc học phần & Điều kiện dự thi', 'Phòng Đào tạo',
 'Lịch thi chi tiết được công bố trên cổng sinh viên trước ngày thi 2 tuần. Sinh viên phải tham dự tối thiểu 80% số tiết học và mang theo Thẻ sinh viên khi vào phòng thi.',
 '#lich-thi'),
('Thủ tục xin cấp lại Thẻ sinh viên bị mất', 'Phòng Công tác HSSV',
 'Sinh viên nộp đơn xin cấp lại thẻ tại Phòng Công tác Học sinh - Sinh viên (khu A, tầng 1) kèm 01 ảnh 3x4 và lệ phí 50.000đ. Nhận thẻ mới sau 5 ngày làm việc.',
 '#the-sinh-vien'),
('Điều kiện xét học bổng Khuyến khích học tập', 'Học bổng & Chế độ',
 'Sinh viên đạt điểm trung bình học kỳ từ 3.2/4.0 trở lên, điểm rèn luyện đạt loại Tốt (từ 80 điểm) và không có môn nào thi lại trong học kỳ xét duyệt.',
 '#hoc-bong'),
('Hướng dẫn đăng ký học phần & Rút bớt môn học', 'Phòng Đào tạo',
 'Sinh viên đăng nhập tài khoản MSSV trên hệ thống đào tạo trong tuần đầu tiên của học kỳ để điều chỉnh lịch học. Mỗi học kỳ đăng ký tối thiểu 12 tín chỉ.',
 '#dang-ky-hoc-phan'),
('Nội quy mượn sách tại Thư viện trung tâm', 'Thư viện',
 'Sinh viên xuất trình thẻ sinh viên để mượn tối đa 03 cuốn giáo trình trong thời hạn 14 ngày. Có thể gia hạn trực tuyến thêm 07 ngày trước khi hết hạn.',
 '#thu-vien');