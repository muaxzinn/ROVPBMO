# Auto Media Index (GitHub Pages)

หน้าเว็บที่ดึงรายชื่อไฟล์ **สดจาก GitHub API** อัตโนมัติ
— แค่อัปโหลดไฟล์เข้าโฟลเดอร์ที่กำหนด หน้าเว็บก็อัปเดตทันที

## โครงสร้าง
- `assets/img` รูปภาพ
- `assets/video` วิดีโอ
- `assets/audio` เสียง
- `assets/docs` เอกสาร
- `pages/about.html` หน้าข้อมูลส่วนตัว

## ตั้งค่า
เปิด `assets/js/app.js` แล้วตั้งค่า:
```js
owner: "YOUR_GITHUB_USERNAME",
repo:  "YOUR_REPO_NAME",
branch:"main",
basePaths: ["assets/img","assets/video","assets/audio","assets/docs"]
