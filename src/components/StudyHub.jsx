import React, { useState, useEffect, useRef } from "react";
import "../styles/Studyhub.css";
import {
  FaSearch,
  FaSignOutAlt,
  FaVideo,
  FaPlus,
  FaBars,
  FaTimes,
  FaClock,
  FaTrash,
} from "react-icons/fa";
import { MdFavorite, MdPlayCircleOutline } from "react-icons/md";
import { FiGrid, FiList } from "react-icons/fi"; // Added for sidebar icons
import { BiCategory } from "react-icons/bi"; // Added for category icon
import Login from "./Login"; // Add this import at the top

const LANGUAGES = [
  { code: "ta", name: "Tamil" },
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "te", name: "Telugu" },
  { code: "ml", name: "Malayalam" },
];

const INITIAL_CATEGORIES = [
  "Coding",
  "Engineering",
  "Maths",
  "Science",
  "Education",
  "Uncategorized",
];

const INITIAL_CHANNELS = [
  {
    id: "UCrx-FlNM6BWOJvu3re6HH7w",
    name: "4G Silver Academy தமிழ்",
    category: "Engineering",
    language: "ta",
  },
  {
    id: "UCwr-evhuzGZgDFrq_1pLt_A",
    name: "Error Makes Clever",
    category: "Coding",
    language: "ta",
  },
  {
    id: "UC4SVo0Ue36XCfOyb5Lh1viQ",
    name: "Bro Code",
    category: "Coding",
    language: "en",
  },
  {
    id: "UC8GD4akofUsOzgNpaiAisdQ",
    name: "Mathematics kala",
    category: "Maths",
    language: "ta",
  },
];

const API_KEY = import.meta.env.VITE_REACT_APP_YT_API_KEY;
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

// API to fetch channel metadata (only the name)
async function fetchChannelMetadata(channelIdOrHandle) {
  try {
    let params;
    let url;
    let res;
    let data;

    // If starts with @, use forHandle
    if (channelIdOrHandle.startsWith("@")) {
      params = new URLSearchParams({
        key: API_KEY,
        forHandle: channelIdOrHandle,
        part: "snippet",
      });
      url = `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`;
      res = await fetch(url);
      if (res.status === 403)
        throw new Error(
          "Today's API limit is over. Please try again tomorrow."
        );
      data = await res.json();
      if (data.items && data.items.length > 0) {
        return {
          id: data.items[0].id,
          name: data.items[0].snippet.title,
        };
      }
    }

    // Try by channel ID
    params = new URLSearchParams({
      key: API_KEY,
      id: channelIdOrHandle,
      part: "snippet",
    });
    url = `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`;
    res = await fetch(url);
    if (res.status === 403)
      throw new Error("Today's API limit is over. Please try again tomorrow.");
    data = await res.json();
    if (data.items && data.items.length > 0) {
      return {
        id: data.items[0].id,
        name: data.items[0].snippet.title,
      };
    }

    // Try by username
    params = new URLSearchParams({
      key: API_KEY,
      forUsername: channelIdOrHandle,
      part: "snippet",
    });
    url = `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`;
    res = await fetch(url);
    if (res.status === 403)
      throw new Error("Today's API limit is over. Please try again tomorrow.");
    data = await res.json();
    if (data.items && data.items.length > 0) {
      return {
        id: data.items[0].id,
        name: data.items[0].snippet.title,
      };
    }

    throw new Error("Channel not found");
  } catch (error) {
    if (error.message.includes("Today's API limit is over")) {
      throw error;
    }
    throw new Error("Channel not found or invalid URL");
  }
}

