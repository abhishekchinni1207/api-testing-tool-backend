#  API Testing Tool — Backend

Backend service for the API Testing Tool built with **Node.js, Express, Supabase, and Axios**.  
This service handles authentication, request proxying, request history, collections, and environments.

---

##  Live API
```
https://api-testing-tool-backend-fyzg.onrender.com
```

Health Check:
```
GET /health
```

---

##  Tech Stack

| Technology | Usage |
|-------------|-------|
| Node.js | Server runtime |
| Express | Backend framework |
| Supabase | Authentication & database |
| Axios | HTTP client |
| Render | Deployment |

---

##  Authentication

All secured endpoints require:
```
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

---

## 📡 API Routes

###  Health Check
```
GET /health
```

---

###  Request Proxy
```
POST /proxy
```

#### Body Example:
```json
{
  "url": "https://api.example.com",
  "method": "GET",
  "headers": {},
  "params": {},
  "body": {}
}
```

---

###  History

| Route | Method |
|------|--------|
| /history | GET |
| /history/:id | DELETE |

---

###  Collections

| Route | Method |
|-------|--------|
| /collections | POST |
| /collections | GET |
| /collections/:id | DELETE |

---

###  Collection Items

| Route | Method |
|--------|-------|
| /collections/:id/items | POST |
| /collections/:id/items | GET |
| /collections/items/:id | DELETE |

---

###  Environments

| Route | Method |
|------|--------|
| /env | POST |
| /env | GET |

---

##  Environment Setup

Create `.env` file in root:

```
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_key
PORT=5000
```

---

##  Run Locally

```bash
npm install
npm run dev
```

App runs at:
```
http://localhost:5000
```

---

##  Deployment on Render

### Start Command:
```
node src/index.js
```

### Add these in Render → Environment Variables:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

---

##  Security

- Auth protected endpoints  
- User-specific queries  
- Safe URL validation  
- CORS whitelisting  
- Request timeouts  

---

## Future Capabilities

- API collections export
- Team workspaces
- API mocking
- Request tests
- OAuth integrations

---

##  Maintained By
API Testing Tool Team
