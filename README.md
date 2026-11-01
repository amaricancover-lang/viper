# NB NEWS — Firebase সংস্করণ (HTML + Firestore)

আগের PHP/MySQL সাইটটি এখন **পুরোপুরি স্ট্যাটিক HTML/JS**। ডাটাবেস = Firestore, অ্যাডমিন লগইন = Firebase Authentication, হোস্টিং = Firebase Hosting। PHP বা MySQL আর লাগবে না।

| আগে (PHP) | এখন |
|---|---|
| `index.php`, `article.php` | `index.html`, `article.html` (+ `assets/home.js`, `assets/article.js`) |
| `admin/index.php` | `admin/index.html` (+ `admin/assets/admin.js`) |
| MySQL | Firestore (`articles`, `sections`, `settings`) |
| ইউজারনেম/পাসওয়ার্ড টেবিল | Firebase Authentication (ইমেইল + পাসওয়ার্ড) |
| `uploads/` ফোল্ডার | Firebase Storage (অথবা ছবির লিংক) |

## ১. Firebase প্রজেক্ট তৈরি
1. <https://console.firebase.google.com> → **Add project**।
2. **Build → Firestore Database → Create database** (production mode, লোকেশন: `asia-south1` বা কাছের কোনোটি)।
3. **Build → Authentication → Get started → Sign-in method → Email/Password চালু করুন।** তারপর **Users → Add user** দিয়ে নিজের অ্যাডমিন ইমেইল ও পাসওয়ার্ড বানান।
4. **Project settings → General → Your apps → Web (`</>`)** → অ্যাপ রেজিস্টার করে `firebaseConfig` কপি করুন।
5. (ঐচ্ছিক) **Build → Storage** চালু করলে অ্যাডমিন থেকে ছবি আপলোড হবে। *নতুন প্রজেক্টে Storage-এর জন্য Blaze (pay-as-you-go) প্ল্যান লাগতে পারে।* চালু না করলে ছবির লিংক বসিয়ে কাজ চালানো যাবে।

## ২. ফাইলে তিনটি জিনিস বদলান
- `assets/firebase-config.js` → আপনার `firebaseConfig` বসান।
- `firestore.rules` ও `storage.rules` → `YOUR_ADMIN_EMAIL@example.com` বদলে আপনার অ্যাডমিন ইমেইল দিন (এটাই নিরাপত্তা: শুধু এই ইমেইল লিখতে/মুছতে পারবে)।
- `.firebaserc` ও `.github/workflows/deploy.yml` → `YOUR_PROJECT_ID` বদলে প্রজেক্ট আইডি দিন।

## ৩. প্রথমবার ডিপ্লয় (রুলস + ইনডেক্স + হোস্টিং)
```bash
npm i -g firebase-tools
firebase login
firebase deploy            # hosting + firestore rules + indexes (+ storage rules, Storage চালু থাকলে)
```
Storage চালু না থাকলে: `firebase deploy --only hosting,firestore`।
ইনডেক্স তৈরি হতে কয়েক মিনিট লাগে; এর মধ্যে হোমপেজে "লোড করা যায়নি" দেখালে অপেক্ষা করুন।

## ৪. ডেমো ডাটা বসানো
`https://আপনার-সাইট/admin/` → লগইন → **সেটিংস → ডেমো ডাটা ইমপোর্ট**। এতে আগের ১৮টি বিভাগ, ৩০টি খবর ও সেটিংস বসে যাবে।

## ৫. GitHub + অটো ডিপ্লয়
```bash
git init && git add . && git commit -m "NB NEWS firebase"
git branch -M main
git remote add origin https://github.com/ইউজার/রেপো.git
git push -u origin main
firebase init hosting:github     # GitHub রেপো কানেক্ট করে সার্ভিস-অ্যাকাউন্ট সিক্রেট বসিয়ে দেয়
```
এরপর `main`-এ push করলেই সাইট লাইভ হবে। (রুলস/ইনডেক্স বদলালে আবার `firebase deploy --only firestore`।)

## জেনে রাখুন
- **সার্চ:** Firestore-এ LIKE সার্চ নেই, তাই সার্চ সাম্প্রতিক ২০০টি প্রকাশিত খবরের মধ্যে কাজ করে। বড় সাইটে Algolia/Typesense যোগ করা যায়।
- **ফেসবুক/টুইটার প্রিভিউ:** খবরের পেজ ব্রাউজারে JS দিয়ে তৈরি হয়, তাই শেয়ার-প্রিভিউ (ছবি/শিরোনাম) ক্রলারে দেখা নাও যেতে পারে। এটা ঠিক করতে Cloud Functions/SSR লাগবে।
- **খরচ:** প্রতি পেজভিউয়ে কিছু Firestore রিড হয় (বিভাগ/সেটিংস ৫ মিনিট ক্যাশ হয়)। ফ্রি Spark প্ল্যানে দিনে ৫০,০০০ রিড; ট্রাফিক বাড়লে Blaze লাগবে।
- **অ্যাডমিনের "সব খবর" তালিকা** সাম্প্রতিক ৩০০টি খবর লোড করে ফিল্টার করে।
- বিভাগের স্লাগ তৈরির পর বদলানো যায় না (নাম বদলানো যায়)।
- নতুন ইউজার সাইন-আপ বন্ধ রাখতে Authentication → Settings → User actions-এ sign-up নিষ্ক্রিয় করতে পারেন (রুলস এমনিতেই অন্য কাউকে লিখতে দেয় না)।
