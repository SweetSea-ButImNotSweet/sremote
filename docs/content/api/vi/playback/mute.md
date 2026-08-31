# sremote.mute
Bật, tắt hoặc chuyển đổi trạng thái tắt tiếng (mute) của media.

## Tham số
| Tên tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `muted` | `boolean` | `undefined` | Trạng thái tắt tiếng (`true`: tắt tiếng, `false`: bật tiếng). Nếu không truyền hoặc để `undefined`, sẽ tự động đảo trạng thái hiện tại (toggle). |
| `instanceId` | `string` | `null` | Định danh của media instance muốn điều khiển. |
| `key` | `string` | `null` | Passkey xác thực nếu domain bị khoá. |
