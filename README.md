# TechnoBiz Smart ERP

TechnoBiz is a FastAPI and React ERP application with finance, inventory, approvals, calendar, reporting, migration, and AI insight features.

## Local Development

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Frontend:

```bash
cd frontend
yarn install --frozen-lockfile
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```

Required backend environment variables:

```bash
MONGO_URL=mongodb+srv://...
DB_NAME=technobiz
JWT_SECRET=change-me
JWT_ALGO=HS256
CORS_ORIGINS=*
```

Optional AI insight variables:

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
```

OpenAI-compatible setup is also supported:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your-key
OPENAI_MODEL=gpt-4o-mini
```

## Render Deployment

This repository includes `render.yaml` for a two-service Render deployment:

- `technobiz-api`: Python web service from `backend`
- `technobiz-frontend`: static React site from `frontend/build`

On Render, set `MONGO_URL`, `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`, and `REACT_APP_BACKEND_URL` to your deployed backend URL, for example:

```bash
REACT_APP_BACKEND_URL=https://technobiz-api.onrender.com
```

The frontend `index.html` template is at `frontend/public/index.html`; Render receives the generated `frontend/build/index.html` after `yarn build`.
