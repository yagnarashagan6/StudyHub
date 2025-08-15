# 🚀 StudyHub

A full-stack platform to search, manage, and discover educational YouTube videos. Built with React, Express, and MongoDB.

---

## ✨ Features

- 🔎 **Smart Search:** Find YouTube educational videos by channel, language, and category.
- 🔐 **Authentication:** Secure login via email/password & Google OAuth.
- ⭐ **Favorites:** Save and organize your favorite videos, channels, and categories.
- 📱 **Responsive UI:** Seamless experience on desktop and mobile (React + Vite).
- 🛡️ **Secure Backend:** JWT authentication, environment-based secrets, and robust data management.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, React Router, React Icons
- **Backend:** Express, Mongoose, Passport, JWT
- **Database:** MongoDB
- **APIs:** YouTube Data API

---

## 🚚 Deployment

- **Frontend:** [Netlify](https://www.netlify.com/)
- **Backend:** [Render](https://render.com/)

### 🌱 Environment Variables

#### Frontend (`.env`)

```
VITE_REACT_APP_YT_API_KEY=your_youtube_api_key
VITE_API_BASE_URL=https://your-backend.onrender.com
```

#### Backend (`.env`)

```
JWT_SECRET=your_jwt_secret
MONGO_URI=your_mongodb_uri
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=https://your-frontend.netlify.app
PORT=5000
```

---

## 🧑‍💻 Local Development

### Frontend

```sh
npm install
npm run dev
```

Runs at [http://localhost:5173](http://localhost:5173)

### Backend

```sh
npm install
npm start
```

Runs at [http://localhost:5000](http://localhost:5000)

---

## 🚀 Production

- Set environment variables on Netlify and Render as above.
- Netlify uses `VITE_API_BASE_URL` to connect to the backend.

---

## 🔒 Security

- **Never commit your `.env` files** (already in `.gitignore`).
- Set all secrets in your deployment dashboards.

---

## 📄 License

MIT

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📬 Contact

Questions or feedback? Open an issue or email [yaknarashagan2@gmail.com](mailto:yaknarashagan2@gmail.com)
