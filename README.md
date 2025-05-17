
# IQAir Dataset Vietnam

Dự án theo dõi và phân tích chất lượng không khí tại các thành phố lớn của Việt Nam, sử dụng dữ liệu từ IQAir.

## Tổng quan

| Thông số | Chi tiết |
|----------|----------|
| Tần suất cập nhật | Mỗi giờ |
| Định dạng dữ liệu | CSV |
| Phương thức | GitHub Actions |
| Nguồn dữ liệu | IQAir API |

## Các thành phố theo dõi

| Thành phố | Vùng miền |
|-----------|-----------|
| Hà Nội | Miền Bắc |
| Hồ Chí Minh | Miền Nam |
| Đà Nẵng | Miền Trung |
| Hải Phòng | Miền Bắc |
| Nha Trang | Miền Trung |
| Huế | Miền Trung |
| Hải Dương | Miền Bắc |
| Hưng Yên | Miền Bắc |
| Hòa Bình | Miền Bắc |
| Lai Châu | Miền Bắc |
| Thái Bình | Miền Bắc |

## Thông số theo dõi

| Thông số | Đơn vị | Mô tả |
|----------|---------|-------|
| AQI | - | Chỉ số chất lượng không khí |
| Tốc độ gió | km/h | Vận tốc gió |
| Độ ẩm | % | Độ ẩm không khí |
| Chất ô nhiễm chính | - | PM2.5, SO2, NO2, v.v. |
| Nồng độ | µg/m³ | Nồng độ chất ô nhiễm |

## Tính năng

### Thu thập dữ liệu
- Thu thập tự động mỗi giờ thông qua GitHub Actions
- Lưu trữ theo cấu trúc: `/data/{city}/aqi_{city}_{year}_{month}.csv`
- Xử lý và chuẩn hóa dữ liệu tự động
- Kiểm tra tính toàn vẹn dữ liệu

### Hiển thị và phân tích
- Dashboard trực quan với các thông số quan trọng
- Biểu đồ theo dõi AQI theo thời gian
- So sánh chất lượng không khí giữa các thành phố
- Thống kê và phân tích xu hướng:
  - AQI trung bình
  - Thành phố có không khí tốt nhất/kém nhất
  - Biến động theo thời gian

### Phân loại AQI

| Mức | Khoảng | Đánh giá |
|-----|---------|----------|
| 0-50 | Tốt | An toàn cho sức khỏe |
| 51-100 | Trung bình | Có thể ảnh hưởng nhẹ |
| 101-150 | Kém | Không tốt cho nhóm nhạy cảm |
| >150 | Nguy hại | Ảnh hưởng xấu đến sức khỏe |

## Công nghệ sử dụng
- Frontend: HTML, CSS, JavaScript
- Thư viện: Chart.js
- Tự động hóa: GitHub Actions
- Xử lý dữ liệu: Python
- API: IQAir API

## Đóng góp
Mọi đóng góp đều được hoan nghênh. Vui lòng tạo issue hoặc pull request để cải thiện dự án.




