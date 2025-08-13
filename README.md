# StudyHub

A full-stack educational video search and management platform.

## Features

- Search YouTube educational videos by channel, language, and category
- User authentication (email/password & Google OAuth)
- Manage favorite videos, channels, and categories
- Responsive UI (React + Vite)

## Deployment

- **Frontend:** [Netlify](https://www.netlify.com/)
- **Backend:** [Render](https://render.com/)

### Environment Variables

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

### Local Development

- **Frontend:**

  ```
  npm install
  npm run dev
  ```

  Runs at [http://localhost:5173](http://localhost:5173)

- **Backend:**
  ```
  npm install
  npm start
  ```
  Runs at [http://localhost:5000](http://localhost:5000)

### Production

- Set environment variables on Netlify and Render as above.
- Netlify will use `VITE_API_BASE_URL` to connect to the backend.

## Security

- **Never commit your `.env` files** (already in `.gitignore`).
- Set all secrets in your deployment dashboards.

---

## License

MIT