function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function youtubeSearch(
  query,
  langCode,
  channelId,
  pageToken = null,
  maxResults = 9
) {
  const params = new URLSearchParams({
    key: API_KEY,
    q: query,
    type: "video",
    maxResults: maxResults,
    relevanceLanguage: langCode !== "all" ? langCode : undefined,
    order: "relevance",
    channelId,
    videoEmbeddable: "true",
    safeSearch: "strict",
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  const res = await fetch(url);

  if (res.status === 403) {
    throw new Error("Today's API limit is over. Please try again tomorrow.");
  }

  const data = await res.json();

  if (!data.items || data.items.length === 0)
    return { videos: [], nextPageToken: null };

  const validVideoItems = data.items.filter((item) => item.id.videoId);
  if (validVideoItems.length === 0) return { videos: [], nextPageToken: null };

  const videoIds = validVideoItems.map((item) => item.id.videoId).join(",");
  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=contentDetails,snippet,statistics`;
  const detailsRes = await fetch(detailsUrl);

  if (detailsRes.status === 403) {
    throw new Error("Today's API limit is over. Please try again tomorrow.");
  }

  const detailsData = await detailsRes.json();

  const videos = detailsData.items
    .map((item) => {
      const durationSec = parseDuration(item.contentDetails.duration);
      return {
        id: item.id,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        language: langCode,
        thumbnail: item.snippet.thumbnails.high.url,
        duration: item.contentDetails.duration.replace("PT", "").toLowerCase(),
        durationSec,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        viewCount: item.statistics
          ? parseInt(item.statistics.viewCount, 10)
          : 0,
      };
    })
    .filter((item) => item.durationSec >= 60);

  return {
    videos,
    nextPageToken: data.nextPageToken || null,
  };
}

async function fetchRecentUploads(channelId, channels) {
  const params = new URLSearchParams({
    key: API_KEY,
    channelId,
    part: "snippet",
    order: "date",
    maxResults: 2,
    type: "video",
    videoEmbeddable: "true",
  });

  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();

  if (res.status === 403) {
    throw new Error("Today's API limit is over. Please try again tomorrow.");
  }

  if (!data.items || data.items.length === 0) return [];

  const videoIds = data.items
    .map((item) => item.id.videoId)
    .filter(Boolean)
    .join(",");

  if (!videoIds) return [];

  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${API_KEY}&id=${videoIds}&part=contentDetails,snippet,statistics`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();

  if (detailsRes.status === 403) {
    throw new Error("Today's API limit is over. Please try again tomorrow.");
  }

  return detailsData.items
    .map((item) => {
      const channel = channels.find((c) => c.id === channelId);
      const language = channel ? channel.language : "en";
      const durationSec = parseDuration(item.contentDetails.duration);
      return {
        id: item.id,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        language,
        thumbnail: item.snippet.thumbnails.high.url,
        duration: item.contentDetails.duration.replace("PT", "").toLowerCase(),
        durationSec,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        viewCount: item.statistics
          ? parseInt(item.statistics.viewCount, 10)
          : 0,
      };
    })
    .filter((item) => item.durationSec >= 60);
}

// New component for the Login and Register forms
function AuthForms({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const url = isLogin ? `${API_BASE_URL}/login` : `${API_BASE_URL}/register`;
    const payload = isLogin
      ? { email, password }
      : { username, email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        if (isLogin) {
          localStorage.setItem("token", data.token);
          onLoginSuccess();
        } else {
          setSuccess(data.msg);
          setIsLogin(true); // Switch to login after successful registration
        }
      } else {
        setError(data.msg || "An error occurred");
      }
    } catch (err) {
      setError("A network error occurred. Is the backend server running?");
      console.error(err);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? "Welcome to StudyHub" : "Join StudyHub"}</h2>

        <button
          type="button"
          className="google-auth-btn"
          onClick={handleGoogleLogin}
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit" className="auth-btn">
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>
        <p className="auth-switch">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <span onClick={() => setIsLogin(false)}>Sign up</span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span onClick={() => setIsLogin(true)}>Sign in</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function VideoCard({
  video,
  onPlay,
  isFavorite,
  onAddFavorite,
  onDeleteFavorite,
}) {
  const isVideoInFavorites = isFavorite(video.id);

  const handleFavoriteClick = (e) => {
    e.preventDefault();
    if (isVideoInFavorites) {
      onDeleteFavorite(video.id);
    } else {
      onAddFavorite(video);
    }
  };

  return (
    <div className="video-card">
      <div className="video-thumbnail-wrapper" onClick={() => onPlay(video.id)}>
        <img src={video.thumbnail} alt={video.title} />
      </div>
      <div className="video-info">
        <a
          href={`https://www.youtube.com/watch?v=${video.id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <h3>{video.title}</h3>
        </a>
        <p>
          by <strong>{video.channel}</strong>
        </p>
        <p className="video-meta">
          Duration: {video.duration.replace("m", "m ")}
          {video.viewCount && <> | Views: {video.viewCount.toLocaleString()}</>}
        </p>
        <button
          className={
            isVideoInFavorites ? "fav-toggle-btn active" : "fav-toggle-btn"
          }
          onClick={handleFavoriteClick}
        >
          <MdFavorite />
          {isVideoInFavorites ? "Added" : "Add to Favorites"}
        </button>
      </div>
    </div>
  );
}

function FavoritesSection({
  favorites,
  categories,
  onPlay,
  onDeleteFavorite,
  onFilterChange,
  favCategoryFilter,
}) {
  const filteredFavorites = favCategoryFilter
    ? favorites.filter((fav) => fav.category === favCategoryFilter)
    : favorites;

  return (
    <div className="favorites-container">
      <h2>My Favorites</h2>
      {favorites.length > 0 && (
        <div className="favorites-category-toggles">
          <button
            className={favCategoryFilter === "" ? "active" : ""}
            onClick={() => onFilterChange("")}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className={favCategoryFilter === category ? "active" : ""}
              onClick={() => onFilterChange(category)}
            >
              {category}
            </button>
          ))}
        </div>
      )}
      {filteredFavorites.length > 0 ? (
        <div className="results-grid">
          {filteredFavorites.map((fav) => (
            <div className="video-card" key={fav.id}>
              <div
                className="video-thumbnail-wrapper"
                onClick={() => onPlay(fav.id)}
              >
                <img src={fav.thumbnail} alt={fav.title} />
              </div>
              <div className="video-info">
                <h3>{fav.title}</h3>
                <p>
                  by <strong>{fav.channel}</strong>
                </p>
                <p>
                  Category: <strong>{fav.category}</strong>
                </p>
                <div className="video-actions">
                  <button
                    className="fav-toggle-btn delete-fav-btn"
                    onClick={() => onDeleteFavorite(fav.id)}
                  >
                    <FaTimes /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-results">
          <h2>No favorites added yet.</h2>
          <p>
            Find videos you like and click the `Add to Favorites` button to save
            them here.
          </p>
        </div>
      )}
    </div>
  );
}

function AddChannelModal({
  isAddingChannel,
  onAddChannel,
  onClose,
  categories,
}) {
  const [newChannelUrl, setNewChannelUrl] = useState("");
  const [newChannelLanguage, setNewChannelLanguage] = useState("en");
  const [newChannelCategory, setNewChannelCategory] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddChannel = async (e) => {
    e.preventDefault();
    setError("");
    // setSuccess(""); // REMOVE
    // setIsLoading(true); // REMOVE

    // Improved extraction for channel ID or handle
    let channelIdOrHandle = newChannelUrl.trim();
    // If URL contains @, extract handle (allow . and -)
    const handleMatch = channelIdOrHandle.match(
      /youtube\.com\/@([a-zA-Z0-9_.-]+)/i
    );
    if (handleMatch) {
      channelIdOrHandle = "@" + handleMatch[1];
    } else {
      // Try to extract channel ID from other URL formats
      const idMatch = channelIdOrHandle.match(
        /(?:channel\/|user\/|c\/)?([a-zA-Z0-9\-_]{24})/
      );
      if (idMatch) {
        channelIdOrHandle = idMatch[1];
      }
    }

    try {
      const channelInfo = await fetchChannelMetadata(channelIdOrHandle);
      setChannels((prev) => [
        ...prev,
        {
          id: channelInfo.id,
          name: channelInfo.name,
          category: isCreatingNewCategory
            ? newCategoryName.trim()
            : newChannelCategory,
          language: newChannelLanguage,
        },
      ]);
      if (
        isCreatingNewCategory &&
        newCategoryName.trim() &&
        !categories.includes(newCategoryName.trim())
      ) {
        setCategories((prev) => [...prev, newCategoryName.trim()]);
      }
      setNewChannelUrl("");
      setNewChannelCategory("");
      setNewChannelLanguage("en");
      setNewCategoryName("");
      setIsCreatingNewCategory(false);
      setIsAddingChannel(false);
    } catch (err) {
      setAddChannelError(err.message);
    }
    // finally block not needed
  };

  if (!isAddingChannel) return null;

  return (
    <div className="channel-modal-overlay">
      <div className="channel-modal-content">
        <h3>Add New Channel</h3>
        <form onSubmit={handleAddChannel} className="add-channel-form">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <div className="form-group">
            <label htmlFor="channel-url">Channel ID or URL</label>
            <input
              id="channel-url"
              type="text"
              className="add-channel-input"
              value={newChannelUrl}
              onChange={(e) => setNewChannelUrl(e.target.value)}
              placeholder="e.g., UCrx-FlNM6BWOJvu3re6HH7w"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="channel-category">Category</label>
            <select
              id="channel-category"
              className="add-channel-select"
              value={newChannelCategory}
              onChange={(e) => setNewChannelCategory(e.target.value)}
              required
            >
              <option value="">-- Select a category --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="channel-language">Language</label>
            <select
              id="channel-language"
              className="add-channel-select"
              value={newChannelLanguage}
              onChange={(e) => setNewChannelLanguage(e.target.value)}
              required
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="add-channel-btn"
            disabled={isLoading || !newChannelUrl || !newChannelCategory}
          >
            {isLoading ? "Adding..." : "Add Channel"}
          </button>
          <button
            type="button"
            className="close-player-button"
            onClick={onClose}
          >
            Close
          </button>
        </form>
      </div>
    </div>
  );
}

function ManageChannelsModal({
  isManagingChannels,
  onClose,
  channels,
  categories,
  onDeleteChannels,
  onDeleteCategories,
  onAssignCategory,
}) {
  const [activeTab, setActiveTab] = useState("channels");
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryToAssign, setCategoryToAssign] = useState("");
  const [addCategoryError, setAddCategoryError] = useState("");

  useEffect(() => {
    if (isManagingChannels) {
      setSelectedChannels([]);
      setSelectedCategories([]);
      setNewCategoryName("");
      setCategoryToAssign("");
      setAddCategoryError("");
    }
  }, [isManagingChannels]);

  const handleToggleChannel = (channelId) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleToggleCategory = (categoryName) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((name) => name !== categoryName)
        : [...prev, categoryName]
    );
  };

  const handleDeleteChannels = () => {
    if (
      window.confirm("Are you sure you want to delete the selected channels?")
    ) {
      onDeleteChannels(selectedChannels);
      setSelectedChannels([]);
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      setAddCategoryError("Category name cannot be empty.");
      return;
    }
    if (categories.includes(newCategoryName.trim())) {
      setAddCategoryError("Category already exists.");
      return;
    }
    onAssignCategory(selectedChannels, newCategoryName.trim());
    setSelectedChannels([]);
    setNewCategoryName("");
    setAddCategoryError("");
    setActiveTab("channels");
  };

  const handleAssignCategory = () => {
    if (!categoryToAssign) {
      alert("Please select a category to assign.");
      return;
    }
    onAssignCategory(selectedChannels, categoryToAssign);
    setSelectedChannels([]);
    setCategoryToAssign("");
    setActiveTab("channels");
  };

  const handleDeleteCategories = () => {
    if (
      window.confirm(
        "Are you sure you want to delete the selected categories? This will also remove the category from any assigned channels."
      )
    ) {
      onDeleteCategories(selectedCategories);
      setSelectedCategories([]);
    }
  };

  if (!isManagingChannels) return null;

  return (
    <div className="channel-modal-overlay">
      <div className="channel-modal-content">
        <h3>Manage Channels & Categories</h3>
        <div className="channel-modal-tabs">
          <button
            className={activeTab === "channels" ? "active" : ""}
            onClick={() => setActiveTab("channels")}
          >
            Channels
          </button>
          <button
            className={activeTab === "assign" ? "active" : ""}
            onClick={() => setActiveTab("assign")}
          >
            Assign Category
          </button>
          <button
            className={activeTab === "categories" ? "active" : ""}
            onClick={() => setActiveTab("categories")}
          >
            Categories
          </button>
        </div>

        {activeTab === "channels" && (
          <>
            <div className="channel-list">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`channel-list-item ${
                    selectedChannels.includes(channel.id) ? "selected" : ""
                  }`}
                  onClick={() => handleToggleChannel(channel.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(channel.id)}
                    onChange={() => {}}
                  />
                  <span>
                    {channel.name} ({channel.language}) - {channel.category}
                  </span>
                </div>
              ))}
            </div>
            <div className="channel-modal-actions">
              <button className="close-btn" onClick={onClose}>
                Close
              </button>
              <button
                className="delete-btn"
                onClick={handleDeleteChannels}
                disabled={selectedChannels.length === 0}
              >
                Delete Selected
              </button>
            </div>
          </>
        )}

        {activeTab === "assign" && (
          <>
            <p>Select channels to assign a category to:</p>
            <div className="channel-list">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className={`channel-list-item ${
                    selectedChannels.includes(channel.id) ? "selected" : ""
                  }`}
                  onClick={() => handleToggleChannel(channel.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedChannels.includes(channel.id)}
                    onChange={() => {}}
                  />
                  <span>
                    {channel.name} - {channel.category}
                  </span>
                </div>
              ))}
            </div>
            <div className="add-channel-form" style={{ marginTop: "20px" }}>
              <div className="form-group">
                <label htmlFor="category-select">Select a Category</label>
                <select
                  id="category-select"
                  className="add-channel-select"
                  value={categoryToAssign}
                  onChange={(e) => setCategoryToAssign(e.target.value)}
                >
                  <option value="">-- Choose a category --</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="assign-btn"
                onClick={handleAssignCategory}
                disabled={selectedChannels.length === 0 || !categoryToAssign}
              >
                Assign Category
              </button>
            </div>
            <div className="channel-modal-actions">
              <button className="close-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}

        {activeTab === "categories" && (
          <>
            <div className="channel-list">
              {categories.map((category) => (
                <div
                  key={category}
                  className={`channel-list-item ${
                    selectedCategories.includes(category) ? "selected" : ""
                  }`}
                  onClick={() => handleToggleCategory(category)}
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category)}
                    onChange={() => {}}
                  />
                  <span>{category}</span>
                </div>
              ))}
            </div>
            <div className="add-channel-form" style={{ marginTop: "20px" }}>
              <div className="form-group">
                <label htmlFor="new-category-name">Add New Category</label>
                <input
                  id="new-category-name"
                  type="text"
                  className="add-category-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g., Web Development"
                />
              </div>
              {addCategoryError && (
                <div className="error-message">{addCategoryError}</div>
              )}
              <button
                className="add-channel-btn"
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
              >
                Add Category
              </button>
            </div>
            <div className="channel-modal-actions">
              <button className="close-btn" onClick={onClose}>
                Close
              </button>
              <button
                className="delete-btn"
                onClick={handleDeleteCategories}
                disabled={selectedCategories.length === 0}
              >
                Delete Selected
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SearchComponent({
  topic,
  setTopic,
  handleSearch,
  handleChannelSelect,
  isChannelDropdownOpen,
  setIsChannelDropdownOpen,
  selectedChannelsForSearch,
  channels,
  handleLanguageChange,
  language,
  handleSuggestionClick,
  showSuggestions,
  history,
  handleKeyDown,
  activeSuggestion,
  inputRef,
  loading,
  categories,
  selectedCategory,
  setSelectedCategory,
  handleDeleteHistory,
  handleClearAllHistory,
  setShowSuggestions,
}) {
  const [longPressTimer, setLongPressTimer] = useState(null);
  const [longPressIndex, setLongPressIndex] = useState(-1);

  const handleMouseDown = (index) => {
    const timer = setTimeout(() => {
      setLongPressIndex(index);
    }, 500); // 500ms for long press
    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setLongPressIndex(-1);
  };

  const handleHistoryItemClick = (item, index) => {
    if (longPressIndex === index) {
      // Long press detected - delete item
      handleDeleteHistory(index);
      setLongPressIndex(-1);
    } else {
      // Normal click - select history item
      handleSuggestionClick(item);
    }
  };

  return (
    <>
      <h1>Study Hub</h1>
      <div className="search-form">
        <div className="search-input-group">
          <input
            type="text"
            className="search-input"
            placeholder="Search for videos..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            ref={inputRef}
          />
          {showSuggestions && history.length > 0 && (
            <ul className="search-suggestions">
              <li className="search-suggestions-header">
                <span>
                  <FaClock style={{ marginRight: "5px" }} />
                  Recent Searches
                </span>
                <button
                  className="clear-all-btn"
                  onClick={handleClearAllHistory}
                  title="Clear all search history"
                >
                  Clear All
                </button>
              </li>
              {history.map((item, index) => (
                <li
                  key={index}
                  className={`search-suggestion-item ${
                    index === activeSuggestion ? "active" : ""
                  } ${longPressIndex === index ? "long-press-active" : ""}`}
                  onMouseDown={() => handleMouseDown(index)}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleHistoryItemClick(item, index)}
                >
                  <div className="suggestion-item-content">
                    <FaClock className="suggestion-icon" />
                    <span className="suggestion-item-text">{item}</span>
                  </div>
                  <button
                    className="suggestion-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHistory(index);
                    }}
                    title="Delete this search"
                  >
                    <FaTimes />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            className="search-icon-btn"
            onClick={handleSearch}
            disabled={loading}
          >
            <FaSearch />
          </button>
        </div>
        <div className="search-options-group">
          <div className="channel-dropdown-container">
            <button
              type="button"
              className="channel-dropdown-trigger"
              onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
            >
              Select Channels ({selectedChannelsForSearch.length})
              <span
                className={`dropdown-arrow ${
                  isChannelDropdownOpen ? "open" : ""
                }`}
              >
                ▼
              </span>
            </button>
            {isChannelDropdownOpen && (
              <div className="channel-dropdown-menu">
                <div className="channel-dropdown-header">
                  <span>Channels</span>
                </div>
                <div className="channel-dropdown-options">
                  {channels
                    .filter(
                      (channel) =>
                        selectedCategory === "all" ||
                        channel.category === selectedCategory
                    )
                    .map((channel) => (
                      <div
                        key={channel.id}
                        className="channel-dropdown-option"
                        onClick={() => handleChannelSelect(channel.id)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedChannelsForSearch.includes(
                            channel.id
                          )}
                          onChange={() => {}}
                        />
                        <span className="channel-option-name">
                          {channel.name}
                        </span>
                        <span className="channel-option-category">
                          {channel.category}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="all">All Languages</option>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Existing states from StudyHub.jsx
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState("ta");
  const [channels, setChannels] = useState(() => {
    const saved = localStorage.getItem("userChannels");
    return saved ? JSON.parse(saved) : INITIAL_CHANNELS;
  });
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("userCategories");
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem("favoriteVideos");
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedChannelsForSearch, setSelectedChannelsForSearch] = useState(
    []
  );
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);
  const [nextPageTokens, setNextPageTokens] = useState({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [playingVideoId, setPlayingVideoId] = useState(null);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem("searchHistory");
    return saved ? JSON.parse(saved) : [];
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [error, setError] = useState("");
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [isManagingChannels, setIsManagingChannels] = useState(false);
  const [favCategoryFilter, setFavCategoryFilter] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);

  // New state for sidebar visibility
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedChannelsForDeletion, setSelectedChannelsForDeletion] =
    useState([]);
  const [selectedCategoriesForDeletion, setSelectedCategoriesForDeletion] =
    useState([]);
  const [activeManagementTab, setActiveManagementTab] = useState("assign");
  const [newChannelUrl, setNewChannelUrl] = useState("");
  const [newChannelLanguage, setNewChannelLanguage] = useState("en");
  const [newChannelCategory, setNewChannelCategory] = useState("");
  const [addChannelError, setAddChannelError] = useState("");
  const [isAddingChannelLoading, setIsAddingChannelLoading] = useState(false);
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Handle window resize and mouse hover for desktop sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      }
    };

    const handleMouseMove = (e) => {
      // Only handle mouse hover on desktop
      if (window.innerWidth > 768) {
        // Open sidebar when mouse is near left edge (within 20px)
        if (e.clientX <= 20 && !isSidebarOpen) {
          setIsSidebarOpen(true);
        }
        // Close sidebar when mouse moves away (more than 300px from left edge)
        else if (e.clientX > 300 && isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isSidebarOpen]);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isSidebarOpen && window.innerWidth <= 768) {
        const sidebar = document.querySelector(".sidebar");
        if (
          sidebar &&
          !sidebar.contains(e.target) &&
          !e.target.closest(".sidebar-toggle-btn")
        ) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isSidebarOpen]);

  // Auth check and login success from StudyHubWithLoginhub.jsx
  useEffect(() => {
    const checkAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get("token");
      const authError = urlParams.get("error");

      if (authError) {
        console.error("Authentication error:", authError);
        setError("Authentication failed. Please try again.");
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        setIsCheckingAuth(false);
        return;
      }

      if (urlToken) {
        localStorage.setItem("token", urlToken);
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }

      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/verify-token`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("token");
          }
        } catch (err) {
          console.error("Token verification failed:", err);
          localStorage.removeItem("token");
        }
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, []);

  // Load initial content when user is authenticated
  useEffect(() => {
    const loadInitialContent = async () => {
      if (isAuthenticated && isInitialLoad && channels.length > 0) {
        setLoading(true);
        setError("");
        try {
          // Get recent uploads from the first few channels
          const initialChannels = channels.slice(0, 3); // Take first 3 channels
          const allVideos = await Promise.all(
            initialChannels.map(async (channel) => {
              try {
                return await fetchRecentUploads(channel.id, channels);
              } catch (err) {
                console.warn(
                  `Failed to load from channel ${channel.name}:`,
                  err
                );
                return [];
              }
            })
          );
          const combinedVideos = allVideos.flat();
          if (combinedVideos.length > 0) {
            setResults(combinedVideos);
          } else {
            setError(
              "Unable to load initial content. Please try searching for specific topics."
            );
          }
        } catch (err) {
          setError(
            err.message ||
              "Unable to load initial content. Please try searching for specific topics."
          );
        } finally {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    loadInitialContent();
  }, [isAuthenticated, channels, isInitialLoad]);

  const handleLoginSuccess = () => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await fetch(`${API_BASE_URL}/verify-token`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem("token");
          }
        } catch (err) {
          console.error("Token verification failed:", err);
          localStorage.removeItem("token");
        }
      }
    };
    checkAuth();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(null);
    setResults([]);
    // window.location.href = "/"; // Optionally redirect to home or login page
  };

  // The rest of the original StudyHub logic
  useEffect(() => {
    localStorage.setItem("userChannels", JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem("userCategories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("favoriteVideos", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem("searchHistory", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (topic && isChannelDropdownOpen) {
      setIsChannelDropdownOpen(false);
    }
  }, [topic, isChannelDropdownOpen]);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    setPlayingVideoId(null);
    setResults([]);
    setNextPageTokens({});
    setHasMoreVideos(true);
    setShowSuggestions(false);
    setShowFavorites(false);
    setHasSearched(true);

    if (topic.trim() !== "" && !history.includes(topic)) {
      setHistory((prev) => [topic, ...prev].slice(0, 5));
    }

    try {
      // Filter channels by selected category
      const channelsToSearch =
        selectedCategory === "all"
          ? selectedChannelsForSearch
          : selectedChannelsForSearch.filter((channelId) => {
              const channel = channels.find((ch) => ch.id === channelId);
              return channel && channel.category === selectedCategory;
            });

      if (channelsToSearch.length === 0) {
        setError("Please select at least one channel to search from.");
        return;
      }

      const allVideos = await Promise.all(
        channelsToSearch.map(async (channelId) => {
          const res = await youtubeSearch(topic, language, channelId);
          setNextPageTokens((prev) => ({
            ...prev,
            [channelId]: res.nextPageToken,
          }));
          return res.videos;
        })
      );
      const combinedVideos = allVideos.flat();
      setResults(combinedVideos);

      if (combinedVideos.length === 0) {
        setError(
          "No videos found for your search. Try different keywords or select more channels."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    setError("");

    try {
      // Filter channels by selected category
      const channelsToSearch =
        selectedCategory === "all"
          ? selectedChannelsForSearch
          : selectedChannelsForSearch.filter((channelId) => {
              const channel = channels.find((ch) => ch.id === channelId);
              return channel && channel.category === selectedCategory;
            });

      const allVideos = await Promise.all(
        channelsToSearch.map(async (channelId) => {
          if (nextPageTokens[channelId]) {
            const res = await youtubeSearch(
              topic,
              language,
              channelId,
              nextPageTokens[channelId]
            );
            setNextPageTokens((prev) => ({
              ...prev,
              [channelId]: res.nextPageToken,
            }));
            return res.videos;
          }
          return [];
        })
      );

      const combinedVideos = allVideos.flat();
      setResults((prev) => [...prev, ...combinedVideos]);
      if (Object.values(nextPageTokens).every((token) => !token)) {
        setHasMoreVideos(false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleChannelSelect = (channelId) => {
    setSelectedChannelsForSearch((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleLanguageChange = (code) => {
    setLanguage(code);
    setSelectedChannelsForSearch([]);
  };

  const handleFavToggle = () => {
    setShowFavorites(!showFavorites);
    setFavCategoryFilter("");
    setPlayingVideoId(null);
    setTopic(""); // Clear search bar
    setError(""); // Clear any errors
    setHasSearched(false); // Reset search state
  };

  const isVideoFavorite = (videoId) => {
    return favorites[videoId] !== undefined;
  };

  const handleAddFavorite = (video) => {
    const channel = channels.find((c) => c.id === video.channelId);
    setFavorites((prev) => ({
      ...prev,
      [video.id]: {
        ...video,
        category: channel ? channel.category : "Uncategorized",
      },
    }));
  };

  const handleDeleteFavorite = (videoId) => {
    setFavorites((prev) => {
      const newFavs = { ...prev };
      delete newFavs[videoId];
      return newFavs;
    });
  };

  const handlePlayVideo = (videoId) => {
    setPlayingVideoId(videoId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClosePlayer = () => {
    setPlayingVideoId(null);
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && history.length > 0) {
      if (e.key === "ArrowDown") {
        setActiveSuggestion((prev) =>
          prev < history.length - 1 ? prev + 1 : prev
        );
        e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : 0));
        e.preventDefault();
      } else if (e.key === "Enter" && activeSuggestion >= 0) {
        setTopic(history[activeSuggestion]);
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        handleSearch();
      }
    }
    if (e.key === "Enter" && !showSuggestions) {
      handleSearch();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setTopic(suggestion);
    setShowSuggestions(false);
    handleSearch();
  };

  const handleDeleteHistory = (index) => {
    setHistory((prev) => prev.filter((_, i) => i !== index));
    localStorage.setItem(
      "searchHistory",
      JSON.stringify(history.filter((_, i) => i !== index))
    );
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem("searchHistory");
    setShowSuggestions(false);
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    setError("");
    // setSuccess(""); // REMOVE
    // setIsLoading(true); // REMOVE

    // Improved extraction for channel ID or handle
    let channelIdOrHandle = newChannelUrl.trim();
    // If URL contains @, extract handle (allow . and -)
    const handleMatch = channelIdOrHandle.match(
      /youtube\.com\/@([a-zA-Z0-9_.-]+)/i
    );
    if (handleMatch) {
      channelIdOrHandle = "@" + handleMatch[1];
    } else {
      // Try to extract channel ID from other URL formats
      const idMatch = channelIdOrHandle.match(
        /(?:channel\/|user\/|c\/)?([a-zA-Z0-9\-_]{24})/
      );
      if (idMatch) {
        channelIdOrHandle = idMatch[1];
      }
    }

    try {
      const channelInfo = await fetchChannelMetadata(channelIdOrHandle);
      setChannels((prev) => [
        ...prev,
        {
          id: channelInfo.id,
          name: channelInfo.name,
          category: isCreatingNewCategory
            ? newCategoryName.trim()
            : newChannelCategory,
          language: newChannelLanguage,
        },
      ]);
      if (
        isCreatingNewCategory &&
        newCategoryName.trim() &&
        !categories.includes(newCategoryName.trim())
      ) {
        setCategories((prev) => [...prev, newCategoryName.trim()]);
      }
      setNewChannelUrl("");
      setNewChannelCategory("");
      setNewChannelLanguage("en");
      setNewCategoryName("");
      setIsCreatingNewCategory(false);
      setIsAddingChannel(false);
    } catch (err) {
      setAddChannelError(err.message);
    }
    // finally block not needed
  };

  const handleDeleteChannels = () => {
    if (selectedChannelsForDeletion.length === 0) return;

    setChannels((prev) =>
      prev.filter((c) => !selectedChannelsForDeletion.includes(c.id))
    );
    setSelectedChannelsForDeletion([]);
  };

  const handleDeleteCategories = () => {
    if (selectedCategoriesForDeletion.length === 0) return;

    setCategories((prev) =>
      prev.filter((c) => !selectedCategoriesForDeletion.includes(c))
    );
    setChannels((prev) =>
      prev.map((channel) => ({
        ...channel,
        category: selectedCategoriesForDeletion.includes(channel.category)
          ? "Uncategorized"
          : channel.category,
      }))
    );
    setSelectedCategoriesForDeletion([]);
  };

  // Reset selected items when switching management tabs
  useEffect(() => {
    setSelectedChannelsForDeletion([]);
    setSelectedCategoriesForDeletion([]);
  }, [activeManagementTab]);

  // Function to get user profile display
  const getUserProfileDisplay = () => {
    if (!user) return null;

    // If user has profile picture (Google login)
    if (user.picture) {
      return <img src={user.picture} alt="Profile" className="profile-image" />;
    }

    // If user has name, get initials
    if (user.name) {
      const names = user.name.trim().split(" ");
      const initials =
        names.length > 1
          ? names[0].charAt(0).toUpperCase() +
            names[names.length - 1].charAt(0).toUpperCase()
          : names[0].charAt(0).toUpperCase();
      return <div className="profile-initials">{initials}</div>;
    }

    // If user has username, get initials
    if (user.username) {
      const names = user.username.trim().split(" ");
      const initials =
        names.length > 1
          ? names[0].charAt(0).toUpperCase() +
            names[names.length - 1].charAt(0).toUpperCase()
          : names[0].charAt(0).toUpperCase();
      return <div className="profile-initials">{initials}</div>;
    }

    // If user has email, use first letter
    if (user.email) {
      return (
        <div className="profile-initials">
          {user.email.charAt(0).toUpperCase()}
        </div>
      );
    }

    return <div className="profile-initials">U</div>;
  };

  const handleDeleteChannelsOld = (channelIdsToDelete) => {
    setChannels((prev) =>
      prev.filter((c) => !channelIdsToDelete.includes(c.id))
    );
  };

  const handleDeleteCategoriesOld = (categoriesToDelete) => {
    setCategories((prev) =>
      prev.filter((c) => !categoriesToDelete.includes(c))
    );
    setChannels((prev) =>
      prev.map((channel) => ({
        ...channel,
        category: categoriesToDelete.includes(channel.category)
          ? "Uncategorized"
          : channel.category,
      }))
    );
  };

  const handleAssignCategory = (channelIds, category) => {
    setChannels((prev) =>
      prev.map((channel) =>
        channelIds.includes(channel.id) ? { ...channel, category } : channel
      )
    );
  };

  if (isCheckingAuth) {
    return (
      <div className="auth-container">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const mainContent = (
    <>
      <SearchComponent
        topic={topic}
        setTopic={setTopic}
        handleSearch={handleSearch}
        handleChannelSelect={handleChannelSelect}
        isChannelDropdownOpen={isChannelDropdownOpen}
        setIsChannelDropdownOpen={setIsChannelDropdownOpen}
        selectedChannelsForSearch={selectedChannelsForSearch}
        channels={channels}
        handleLanguageChange={handleLanguageChange}
        language={language}
        handleSuggestionClick={handleSuggestionClick}
        showSuggestions={showSuggestions}
        history={history}
        handleKeyDown={handleKeyDown}
        activeSuggestion={activeSuggestion}
        inputRef={inputRef}
        loading={loading}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        handleDeleteHistory={handleDeleteHistory}
        handleClearAllHistory={handleClearAllHistory}
        setShowSuggestions={setShowSuggestions}
      />

      {playingVideoId && (
        <div className="video-player-container">
          <div className="video-player">
            <iframe
              src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
          <button onClick={handleClosePlayer} className="close-player-button">
            Close Video
          </button>
        </div>
      )}

      {showFavorites ? (
        <FavoritesSection
          favorites={Object.values(favorites)}
          categories={categories}
          onPlay={handlePlayVideo}
          onDeleteFavorite={handleDeleteFavorite}
          onFilterChange={setFavCategoryFilter}
          favCategoryFilter={favCategoryFilter}
        />
      ) : (
        <>
          {loading ? (
            <h2>Loading...</h2>
          ) : error ? (
            <div className="error-message-container">
              <div className="error-message">{error}</div>
              {error.includes("API limit") && (
                <p className="error-suggestion">
                  The YouTube API quota has been exceeded. Please try again
                  tomorrow.
                </p>
              )}
              {!hasSearched && !error.includes("API limit") && (
                <p className="error-suggestion">
                  Try searching for specific topics using the search bar above.
                </p>
              )}
            </div>
          ) : results.length > 0 ? (
            <div className="results-grid">
              {results.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onPlay={handlePlayVideo}
                  isFavorite={isVideoFavorite}
                  onAddFavorite={handleAddFavorite}
                  onDeleteFavorite={handleDeleteFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              {hasSearched ? (
                <>
                  <h2>No videos found for your search.</h2>
                  <p>
                    Try different keywords, select more channels, or check your
                    spelling.
                  </p>
                </>
              ) : (
                <>
                  <h2>Welcome to StudyHub!</h2>
                  <p>
                    Search for educational videos from your favorite channels
                    using the search bar above.
                  </p>
                  <p>Select channels and enter keywords to get started.</p>
                </>
              )}
            </div>
          )}
          {/* {hasMoreVideos &&
            !loading &&
            !loadingMore &&
            !showFavorites &&
            results.length > 0 && (
              <div className="load-more-container">
                <button className="load-more-btn" onClick={handleLoadMore}>
                  Load More
                </button>
              </div>
            )}
          {!hasMoreVideos && !loading && !showFavorites && (
            <div className="no-more-results">
              <p>You have reached the end of the search results.</p>
            </div>
          )} */}
        </>
      )}
    </>
  );

  return (
    <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
      {/* Main Hamburger Button */}
      <button
        className={`main-hamburger-btn ${isSidebarOpen ? "active" : ""}`}
        onClick={toggleSidebar}
        title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isSidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? "open" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar for desktop, overlay for mobile */}
      <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        {/* Mobile Close Button */}
        <button
          className="sidebar-close-btn"
          onClick={() => setIsSidebarOpen(false)}
          title="Close sidebar"
        >
          <FaTimes />
        </button>

        {/* User Profile Section */}
        <div className="sidebar-profile">
          <div className="profile-avatar">{getUserProfileDisplay()}</div>
          <div className="profile-info">
            <div className="profile-name">
              {user?.name ||
                user?.username ||
                user?.email?.split("@")[0] ||
                "User"}
            </div>
            <div className="profile-email">{user?.email}</div>
          </div>
        </div>

        <div className="sidebar-nav">
          <ul>
            <li>
              <button
                className={`sidebar-nav-btn ${
                  !showFavorites && !isAddingChannel && !isManagingChannels
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  setShowFavorites(false);
                  setIsAddingChannel(false);
                  setIsManagingChannels(false);
                  setError("");
                  setHasSearched(false);
                  if (window.innerWidth <= 768) setIsSidebarOpen(false);
                }}
              >
                <FaSearch /> Main
              </button>
            </li>
            <li>
              <button
                className={`sidebar-nav-btn ${
                  showFavorites && !isAddingChannel && !isManagingChannels
                    ? "active"
                    : ""
                }`}
                onClick={() => {
                  handleFavToggle();
                  setIsAddingChannel(false);
                  setIsManagingChannels(false);
                  if (window.innerWidth <= 768) setIsSidebarOpen(false);
                }}
              >
                <MdFavorite /> My Favorites
              </button>
            </li>
            <li>
              <button
                className={`sidebar-nav-btn ${isAddingChannel ? "active" : ""}`}
                onClick={() => {
                  setIsAddingChannel(true);
                  setIsManagingChannels(false);
                  setShowFavorites(false);
                  if (window.innerWidth <= 768) setIsSidebarOpen(false);
                }}
              >
                <FaPlus /> Add Channel
              </button>
            </li>
            <li>
              <button
                className={`sidebar-nav-btn ${
                  isManagingChannels ? "active" : ""
                }`}
                onClick={() => {
                  setIsManagingChannels(true);
                  setIsAddingChannel(false);
                  setShowFavorites(false);
                  if (window.innerWidth <= 768) setIsSidebarOpen(false);
                }}
              >
                <FiGrid /> Manage Channels
              </button>
            </li>
            <li>
              <button className="sidebar-nav-btn" onClick={handleLogout}>
                <FaSignOutAlt /> Log Out
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="main-layout">
        {/* Mobile Header */}
        <div className="main-header">
          <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
            <FaBars />
          </button>
          <a href="/" className="header-logo">
            StudyHub
          </a>
          <button onClick={handleLogout} className="header-logout-btn">
            <FaSignOutAlt />
          </button>
        </div>
        <div className="main-content">
          {mainContent}

          {/* Add Channel Modal */}
          {isAddingChannel && (
            <div className="channel-modal-overlay">
              <div className="channel-modal-content">
                <h3>Add New Channel</h3>
                <form onSubmit={handleAddChannel} className="add-channel-form">
                  {addChannelError && (
                    <div className="error-message">{addChannelError}</div>
                  )}
                  <div className="form-group">
                    <label htmlFor="channel-url">Channel ID or URL</label>
                    <input
                      id="channel-url"
                      type="text"
                      className="add-channel-input"
                      value={newChannelUrl}
                      onChange={(e) => setNewChannelUrl(e.target.value)}
                      placeholder="e.g., UCrx-FlNM6BWOJvu3re6HH7w"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="channel-category">Category</label>
                    <div className="category-option-container">
                      <div className="category-selection-row">
                        <div className="category-radio-options">
                          <label
                            className={`category-radio-option ${
                              !isCreatingNewCategory ? "active" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="categoryOption"
                              checked={!isCreatingNewCategory}
                              onChange={() => {
                                setIsCreatingNewCategory(false);
                                setNewCategoryName("");
                              }}
                            />
                            Select existing
                          </label>
                          <label
                            className={`category-radio-option ${
                              isCreatingNewCategory ? "active" : ""
                            }`}
                          >
                            <input
                              type="radio"
                              name="categoryOption"
                              checked={isCreatingNewCategory}
                              onChange={() => {
                                setIsCreatingNewCategory(true);
                                setNewChannelCategory("");
                              }}
                            />
                            Create new
                          </label>
                        </div>
                        <div className="category-input-container">
                          {!isCreatingNewCategory ? (
                            <select
                              id="channel-category"
                              className="add-channel-select"
                              value={newChannelCategory}
                              onChange={(e) =>
                                setNewChannelCategory(e.target.value)
                              }
                              required={!isCreatingNewCategory}
                            >
                              <option value="">-- Select a category --</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              className="add-channel-input"
                              value={newCategoryName}
                              onChange={(e) =>
                                setNewCategoryName(e.target.value)
                              }
                              placeholder="Enter new category name (e.g., Web Development)"
                              required={isCreatingNewCategory}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="channel-language">Language</label>
                    <select
                      id="channel-language"
                      className="add-channel-select"
                      value={newChannelLanguage}
                      onChange={(e) => setNewChannelLanguage(e.target.value)}
                      required
                    >
                      {LANGUAGES.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="channel-modal-actions">
                    <button
                      type="submit"
                      className="add-channel-btn"
                      disabled={
                        isAddingChannelLoading ||
                        !newChannelUrl ||
                        (!isCreatingNewCategory && !newChannelCategory) ||
                        (isCreatingNewCategory && !newCategoryName.trim())
                      }
                    >
                      {isAddingChannelLoading ? "Adding..." : "Add Channel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingChannel(false)}
                      className="close-btn"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Manage Channels Modal */}
          {isManagingChannels && (
            <div className="channel-modal-overlay">
              <div className="channel-modal-content">
                <h3>Manage Channels</h3>

                {/* Toggle Navigation */}
                <div className="management-toggle-container">
                  <button
                    className={`management-toggle-btn ${
                      activeManagementTab === "assign" ? "active" : ""
                    }`}
                    onClick={() => setActiveManagementTab("assign")}
                  >
                    Assign Categories
                  </button>
                  <button
                    className={`management-toggle-btn ${
                      activeManagementTab === "deleteChannels" ? "active" : ""
                    }`}
                    onClick={() => setActiveManagementTab("deleteChannels")}
                  >
                    Delete Channels
                  </button>
                  <button
                    className={`management-toggle-btn ${
                      activeManagementTab === "deleteCategories" ? "active" : ""
                    }`}
                    onClick={() => setActiveManagementTab("deleteCategories")}
                  >
                    Delete Categories
                  </button>
                </div>

                {/* Toggle Content */}
                <div className="management-content-container">
                  {activeManagementTab === "assign" && (
                    <div className="channel-management-section">
                      <h4>Assign Categories to Channels</h4>
                      {channels.map((channel) => (
                        <div key={channel.id} className="channel-category-item">
                          <span className="channel-name-display">
                            {channel.name}
                          </span>
                          <select
                            value={channel.category}
                            onChange={(e) => {
                              setChannels((prev) =>
                                prev.map((ch) =>
                                  ch.id === channel.id
                                    ? { ...ch, category: e.target.value }
                                    : ch
                                )
                              );
                            }}
                            className="channel-category-select"
                          >
                            {categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeManagementTab === "deleteChannels" && (
                    <div className="channel-management-section">
                      <h4>Select Channels to Delete</h4>
                      {channels.map((channel) => (
                        <div
                          key={channel.id}
                          className={`channel-list-item ${
                            selectedChannelsForDeletion.includes(channel.id)
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedChannelsForDeletion((prev) =>
                              prev.includes(channel.id)
                                ? prev.filter((id) => id !== channel.id)
                                : [...prev, channel.id]
                            );
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedChannelsForDeletion.includes(
                              channel.id
                            )}
                            onChange={() => {}}
                          />
                          <span className="channel-name">{channel.name}</span>
                          <span className="channel-category-badge">
                            ({channel.category})
                          </span>
                        </div>
                      ))}
                      <div className="section-actions">
                        <button
                          onClick={handleDeleteChannels}
                          disabled={selectedChannelsForDeletion.length === 0}
                          className="delete-channel-btn"
                        >
                          Delete Selected Channels (
                          {selectedChannelsForDeletion.length})
                        </button>
                      </div>
                    </div>
                  )}

                  {activeManagementTab === "deleteCategories" && (
                    <div className="channel-management-section">
                      <h4>Select Categories to Delete</h4>
                      {categories
                        .filter(
                          (category) => !INITIAL_CATEGORIES.includes(category)
                        )
                        .map((category) => (
                          <div
                            key={category}
                            className={`channel-list-item ${
                              selectedCategoriesForDeletion.includes(category)
                                ? "selected"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedCategoriesForDeletion((prev) =>
                                prev.includes(category)
                                  ? prev.filter((cat) => cat !== category)
                                  : [...prev, category]
                              );
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategoriesForDeletion.includes(
                                category
                              )}
                              onChange={() => {}}
                            />
                            <span className="channel-name">{category}</span>
                          </div>
                        ))}
                      <div className="section-actions">
                        <button
                          onClick={handleDeleteCategories}
                          disabled={selectedCategoriesForDeletion.length === 0}
                          className="delete-channel-btn"
                        >
                          Delete Selected Categories (
                          {selectedCategoriesForDeletion.length})
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="channel-modal-actions">
                  <button
                    onClick={() => setIsManagingChannels(false)}
                    className="close-btn"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
