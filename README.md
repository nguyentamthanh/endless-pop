# Endless Pop

Game puzzle casual HTML5 cho mobile, viết bằng **Phaser 3 + TypeScript + Vite**. Nhân vật chính là Moo, chú bò trắng đeo kính râm.
Cơ chế chơi được xây dựng theo video tham chiếu (màn "萌宠跳跳" của 《消消没够》); tên, nhân vật, bộ icon, màn chơi, giao diện và âm thanh đều là tài sản gốc của dự án.

## Cách chơi

- Bàn chơi gồm các cột ô xếp chồng. Phần dưới mỗi cột là các ô úp (hình chân mèo); ô úp tự lật khi trở thành ô trên cùng.
- **Chạm một cột (hoặc ô khay)** để nhấc cả nhóm ô cùng loại đang nằm trên cùng, rồi **chạm cột đích** để thả.
  Đích hợp lệ: cột có ô trên cùng cùng loại, cột trống, ô khay trống hoặc ô khay đang giữ cùng loại.
- Khi một cột có **từ N ô cùng loại liền nhau ở trên cùng** (N đặt theo từng màn, 4 đến 10), cả nhóm nổ và cộng điểm. Nổ xong làm lộ ô úp, nếu ô vừa lật tạo thêm nhóm đủ N thì nổ tiếp (combo).
- **Thắng:** dọn sạch bàn và khay. **Thua:** hết nước đi hợp lệ và không còn booster nào cứu được.
- Booster: **Undo** (3 lần/màn), **Shuffle** (1), **Extra Slot** mở ô khay thứ 4 (1). Hết lượt có thể mua bằng coin. Dùng tối đa 0 / 2 booster sẽ được 3 / 2 sao, nhiều hơn được 1 sao.
- 30 màn chiến dịch, sau đó là chế độ **Endless** sinh màn theo seed. Mọi màn đều được chứng minh là giải được (xem `Solver`).

Phân tích video và các điểm đã xác nhận / giả định: [`docs/GAMEPLAY_ANALYSIS.md`](docs/GAMEPLAY_ANALYSIS.md).

## Chạy dự án

Cần Node 20 trở lên.

```bash
npm install
npm run dev
```

```bash
npm run build
```

```bash
npm run preview
```

```bash
npm test
```

- `npm run dev` mở http://localhost:5173. Thêm `?debug=1` để bật chế độ kiểm thử: vòng lặp chạy bằng `setTimeout` (tab nền vẫn chạy) và có `window.__ep` (`autoplay()`, `noMoves()`, `state()`).
- `npm run build` chạy `tsc --noEmit` rồi build ra `dist/`. Đường dẫn tương đối (`base: './'`) nên có thể đặt `dist/` ở bất kỳ thư mục hay host tĩnh nào.
- Không cần API key hay biến môi trường (`.env.example` chỉ để ghi chú).

## Cấu trúc

```
src/game/core        Luật chơi thuần TypeScript (Board, Rules, Solver, LevelGenerator, rng). Không phụ thuộc Phaser.
src/game/config      levels.ts (30 màn, chỉnh dạng bảng), assets.ts, theme.ts
src/game/systems     GameplaySystem (luật + undo + booster), ScoreSystem, LevelSystem, SaveSystem,
                     AudioSystem (tổng hợp bằng Web Audio), TutorialSystem, FxSystem, TextureFactory
src/game/scenes      Boot, Preload, Menu, LevelSelect, Game, Pause, Result
src/game/ui          BoardView (toàn bộ animation của bàn chơi), HUD, Button, Panel, ProgressBar, BoosterBar, Backdrop, layout
src/game/entities    TileSprite, Mascot
public/assets        Ảnh dùng trong game (PNG/WebP, tổng ≈ 1,2 MB)
store-art/           Icon 512 và thumbnail quảng bá 1280×720 (không đóng gói vào game)
tools/               asset-jobs.mjs (prompt Gemini + cách cắt) và process-assets.mjs
tests/               vitest cho luật chơi, solver, sinh màn, điểm, undo, booster
```

Chỉnh độ khó: sửa bảng `ROWS` trong `src/game/config/levels.ts` (số cột, số loại ô, N, độ cao, số hàng ô úp, ô khay…), rồi chạy `npm test` để xác nhận mọi màn vẫn giải được.

## Asset

