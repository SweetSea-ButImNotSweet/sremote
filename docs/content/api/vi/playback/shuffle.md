# sremote.shuffle

Bật, tắt hoặc đảo trạng thái phát ngẫu nhiên (shuffle) playlist trên các trình phát có hỗ trợ (Spotify, SoundCloud,...).

## Cú pháp
`sremote.shuffle(enable?, targetOrId?, key?)`

## Tham số
| Tham số | Kiểu dữ liệu | Mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| `enable` | `boolean` | `undefined` | `true` để bật shuffle, `false` để tắt. Nếu bỏ qua, sẽ tự động đảo trạng thái hiện tại. |
| `targetOrId` | `string \| HTMLElement` | `null` | Định danh instance hoặc thẻ DOM đích. |
| `key` | `string` | `null` | Passkey xác thực nếu đã bật domain lock. |

## Giá trị trả về
Trả về một Promise chứa kết quả thực thi lệnh (`success: true/false`).

## Ví dụ
```javascript
// Đảo trạng thái trộn bài
await sremote.shuffle();

// Bật phát ngẫu nhiên cho instance Spotify
await sremote.shuffle(true, 'spotify-instance');
```
