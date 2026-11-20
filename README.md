# GitDash — لوحة تحكم System OS

لوحة تحكم عربية (RTL) بتصميم "System OS": خلفية زيتونية داكنة، لمسات مرجانية/وردية، حساسية ناعمة، وتقويم تفاعلي. تعمل بالكامل كتطبيق ثابت (Static) على **GitHub Pages** بدون خادم.

## المزايا

- **بيانات GitHub مباشرة** لأي مستخدم من الشريط العلوي (مع تخزين مؤقت محلي وبيانات عرض احتياطية).
- **نظرة عامة**: مؤشرات Stars/Forks/Repos/Followers، مخطط نشاط أسبوعي، توزيع لغات البرمجة، أحدث المستودعات والأنشطة.
- **المستودعات**: بحث، تصفية حسب اللغة، ترتيب، ترقيم صفحات، ونسخ أمر `git clone`.
- **التقويم**: تقويم شهري كامل + تقويم مصغّر، مهام مرتبطة بالتواريخ، نقاط دلالية، وملخص شهري.
- **مساحة العمل**: مهام بأولويات وتواريخ، روابط سريعة، مفاتيح تبديل، وتصدير/استيراد JSON.
- **دليل النشر**: خطوات وأوامر جاهزة للنسخ.
- الوضع الداكن الزيتوني افتراضي مع وضع فاتح دافئ، وخطوط IBM Plex Sans Arabic + Space Grotesk.

## التشغيل محلياً

```bash
npm install
npm run dev
```

## البناء

```bash
npm run build
```

الناتج ملف `dist/index.html` واحد متكامل (vite-plugin-singlefile).

## النشر على GitHub Pages

1. أنشئ مستودعاً جديداً على GitHub وارفع المشروع إلى فرع `main`:
   ```bash
   git init
   git add .
   git commit -m "Deploy GitDash dashboard"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git push -u origin main
   ```
2. من المستودع: **Settings ← Pages ← Source: GitHub Actions**.
3. ملف `.github/workflows/deploy.yml` المضمّن سيُبني المشروع وينشره تلقائياً عند كل `push` على `main`.
4. سيظهر الرابط بالشكل: `https://USERNAME.github.io/REPO_NAME` في تبويب Actions.

> التنقل يعتمد على روابط Hash (`#overview`, `#calendar` ...) لضمان إعادة تحميل آمنة على GitHub Pages.
