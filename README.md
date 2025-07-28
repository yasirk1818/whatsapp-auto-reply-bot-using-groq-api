Multi-Device WhatsApp AI Bot - Developer Setup Guide (with PM2)
Project ka Khulasa (Overview)

Yeh aik Node.js par mabni (based) project hai jo aapko multiple WhatsApp accounts ke liye aik AI-powered chatbot banane ki sahoolat deta hai. Iska apna login/register system hai aur aik web-based dashboard bhi, jahan se aap apne saare devices ko control kar sakte hain. AI ke jawab dene ke liye yeh Groq API ki intehai taiz raftaar service istemal karta hai.

Technologies:
Backend: Node.js, Express.js
WhatsApp Integration: whatsapp-web.js
AI Provider: Groq API (Llama 3 Model)
Database: MongoDB
Real-time Communication: Socket.IO
Password Security: Bcrypt
Session Management: Express Session
Process Manager: PM2


Zaroori Cheezein (Prerequisites)

Project ko set up karne se pehle, aapke system mein yeh cheezein install honi chahiye:
Node.js: Version 18 ya is se naya. Aap node -v command se version check kar sakte hain.
MongoDB: Aapke computer par install hona chahiye aur background mein chal raha ho.
Code Editor: VS Code (ya koi bhi aapki pasand ka editor).
Web Browser: Google Chrome, Firefox, etc.


  Step-by-Step Installation Guide

Step 1: Project Files Haasil Karein
Sab se pehle, aapko woh 4 files ( index.js, dashboard.html, login.html, register.html ) aik naye folder mein rakhni hain. Folder ka naam aap whatsapp-bot ya apni pasand ka kuch bhi rakh sakte hain.
Step 2: Terminal Kholein
Apne code editor (jaise VS Code) mein us whatsapp-bot wale folder ko kholein aur editor ka built-in terminal open karein.
Step 3: Zaroori Packages Install Karein
Ab terminal mein neeche di gayi commands ko aik-aik kar ke chalayein

Generated bash
npm install whatsapp-web.js@latest
npm install groq-sdk
npm install mongoose
npm install express
npm install socket.io
npm install qrcode
npm install fs-extra
npm install express-session
npm install bcrypt



In commands ko chalane ke baad, aapke folder mein aik node_modules ka folder aur package-lock.json ki file ban jayegi.
  
Step 4: Groq API Key Haasil Karein
Bot ko AI ka dimagh dene ke liye, aapko Groq se aik free API key leni hogi.
Browser mein https://console.groq.com/ par jayein.
Apne Google Account se Login/Sign up karein.
Login karne ke baad, left side par "API Keys" ke menu par click karein.
"+ Create API Key" ke button par click karein.
Key ka koi naam rakhein aur "Create" par click karein.
Aapko aapki API key gsk_... nazar aayegi. Isay copy kar lein.
Step 5: Code mein API Key Daalein
Apne code editor mein index.js file kholein.
Line 21 ke aas paas "YOUR_GROQ_API_KEY_HERE" ko hata kar apni Groq se copy ki hui API key paste kar dein.
Step 6: Database Connection Check Karein
Project mongodb://127.0.0.1:27017/whatsapp_multi_user_bot par connect hone ki koshish karega. Agar aapka MongoDB aam tareeqe se install hai to yeh theek kaam karega.



  Project ko Hamesha Chalanay ke Liye (PM2 Setup)
  
PM2 aik process manager hai jo aapki application ko background mein chalaata hai aur crash hone par khud-ba-khud restart kar deta hai. Yeh production server ke liye laazmi hai.
Step 7: PM2 Install Karein
Terminal mein yeh command chalayein. Yeh PM2 ko aapke system par globally install kar degi takay aap isay kahin se bhi istemal kar sakein.
  
Generated bash
npm install pm2 -g


(-g ka matlab "global" hai)
  
Step 8: PM2 se Application Start Karein
Ab node index.js istemal karne ke bajaye, aap PM2 ki command istemal karenge. Yeh command application ko start karke background mein bhej degi aur usko aik naam (whatsapp-bot) de degi.
Generated bash
pm2 start index.js --name whatsapp-bot



  Start hotay hi, PM2 aapko aik table dikhayega jismein aapki application ka status online hoga.
  
Step 9: PM2 ko Server Ke Start-up Par Chalayein
Yeh sab se ahem qadam hai. Is se PM2 server ke har restart ke baad aapki application ko khud-ba-khud chala dega.
Pehle, yeh command chalayein:
Generated bash
pm2 startup



PM2 aapko aik aur command dega (jo sudo env PATH=... se shuru hogi). Us poori command ko copy karein aur terminal mein paste karke chala dein. Yeh command system ko batati hai ke server on hotay waqt PM2 ko bhi start karna hai.
Aakhir mein, PM2 mein chal rahi applications ki list save karein takay woh restart ke baad yaad rahay:
Generated bash
pm2 save


Ab aapka setup mukammal hai. Aap terminal band kar sakte hain, server restart kar sakte hain, aapka bot hamesha chalta rahega.
