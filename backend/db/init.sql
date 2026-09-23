-- ==================== РОЛИ И ГРУППЫ ====================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== ПОЛЬЗОВАТЕЛИ ====================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id),
    group_id INT REFERENCES groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- ==================== ПРОВАЙДЕРЫ ====================

CREATE TABLE IF NOT EXISTS llm_providers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    base_url VARCHAR(255) NOT NULL,
    api_type VARCHAR(50) NOT NULL,
    api_key_encrypted TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    priority INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS llm_models (
    id SERIAL PRIMARY KEY,
    provider_id VARCHAR(50) NOT NULL REFERENCES llm_providers(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200),
    context_size INT,
    max_tokens INT,
    is_allowed BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider_id, name)
);

-- ==================== НАСТРОЙКИ ====================

CREATE TABLE IF NOT EXISTS llm_settings (
    id SERIAL PRIMARY KEY,
    temperature DECIMAL(3, 2) DEFAULT 0.5,
    top_p DECIMAL(3, 2) DEFAULT 0.9,
    repeat_penalty DECIMAL(4, 2) DEFAULT 1.1,
    max_tokens INT DEFAULT 8000,
    num_ctx INT DEFAULT 8192,
    system_prompt_template TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS context_settings (
    id SERIAL PRIMARY KEY,
    use_tickets BOOLEAN DEFAULT TRUE,
    use_documentation BOOLEAN DEFAULT TRUE,
    tickets_limit INT DEFAULT 5,
    docs_limit INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==================== ПРОГРАММЫ ====================

CREATE TABLE IF NOT EXISTS programs (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    qdrant_collection VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_keywords (
    id SERIAL PRIMARY KEY,
    program_id VARCHAR(50) NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    keyword VARCHAR(200) NOT NULL,
    weight INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(program_id, keyword)
);

-- ==================== ЧАТ ====================

CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    provider_id VARCHAR(50) REFERENCES llm_providers(id),
    model_id INT REFERENCES llm_models(id),
    selected_program VARCHAR(50) REFERENCES programs(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    program_id VARCHAR(50) REFERENCES programs(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_sources (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    source_type VARCHAR(20) NOT NULL,
    source_title VARCHAR(500),
    source_url TEXT,
    qdrant_collection VARCHAR(100),
    qdrant_score DECIMAL(5, 4),
    source_index INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_usage (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    cost DECIMAL(10, 6) DEFAULT 0,
    response_time_ms INT,
    likes_count INT DEFAULT 0,
    dislikes_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== ОБРАТНАЯ СВЯЗЬ ====================

CREATE TABLE IF NOT EXISTS message_feedback (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating VARCHAR(10) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- ==================== ЛОГИ ====================

CREATE TABLE IF NOT EXISTS request_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    provider_id VARCHAR(50) REFERENCES llm_providers(id),
    model_name VARCHAR(200),
    program_id VARCHAR(50) REFERENCES programs(id),
    prompt_tokens INT,
    completion_tokens INT,
    total_tokens INT,
    cost DECIMAL(10, 6),
    response_time_ms INT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==================== ИНДЕКСЫ ====================

CREATE INDEX IF NOT EXISTS idx_users_group_id ON users(group_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_models_provider_id ON llm_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_program_keywords_program_id ON program_keywords(program_id);
CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON message_feedback(message_id);

-- ==================== НАЧАЛЬНЫЕ ДАННЫЕ ====================

-- Роли
INSERT INTO roles (name, description) VALUES
    ('admin', 'Администратор системы'),
    ('manager', 'Менеджер'),
    ('user', 'Обычный пользователь'),
    ('viewer', 'Только просмотр')
ON CONFLICT (name) DO NOTHING;

-- Группы
INSERT INTO groups (name, description) VALUES
    ('Отдел продаж', 'Менеджеры по продажам'),
    ('Техподдержка', 'Специалисты технической поддержки'),
    ('Разработка', 'Разработчики и тестировщики'),
    ('Руководство', 'Руководящий состав')
ON CONFLICT (name) DO NOTHING;

-- Программы
INSERT INTO programs (id, name, description, qdrant_collection) VALUES
    ('intellect', 'Parts.Intellect', 'Управление магазином автозапчастей', 'PartsIntellect'),
    ('resource', 'Parts.Resource', 'Подбор запчастей', 'PartsResource')
ON CONFLICT (id) DO NOTHING;

-- Провайдеры
INSERT INTO llm_providers (id, name, base_url, api_type, is_enabled, priority) VALUES
    ('ollama', 'Ollama (локальный)', 'http://192.168.128.123:6790', 'ollama', FALSE, 1),
    ('llamacpp', 'llama.cpp (Gemma)', 'http://192.168.0.254:8080/v1', 'openai', TRUE, 2),
    ('routerai', 'RouterAI (облачный)', 'https://routerai.ru/api/v1', 'openai', FALSE, 3)
ON CONFLICT (id) DO NOTHING;

-- Настройки LLM
INSERT INTO llm_settings (temperature, top_p, repeat_penalty, max_tokens, num_ctx) VALUES
    (0.5, 0.9, 1.1, 8000, 8192);

-- Настройки контекста
INSERT INTO context_settings (use_tickets, use_documentation) VALUES
    (TRUE, TRUE);