# 💻 TinHoc10 Master - Hệ Thống Luyện Bộ Đề, Sửa Đáp Án & Lưu Điểm Cá Nhân (Vercel App)

> **Ứng dụng web ôn thi trắc nghiệm và đúng sai Tin học lớp 10 (Chương trình GDPT 2018 mới)**: Đầy đủ 100% câu hỏi đề cương (126 câu trắc nghiệm 4 lựa chọn + 9 câu tình huống Đúng/Sai với 36 nhận định a, b, c, d).

---

## 🌟 Các Tính Năng Vừa Bổ Sung

### 1. ✏️ Chức Năng Chỉnh Sửa Đáp Án Linh Hoạt
- **Nút "Sửa đáp án" ngay trên từng câu hỏi**:
  + Xuất hiện trên mọi chế độ: *Luyện tập tự do*, *Tra cứu & Học thuộc*, *Mục lục câu hỏi* và *Khi đang làm bộ đề*.
  + Cho phép thay đổi đáp án đúng của bất kỳ câu nào trong nháy mắt.
  + **Đối với Phần I (Trắc nghiệm)**: Bấm chọn đáp án chuẩn mới (A, B, C, hoặc D) và chỉnh sửa lời giải thích chi tiết.
  + **Đối với Phần II (Đúng / Sai)**: Chuyển đổi trạng thái `ĐÚNG` / `SAI` cho từng ý (a, b, c, d) và chỉnh sửa lời giải thích cho từng ý.
- **Tự động lưu vĩnh viễn vào `localStorage`**:
  + Mọi sửa đổi đáp án được áp dụng ngay lập tức trên toàn bộ các bộ đề và chế độ thi thử mà không làm mất dữ liệu.
  + Câu nào đã sửa sẽ có huy hiệu đánh dấu: `[Đã sửa ✏️]`.
- **Nút "Khôi phục về gốc"**:
  + Cho phép hoàn tác từng câu hoặc khôi phục toàn bộ 135 câu về đáp án gốc của đề cương ban đầu bất kỳ lúc nào.

### 2. 📥 Xuất File `questions.js` Mới Để Cập Nhật Lên Vercel
- Trong bảng **"Quản lý & Sửa đáp án"**, có nút **"Tải questions.js mới"**.
- Bấm vào nút này, hệ thống sẽ tự động tạo và tải về file `questions.js` chuẩn UTF-8 chứa toàn bộ các đáp án mới mà bạn đã sửa.
- **Cách áp dụng cho website Vercel**: Bạn chỉ cần copy đè file `questions.js` vừa tải về vào thư mục `de-cuong-tin-10/` trên máy tính hoặc đẩy lên GitHub, Vercel sẽ tự động build lại và cập nhật đáp án mới cho tất cả học sinh!

### 3. 📑 Các Bộ Đề Phân Chia Khoa Học
- **4 Bộ Đề Thi Tổng Hợp**: Phủ trọn 100% đề cương (126 câu trắc nghiệm + 9 câu Đúng/Sai), không bỏ sót bất kỳ câu nào.
- **4 Chuyên Đề Đúng/Sai**: Ôn luyện chuyên sâu Phần II tình huống (36 nhận định).
- **2 Chế độ làm bài**:
  + 💡 *Xem kết quả sau khi làm từng câu* (Ôn tập tức thì).
  + ⏱️ *Xem kết quả sau khi làm xong cả đề* (Thi thử bấm giờ, chấm điểm tổng).

### 4. 👤 Đăng Ký Tài Khoản & Bảng Điểm Cá Nhân
- Đăng ký và đăng nhập theo từng học sinh.
- Lưu lại điểm số, xếp loại và lịch sử tất cả các lần thi.
- Hỗ trợ làm lại đề không giới hạn số lần.

---

## 🚀 Triển Khai Lên Vercel

1. Đẩy mã nguồn thư mục này lên GitHub repository của bạn.
2. Truy cập [vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
3. Bấm **Add New...** ➔ **Project** ➔ Chọn repo GitHub ➔ Chọn Root Directory là `de-cuong-tin-10` ➔ Bấm **Deploy**.
4. Website sẽ có link online miễn phí 100% để chia sẻ cho học sinh và bạn bè!

---

## 💻 Chạy Offline Ngay Trên Máy Tính
- Nhấp đúp vào file `CHAY_APP_DE_CUONG_TIN10.bat` ở thư mục gốc hoặc mở file `de-cuong-tin-10/index.html` bằng trình duyệt (Chrome, Edge, Cốc Cốc...).
