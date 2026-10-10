# Triển khai V4 – hai cách nộp bài

1. Giữ nguyên Supabase đang dùng cho V3. Trong SQL Editor chạy `supabase/submission_modes_v4.sql` **một lần** trước khi deploy code V4.
2. Đẩy mã nguồn V4 lên repository GitHub đã kết nối Vercel, rồi deploy lại.
3. Trong Writing/Speaking, học sinh chọn **Submit to Teacher** (mặc định) hoặc **Submit & Get AI Feedback**.
4. Submit to Teacher chỉ gọi `save_work`, lưu bài với `submission_mode=teacher`, **không gọi OpenAI, không tạo ai_grades và không trừ lượt AI**.
5. Submit & Get AI Feedback lưu bài trước, sau đó gọi API AI riêng. Nếu AI bị tắt/hết hạn mức/lỗi, bài vẫn đã nộp và có thể chấm lại trong danh sách.
6. Giáo viên xem bài, chế độ nộp, audio và lưu nhận xét trong Class Progress. Học sinh xem nhận xét trong bài đã nộp.

Lưu ý: cần chạy migration trước khi deploy. AI cần `OPENAI_API_KEY` và `AI_GRADING_ENABLED=true` trong Vercel. Không gửi khóa bí mật cho học sinh. Chưa triển khai thực tế hoặc kiểm thử end-to-end trên tài khoản Supabase/Vercel.
