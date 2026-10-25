# Interview Lab — UI design system

## Quyết định

UI dùng shadcn/ui theo cấu hình `base-nova`, Base UI primitives, Tailwind CSS v4 và Lucide icons. shadcn/ui là source-owned component layer: component được lưu trực tiếp trong `src/components/ui`, có thể chỉnh sửa theo ngôn ngữ thiết kế của sản phẩm.

## Aesthetic direction

- Tone: editorial kết hợp industrial/utilitarian.
- Nền paper ấm, ink tối và accent xanh thay cho dashboard SaaS tím/xanh quen thuộc.
- `Instrument Serif` dành cho display heading; `Figtree Variable` dành cho nội dung.
- Motion tiết chế, ưu tiên một chuyển động có mục đích thay vì animation rải rác.

## Component foundation

- Actions: `Button`.
- Surfaces: `Card`, `Separator`.
- Status: `Badge`, `Progress`, `Skeleton`.
- Data: `Table`.
- Forms: `Input`, `Textarea`, `Label`, `Select`.
- Workspace navigation: `Tabs`.

Các feature mới ưu tiên compose các primitive trên. Không thêm component library thứ hai nếu shadcn/ui hoặc native semantic HTML đã giải quyết được yêu cầu.

## Accessibility rules

- Không dùng màu làm tín hiệu duy nhất.
- Form control luôn có label.
- Focus ring không bị xóa.
- Navigation và action chính dùng được bằng keyboard.
- System-design diagram phải có text/Markdown representation hoặc mô tả thay thế.