Toàn bộ ảnh được tạo bằng **Gemini (gemini.google.com)** và xử lý bằng `tools/process-assets.mjs` (tách nền magenta, cắt sprite, nén palette). Prompt, kích thước và nơi dùng của từng file nằm trong [`ASSET_MANIFEST.md`](ASSET_MANIFEST.md) (tạo tự động từ `tools/asset-jobs.mjs`).

Tạo lại hoặc thay một ảnh: đặt ảnh gốc từ Gemini vào `raw-assets/<tên>.png` rồi chạy

```bash
node tools/process-assets.mjs moo_idle
node tools/process-assets.mjs --manifest
```

`raw-assets/` (ảnh gốc ≈ 70 MB) không đưa vào git. Nếu thiếu một file ảnh, game tự vẽ hình thay thế bằng code (`TextureFactory`) để không bị vỡ, và in cảnh báo ra console.

Âm thanh không dùng file: mọi hiệu ứng và nhạc nền được tổng hợp bằng Web Audio trong `AudioSystem`.

## Kỹ thuật chính

- Phaser `Scale.EXPAND` với thiết kế 720 × 1280, canvas lấp đầy khung khổ dọc; màn hình rộng hiện thành một cột "điện thoại" ở giữa. Đọc `safe-area-inset-*` để tránh tai thỏ.
- Mọi animation dùng Phaser Tween (nhảy theo Bezier, squash-and-stretch, lật thẻ, pop). Chuyển động nền dùng delta time. Không dùng Arcade Physics vì không cần.
- `TileSprite` và floating text được tái sử dụng (pool); particle emitter tạo một lần rồi `explode()`.
- Tab ẩn: game tự Pause, tạm dừng AudioContext. Listener được gỡ khi scene shutdown.
- Lưu tiến trình bằng `localStorage` (`endlesspop.v1`), mọi truy cập bọc `try/catch`.

## Báo cáo kiểm thử

Đã chạy và đạt:

- `npm install`, `npm run build` (không lỗi TypeScript), `npm test`: **56 test** đạt. Có test chứng minh cả 30 màn chiến dịch và vài màn Endless giải được, phát lại lời giải bằng đúng luật của game.
- Trình duyệt (Browser pane, `npm run dev` và bản `build` qua `vite preview`), viewport 360×640, 390×844, 640×360 và desktop:
  - Boot → Loading (có tiến trình) → Menu → Play → màn chơi.
  - Tutorial ở level 1: chạm sai cột bị bỏ qua, hai nước đi đúng được thực hiện.
  - Chạm chọn cột nguồn rồi cột đích bằng chuột; nhóm ô nhảy, nổ, tính điểm và combo.
  - Thắng (3 sao, coin, lưu tiến trình, mở màn kế, nút Next/Replay/Home) và thua (panel "No moves!", Give up, nút Retry).
  - Undo, Shuffle, Extra Slot (kể cả mua bằng coin), Pause / Resume / Restart / Home, tự Pause khi sự kiện tab ẩn.
  - Settings (Sound, Music, Replay tutorial, Reset progress), Level Select.
  - Bản build: 57 ảnh tải đủ, 0 lỗi 404, 0 lỗi console.

Chưa kiểm thử / hạn chế còn lại:

- **Chưa thử trên thiết bị thật** (Android, iOS Safari) và chưa đo FPS trên máy cấu hình thấp. Công cụ giả lập gửi sự kiện chuột; Phaser dùng chung Pointer cho chuột và cảm ứng nên không có đường code riêng cho touch, nhưng chưa được xác nhận bằng cảm ứng thật.
- **Âm thanh chưa được nghe thử** (môi trường kiểm thử không có loa). Chỉ xác nhận không phát sinh lỗi, và nhạc/SFX tắt khi Pause hoặc tab ẩn theo mã nguồn.
- **Luật xoá ô, thắng và thua là giả định đã được người dùng xác nhận**, vì video không có cảnh ô nào bị xoá. Cần đối chiếu lại nếu có video gameplay đầy đủ hơn.
- Ba đám mây Gemini tạo ra gần giống nhau; icon "coin" trông giống quả địa cầu hơn là xu có đốm bò; icon mặt Moo đang mếu. Đều dùng được nhưng có thể tạo lại bằng cách sửa prompt trong `tools/asset-jobs.mjs`.
- Chưa có quảng cáo / mua hàng thật: "video ad" trong game gốc được thay bằng booster mua bằng coin.
- Bundle JS ≈ 1,26 MB (340 KB gzip) chủ yếu là Phaser. Có thể giảm thêm bằng custom build của Phaser nếu cần.
