# sremote.css.set
Inject hoặc cập nhật động (Dynamic CSS) vào tài liệu bên trong iframe con đang kết nối.

## Cú pháp
```javascript
sremote.css.set(css, instanceId?, key?);
```

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `css` | `string` | `""` | Đoạn mã CSS tuỳ chỉnh cần áp dụng vào iframe. |
| `instanceId` | `string` | `null` | Định danh instance của iframe đích cần áp dụng CSS (nếu để trống sẽ áp dụng cho iframe hoạt động gần nhất). |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |

## Giá trị trả về
Trả về một `Promise<{ success: boolean, css: string }>` xác nhận CSS đã được nạp thành công.

## Lưu ý
- CSS động này được quản lý qua một thẻ `<style id="sremote-dynamic-css">` và có `MutationObserver` liên tục giám sát để tự động khôi phục nếu ứng dụng SPA/Player của iframe xóa hoặc ghi đè cây DOM.
- Để nạp CSS sớm hơn nữa nhằm chống Flash of Unstyled Content (FOUC), hãy truyền `css` qua `sremote.hello({ css: '...' })`.
